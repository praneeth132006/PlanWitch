#!/usr/bin/env bash
# One-shot deploy of the PlanWitch AWS stack.
#
#   ./scripts/deploy.sh
#
# Reads optional settings from aws/.env (see .env.example). Safe to re-run:
# CloudFormation updates in place.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(cd .. && pwd)"

# shellcheck disable=SC1091
[ -f .env ] && set -a && . ./.env && set +a

REGION="${AWS_REGION:-ap-south-1}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SENDER_EMAIL="${SENDER_EMAIL:-$ALERT_EMAIL}"
BUDGET="${MONTHLY_BUDGET_USD:-5}"
USE_CLOUDFRONT="${USE_CLOUDFRONT:-true}"
FREE_TIER_ONLY="${FREE_TIER_ONLY:-false}"
RESTRICTED_SERVICES="${RESTRICTED_SERVICES:-}"
USE_WAF="${USE_WAF:-false}"
USE_EC2="${USE_EC2:-false}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

bold "1/7  Checking credentials"
command -v aws >/dev/null || die "aws CLI not found. brew install awscli"
IDENTITY="$(aws sts get-caller-identity --output json 2>/dev/null)" \
  || die "Not logged in. Run 'aws configure' (or 'aws sso login') first."
ACCOUNT="$(printf '%s' "$IDENTITY" | python3 -c 'import json,sys;print(json.load(sys.stdin)["Account"])')"
ARN="$(printf '%s' "$IDENTITY" | python3 -c 'import json,sys;print(json.load(sys.stdin)["Arn"])')"
ok "account $ACCOUNT"
ok "identity $ARN"
ok "region $REGION"

# `aws login` stores a session under the config key `login_session`, which the
# AWS SDK bundled inside the CDK CLI does not understand yet -- it reports
# "no credentials have been configured" even though the CLI itself is fine.
# Resolve the session to explicit credentials and export them for the subprocess.
if aws configure export-credentials --format env >/dev/null 2>&1; then
  eval "$(aws configure export-credentials --format env)"
  export AWS_DEFAULT_REGION="$REGION" AWS_REGION="$REGION"
  ok "credentials exported for the CDK SDK"
fi

bold "2/7  Installing dependencies"
[ -d node_modules ] || npm install --silent
[ -d lambda/node_modules ] || (cd lambda && npm install --silent --omit=dev)
ok "cdk + lambda deps present"

bold "3/7  Picking a Bedrock model"
MODEL="${BEDROCK_MODEL_ID:-}"
if [ -z "$MODEL" ]; then
  AVAILABLE="$(aws bedrock list-inference-profiles --region "$REGION" \
      --query 'inferenceProfileSummaries[].inferenceProfileId' --output text 2>/dev/null || true)"
  FOUNDATION="$(aws bedrock list-foundation-models --region "$REGION" \
      --query 'modelSummaries[].modelId' --output text 2>/dev/null || true)"
  for candidate in \
    apac.anthropic.claude-sonnet-4-5-20250929-v1:0 \
    apac.anthropic.claude-3-5-sonnet-20241022-v2:0 \
    apac.anthropic.claude-3-5-sonnet-20240620-v1:0 \
    apac.amazon.nova-pro-v1:0 \
    apac.amazon.nova-lite-v1:0 \
    amazon.nova-pro-v1:0 \
    amazon.nova-lite-v1:0 \
    anthropic.claude-3-5-sonnet-20240620-v1:0
  do
    case " $AVAILABLE $FOUNDATION " in
      *" $candidate "*) MODEL="$candidate"; break ;;
    esac
  done
fi
if [ -z "$MODEL" ]; then
  MODEL="apac.anthropic.claude-3-5-sonnet-20241022-v2:0"
  warn "could not list Bedrock models; defaulting to $MODEL"
else
  ok "model $MODEL"
fi
warn "Bedrock needs model access granted once, per region, in the console:"
printf '       https://%s.console.aws.amazon.com/bedrock/home?region=%s#/modelaccess\n' "$REGION" "$REGION"

bold "4/7  Bootstrapping CDK (first run only)"
if aws cloudformation describe-stacks --stack-name CDKToolkit --region "$REGION" >/dev/null 2>&1; then
  ok "already bootstrapped"
