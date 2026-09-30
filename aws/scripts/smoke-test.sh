#!/usr/bin/env bash
# Exercises every deployed endpoint against the real services.
set -uo pipefail
cd "$(dirname "$0")/.."

[ -f cdk-outputs.json ] || { echo "cdk-outputs.json missing -- deploy first." >&2; exit 1; }
API="$(python3 -c 'import json;print(json.load(open("cdk-outputs.json"))["PlanWitchAws"]["ApiUrl"].rstrip("/"))')"
echo "API: $API"
echo

PASS=0; FAIL=0
check() {
  local label="$1"; shift
  local body status
  body="$(curl -sS --max-time 90 -w '\n%{http_code}' "$@" 2>&1)"
  status="$(printf '%s' "$body" | tail -1)"
  body="$(printf '%s' "$body" | sed '$d')"
  if [ "$status" = "200" ] || [ "$status" = "201" ] || [ "$status" = "202" ]; then
    printf '  \033[32m✓\033[0m %-34s %s\n' "$label" "$status"
    PASS=$((PASS + 1))
  else
    printf '  \033[31m✗\033[0m %-34s %s\n' "$label" "$status"
    printf '      %s\n' "$(printf '%s' "$body" | head -c 400)"
    FAIL=$((FAIL + 1))
  fi
}

J=(-H 'content-type: application/json')

check "GET  /health"            "$API/health"
check "POST /trips"             -X POST "${J[@]}" -d '{"destination":"Goa, India","status":"confirmed"}' "$API/trips"
check "GET  /trips"             "$API/trips"
check "GET  /places"            "$API/places?q=Taj%20Mahal"
check "GET  /route"             "$API/route?from=72.8777,19.0760&to=73.8567,18.5204"
check "POST /translate"         -X POST "${J[@]}" -d '{"text":"The beaches were stunning.","to":"hi"}' "$API/translate"
check "POST /speak"             -X POST "${J[@]}" -d '{"text":"Welcome to Jaipur.","voice":"Kajal"}' "$API/speak"
check "POST /media/upload-url"  -X POST "${J[@]}" -d '{"contentType":"image/jpeg"}' "$API/media/upload-url"
check "POST /auth/otp"          -X POST "${J[@]}" -d '{"email":"demo@example.com"}' "$API/auth/otp"
check "POST /ai/itinerary"      -X POST "${J[@]}" -d '{"destination":"Jaipur, India","nights":2}' "$API/ai/itinerary"
check "POST /ai/itinerary/async" -X POST "${J[@]}" -d '{"destination":"Kerala, India","nights":3,"language":"hi"}' "$API/ai/itinerary/async"

echo
echo "  passed: $PASS   failed: $FAIL"
[ "$FAIL" -eq 0 ] || echo "  (Bedrock routes fail with 403 until model access is granted in the console.)"
exit 0
