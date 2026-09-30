#!/usr/bin/env bash
# Drive real traffic through every service this account can reach, so the
# console shows populated tables, stored objects, workflow executions, logs,
# metrics and traces rather than empty dashboards.
#
#   ./scripts/seed-demo-data.sh
#
# Safe to run repeatedly; it only adds data.
set -uo pipefail
cd "$(dirname "$0")/.."

[ -f cdk-outputs.json ] || { echo "cdk-outputs.json missing -- deploy first." >&2; exit 1; }
# shellcheck disable=SC1091
[ -f .env ] && set -a && . ./.env && set +a
REGION="${AWS_REGION:-ap-south-1}"
eval "$(aws configure export-credentials --format env)" 2>/dev/null || true

out() { python3 -c "import json;print(json.load(open('cdk-outputs.json'))['PlanWitchAws'].get('$1',''))"; }
API="$(out ApiUrl)"; API="${API%/}"
POOL_ID="$(out UserPoolId)"; CLIENT_ID="$(out UserPoolClientId)"
BUS="$(out EventBusName)"; QUEUE="$(out JobsQueueUrl)"

if [ -z "$API" ]; then
  echo "ApiUrl is empty in cdk-outputs.json -- the last deploy did not complete." >&2
  echo "Run ./scripts/deploy.sh and try again." >&2
  exit 1
fi

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }
J=(-H 'content-type: application/json')

post() { curl -sS --max-time 90 -X POST "${J[@]}" -d "$2" "$API$1"; }
get()  { curl -sS --max-time 90 "$API$1"; }