else
  npx cdk bootstrap "aws://$ACCOUNT/$REGION"
  ok "bootstrapped"
fi

STATUS="$(aws cloudformation describe-stacks --stack-name PlanWitchAws --region "$REGION" \
  --query 'Stacks[0].StackStatus' --output text 2>/dev/null || true)"

if [ "$STATUS" = "ROLLBACK_COMPLETE" ] || [ "$STATUS" = "CREATE_FAILED" ]; then
  warn "previous attempt left the stack in $STATUS; deleting it before retrying"
  aws cloudformation delete-stack --stack-name PlanWitchAws --region "$REGION"
  aws cloudformation wait stack-delete-complete --stack-name PlanWitchAws --region "$REGION"
  ok "old stack removed"

  # Only now are planwitch- budgets genuine orphans: the stack that owned them
  # is gone, but a budget's name is its physical id, so a leftover blocks the
  # next create. Never clear these while the stack is alive -- that deletes
  # budgets CloudFormation still owns and it will not recreate them.
  # Budgets is a global service, reachable only through the us-east-1 endpoint.
  for b in $(aws budgets describe-budgets --account-id "$ACCOUNT" --region us-east-1 \
      --query 'Budgets[?starts_with(BudgetName, `planwitch-`)].BudgetName' --output text 2>/dev/null); do
    aws budgets delete-budget --account-id "$ACCOUNT" --region us-east-1 --budget-name "$b" >/dev/null 2>&1 \
      && warn "cleared orphaned budget $b"
  done
fi

bold "5/7  Deploying PlanWitchAws (this takes 8-12 minutes -- CloudFront is the slow part)"
npx cdk deploy PlanWitchAws \
  --require-approval never \
  --outputs-file cdk-outputs.json \
  -c "region=$REGION" \
  -c "alertEmail=$ALERT_EMAIL" \
  -c "senderEmail=$SENDER_EMAIL" \
  -c "bedrockModelId=$MODEL" \
  -c "monthlyBudgetUsd=$BUDGET" \
  -c "useCloudFront=$USE_CLOUDFRONT" \
  -c "freeTierOnly=$FREE_TIER_ONLY" \
  -c "restrictedServices=$RESTRICTED_SERVICES" \
  -c "useWaf=$USE_WAF" \
  -c "useEc2=$USE_EC2"

bold "6/7  Writing the app-side config"
python3 - "$ROOT" <<'PY'
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
out = json.loads(pathlib.Path('cdk-outputs.json').read_text())['PlanWitchAws']
target = root / 'src' / 'config' / 'awsConfig.js'
target.write_text(
    "// GENERATED by aws/scripts/deploy.sh -- do not edit by hand.\n"
    "// Mirrors the CloudFormation outputs of the PlanWitchAws stack.\n\n"
    "export const AWS_CONFIG = " + json.dumps({
        'enabled': True,
        'region': out.get('ApiUrl', '').split('.')[2] if '.' in out.get('ApiUrl', '') else 'ap-south-1',
        'apiUrl': out.get('ApiUrl', ''),
        'webAppUrl': out.get('WebAppUrl', ''),
        'demoConsoleUrl': out.get('DemoConsoleUrl', ''),
        'userPoolId': out.get('UserPoolId', ''),
        'userPoolClientId': out.get('UserPoolClientId', ''),
        'identityPoolId': out.get('IdentityPoolId', ''),
        'bedrockModelId': out.get('BedrockModelId', ''),
        'tripsTable': out.get('TripsTableName', ''),
        'uploadsBucket': out.get('UploadsBucket', ''),
    }, indent=2) + ";\n\nexport default AWS_CONFIG;\n"
)
print(f"  wrote {target.relative_to(root)}")
PY

bold "7/7  Smoke-testing the live endpoints"
./scripts/smoke-test.sh || warn "some checks failed -- see above"

bold "Done. The links that matter:"
python3 - <<'PY'
import json, pathlib
out = json.loads(pathlib.Path('cdk-outputs.json').read_text())['PlanWitchAws']
for k in ('DemoConsoleUrl', 'WebAppUrl', 'ApiUrl', 'DashboardUrl', 'StateMachineUrl'):
    if out.get(k):
        print(f"  {k:18} {out[k]}")
PY