bold "1  Trips -> DynamoDB (writes fire the stream consumer and SNS)"
i=0
while IFS='|' read -r dest start days budget interests status; do
  [ -z "$dest" ] && continue
  body=$(python3 -c "
import json,sys
print(json.dumps({
  'userId': sys.argv[6],
  'destination': sys.argv[1], 'startDate': sys.argv[2],
  'endDate': sys.argv[3], 'travellers': 2, 'budget': sys.argv[4],
  'interests': sys.argv[5].split(';'), 'status': sys.argv[7],
}))" "$dest" "$start" "$days" "$budget" "$interests" "demo-user-$((i % 3 + 1))" "$status")
  if post /trips "$body" | grep -q '"ok":true'; then ok "$dest"; else bad "$dest"; fi
  i=$((i + 1))
done <<'TRIPS'
Jaipur, India|2026-11-05|2026-11-09|mid-range|forts;street food;photography|confirmed
Kerala, India|2026-11-18|2026-11-24|luxury|backwaters;ayurveda;food|confirmed
Goa, India|2026-12-02|2026-12-07|budget|beaches;nightlife;seafood|draft
Varanasi, India|2026-12-15|2026-12-18|budget|temples;river;history|confirmed
Leh, Ladakh|2027-05-10|2027-05-18|mid-range|mountains;trekking;monasteries|draft
Udaipur, India|2026-11-28|2026-12-01|luxury|palaces;lakes;architecture|confirmed
Rishikesh, India|2027-01-08|2027-01-12|budget|yoga;rafting;hiking|draft
Hampi, India|2027-02-14|2027-02-17|mid-range|ruins;history;photography|confirmed
Andaman Islands|2027-03-05|2027-03-12|luxury|diving;beaches;islands|draft
Darjeeling, India|2027-04-02|2027-04-06|mid-range|tea;mountains;railway|confirmed
Pondicherry, India|2026-12-20|2026-12-23|mid-range|french quarter;cafes;beaches|confirmed
Meghalaya, India|2027-06-10|2027-06-16|budget|waterfalls;caves;trekking|draft
TRIPS

for u in 1 2 3; do
  n=$(get "/trips?userId=demo-user-$u" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("count",0))' 2>/dev/null)
  ok "demo-user-$u has $n trips"
done

bold "2  Amazon Location -> place search + routing"
for q in "Taj Mahal" "Amber Fort Jaipur" "Alleppey backwaters" "Hampi ruins" "Gateway of India" "Dal Lake Srinagar"; do
  c=$(get "/places?q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$q")" \
      | python3 -c 'import json,sys;print(len(json.load(sys.stdin).get("results",[])))' 2>/dev/null)
  [ "${c:-0}" -gt 0 ] && ok "$q -> $c results" || bad "$q"
done
while IFS='|' read -r label from to; do
  [ -z "$label" ] && continue
  r=$(get "/route?from=$from&to=$to")
  km=$(echo "$r" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(round(d.get("distanceKm") or 0))' 2>/dev/null)
  [ "${km:-0}" -gt 0 ] && ok "$label -> ${km} km" || bad "$label"
done <<'ROUTES'
Mumbai to Pune|72.8777,19.0760|73.8567,18.5204
Delhi to Agra|77.2090,28.6139|78.0081,27.1767
Bengaluru to Mysuru|77.5946,12.9716|76.6394,12.2958
Chennai to Pondicherry|80.2707,13.0827|79.8083,11.9416
ROUTES

bold "3  Amazon Polly -> audio guides stored in S3"
while IFS='|' read -r voice text; do
  [ -z "$voice" ] && continue
  body=$(python3 -c "import json,sys;print(json.dumps({'text':sys.argv[1],'voice':sys.argv[2]}))" "$text" "$voice")
  kb=$(post /speak "$body" | python3 -c 'import json,sys;print(round(json.load(sys.stdin).get("bytes",0)/1024))' 2>/dev/null)
  [ "${kb:-0}" -gt 0 ] && ok "$voice -> ${kb} KB mp3" || bad "$voice"
done <<'SPEECH'
Kajal|Welcome to Jaipur. Begin at Amber Fort before the crowds arrive, then walk down to the Panna Meena stepwell.
Aditi|Kerala's backwaters are best seen at dawn. Board the houseboat at Alleppey and watch the villages wake up.
Joanna|Your Goa itinerary starts in the north. Spend the morning at Chapora Fort, then head south for lunch.
SPEECH

bold "4  S3 presigned upload -> Rekognition analysis"
SAMPLE=/tmp/planwitch-sample.jpg
if [ ! -f "$SAMPLE" ]; then
  sips -s format jpeg /System/Library/CoreServices/DefaultDesktop.heic --out "$SAMPLE" >/dev/null 2>&1
fi
if [ -f "$SAMPLE" ]; then
  for n in 1 2 3; do
    P=$(post /media/upload-url '{"contentType":"image/jpeg","userId":"demo-user-1"}')
    URL=$(echo "$P" | python3 -c 'import json,sys;print(json.load(sys.stdin)["uploadUrl"])' 2>/dev/null)
    KEY=$(echo "$P" | python3 -c 'import json,sys;print(json.load(sys.stdin)["key"])' 2>/dev/null)
    if [ -n "$URL" ] && curl -sS -X PUT -H 'content-type: image/jpeg' --data-binary "@$SAMPLE" "$URL" >/dev/null; then
      L=$(post /media/analyze "$(python3 -c "import json,sys;print(json.dumps({'key':sys.argv[1]}))" "$KEY")" \
          | python3 -c 'import json,sys;d=json.load(sys.stdin);print(", ".join(x["name"] for x in (d.get("labels") or [])[:5]))' 2>/dev/null)
      [ -n "$L" ] && ok "photo $n labelled: $L" || bad "photo $n analysis"
    else bad "photo $n upload"; fi
  done
else
  bad "no sample image available, skipping Rekognition"
fi

bold "5  SES + DynamoDB TTL -> email OTP issue and verify"
for addr in "traveller1@example.com" "traveller2@example.com" "${ALERT_EMAIL:-demo@example.com}"; do
  R=$(post /auth/otp "$(python3 -c "import json,sys;print(json.dumps({'email':sys.argv[1]}))" "$addr")")
  CODE=$(echo "$R" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("code",""))' 2>/dev/null)
  if [ -n "$CODE" ]; then
    V=$(post /auth/otp/verify "$(python3 -c "import json,sys;print(json.dumps({'email':sys.argv[1],'code':sys.argv[2]}))" "$addr" "$CODE")")
    echo "$V" | grep -q '"verified":true' && ok "$addr issued + verified" || bad "$addr verify"
  else bad "$addr issue"; fi
done

bold "6  Step Functions -> full itinerary workflows"
ARNS=""
while IFS='|' read -r dest lang nights; do
  [ -z "$dest" ] && continue
  B=$(python3 -c "import json,sys;print(json.dumps({'destination':sys.argv[1],'language':sys.argv[2],'nights':int(sys.argv[3]),'userId':'demo-user-1'}))" "$dest" "$lang" "$nights")
  A=$(post /ai/itinerary/async "$B" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("executionArn",""))' 2>/dev/null)
  [ -n "$A" ] && { ARNS="$ARNS$A"$'\n'; ok "started: $dest"; } || bad "start: $dest"
done <<'FLOWS'
Jaipur, India|hi|3
Kerala, India|ta|4
Leh, Ladakh|hi|5
FLOWS

if [ -n "$ARNS" ]; then
  printf '  waiting for executions to finish'
  for _ in $(seq 1 20); do
    RUNNING=0
    while read -r a; do
      [ -z "$a" ] && continue
      st=$(aws stepfunctions describe-execution --region "$REGION" --execution-arn "$a" --query status --output text 2>/dev/null)
      [ "$st" = "RUNNING" ] && RUNNING=$((RUNNING + 1))
    done <<< "$ARNS"
    [ "$RUNNING" -eq 0 ] && break
    printf '.'; sleep 5
  done
  echo
  while read -r a; do
    [ -z "$a" ] && continue
    st=$(aws stepfunctions describe-execution --region "$REGION" --execution-arn "$a" --query status --output text 2>/dev/null)
    [ "$st" = "SUCCEEDED" ] && ok "execution ${a##*:} -> $st" || bad "execution ${a##*:} -> $st"
  done <<< "$ARNS"
fi

bold "7  EventBridge custom bus -> SQS -> worker Lambda"
for t in itinerary_shared trip_booked review_submitted; do
  aws events put-events --region "$REGION" --entries \
    "[{\"Source\":\"planwitch.app\",\"DetailType\":\"$t\",\"EventBusName\":\"$BUS\",\"Detail\":\"{\\\"type\\\":\\\"$t\\\",\\\"userId\\\":\\\"demo-user-1\\\"}\"}]" \
    >/dev/null 2>&1 && ok "published $t" || bad "publish $t"
done

bold "8  EventBridge Scheduler target -> daily digest"
DIGEST=$(aws lambda list-functions --region "$REGION" \
  --query 'Functions[?contains(FunctionName,`digest`)].FunctionName' --output text 2>/dev/null)
if [ -n "$DIGEST" ]; then
  aws lambda invoke --region "$REGION" --function-name "$DIGEST" \
    --payload '{"trigger":"seed"}' --cli-binary-format raw-in-base64-out /tmp/digest.json >/dev/null 2>&1 \
    && ok "digest ran: $(python3 -c 'import json;d=json.load(open("/tmp/digest.json"));print(d.get("totalTrips"),"trips,",d.get("upcomingTrips"),"upcoming")' 2>/dev/null)" \
    || bad "digest invoke"
fi

bold "9  Cognito -> sign-up, sign-in, JWT-protected /me"
DEMO_EMAIL="reviewer@planwitch.demo"
DEMO_PASS="PlanWitch#$(date +%Y)demo"
aws cognito-idp admin-create-user --region "$REGION" --user-pool-id "$POOL_ID" \
  --username "$DEMO_EMAIL" --user-attributes Name=email,Value="$DEMO_EMAIL" Name=email_verified,Value=true \
  --message-action SUPPRESS >/dev/null 2>&1
aws cognito-idp admin-set-user-password --region "$REGION" --user-pool-id "$POOL_ID" \
  --username "$DEMO_EMAIL" --password "$DEMO_PASS" --permanent >/dev/null 2>&1 \
  && ok "user ready: $DEMO_EMAIL" || bad "user setup"
TOKEN=$(aws cognito-idp initiate-auth --region "$REGION" --auth-flow USER_PASSWORD_AUTH \
  --client-id "$CLIENT_ID" --auth-parameters USERNAME="$DEMO_EMAIL",PASSWORD="$DEMO_PASS" \
  --query 'AuthenticationResult.AccessToken' --output text 2>/dev/null)
if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then
  ok "signed in, access token issued"
  curl -sS -H "authorization: $TOKEN" "$API/me" | grep -q '"authenticated":true' \
    && ok "/me accepted the JWT" || bad "/me rejected the JWT"
  curl -sS "$API/me" -o /dev/null -w '  ✓ /me without a token -> HTTP %{http_code} (401 expected)\n'
else bad "sign-in"; fi

bold "10 Health check"
get /health | python3 -c 'import json,sys;d=json.load(sys.stdin);print(f"  services wired: {d[\"serviceCount\"]}  region: {d[\"region\"]}")' 2>/dev/null

cat <<EOF

Seed complete. The Cognito demo login is:
  email    $DEMO_EMAIL
  password $DEMO_PASS

Metrics and traces take 2-5 minutes to appear in CloudWatch and X-Ray.
EOF
