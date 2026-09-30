#!/usr/bin/env bash
# Creates a read-only IAM user for demonstrating the account in the console,
# plus the group and policy behind it. Credentials are written to a local
# gitignored file, never printed to a shared terminal.
#
#   ./scripts/create-iam-user.sh            create (or refresh) the user
#   ./scripts/create-iam-user.sh --delete   remove everything it made
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
[ -f .env ] && set -a && . ./.env && set +a
REGION="${AWS_REGION:-ap-south-1}"
# No credential export here: the aws CLI reads the `aws login` session itself.
# Exporting a frozen copy made long runs fail as the session rolled over --
# only the CDK CLI needs that bridge, because its bundled SDK is older.

USER_NAME="planwitch-reviewer"
GROUP_NAME="planwitch-reviewers"
CREDS_FILE="iam-user-credentials.txt"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"

ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }

if [ "${1:-}" = "--delete" ]; then
  echo "Removing $USER_NAME ..."
  for k in $(aws iam list-access-keys --user-name "$USER_NAME" --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null); do
    aws iam delete-access-key --user-name "$USER_NAME" --access-key-id "$k" 2>/dev/null || true
  done
  aws iam delete-login-profile --user-name "$USER_NAME" 2>/dev/null || true
  aws iam remove-user-from-group --user-name "$USER_NAME" --group-name "$GROUP_NAME" 2>/dev/null || true
  aws iam delete-user --user-name "$USER_NAME" 2>/dev/null || true
  aws iam detach-group-policy --group-name "$GROUP_NAME" \
    --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess 2>/dev/null || true
  aws iam delete-group --group-name "$GROUP_NAME" 2>/dev/null || true
  rm -f "$CREDS_FILE"
  ok "removed"
  exit 0
fi

echo "Creating IAM group, user and sign-in credentials ..."

aws iam create-group --group-name "$GROUP_NAME" >/dev/null 2>&1 || true
# ReadOnlyAccess: enough to walk every service page, cannot change anything.
aws iam attach-group-policy --group-name "$GROUP_NAME" \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess >/dev/null
ok "group $GROUP_NAME with ReadOnlyAccess"

aws iam create-user --user-name "$USER_NAME" \
  --tags Key=Project,Value=PlanWitch Key=Purpose,Value=ProjectReview >/dev/null 2>&1 || true
aws iam add-user-to-group --user-name "$USER_NAME" --group-name "$GROUP_NAME" >/dev/null
ok "user $USER_NAME"

# Password is generated here and never echoed to the terminal.
PASSWORD="$(python3 -c "
import secrets, string
alphabet = string.ascii_letters + string.digits + '!@#\$%^&*-_'
print('Pw' + ''.join(secrets.choice(alphabet) for _ in range(18)))
")"
aws iam delete-login-profile --user-name "$USER_NAME" >/dev/null 2>&1 || true
aws iam create-login-profile --user-name "$USER_NAME" \
  --password "$PASSWORD" --no-password-reset-required >/dev/null
ok "console password set"

for k in $(aws iam list-access-keys --user-name "$USER_NAME" --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null); do
  aws iam delete-access-key --user-name "$USER_NAME" --access-key-id "$k" >/dev/null 2>&1 || true
done
KEY_JSON="$(aws iam create-access-key --user-name "$USER_NAME")"
KEY_ID="$(echo "$KEY_JSON" | python3 -c 'import json,sys;print(json.load(sys.stdin)["AccessKey"]["AccessKeyId"])')"
KEY_SECRET="$(echo "$KEY_JSON" | python3 -c 'import json,sys;print(json.load(sys.stdin)["AccessKey"]["SecretAccessKey"])')"
ok "access key created"

umask 077
cat > "$CREDS_FILE" <<EOF
PlanWitch review IAM user
Created $(date '+%Y-%m-%d %H:%M %Z')

CONSOLE SIGN-IN
  URL       https://${ACCOUNT}.signin.aws.amazon.com/console
  Account   ${ACCOUNT}
  Username  ${USER_NAME}
  Password  ${PASSWORD}

CLI ACCESS KEY
  Access key ID      ${KEY_ID}
  Secret access key  ${KEY_SECRET}
  Region             ${REGION}

PERMISSIONS
  Group ${GROUP_NAME}, AWS managed policy ReadOnlyAccess.
  Can view every service page in the console. Cannot create, modify or
  delete anything, and cannot read secrets or S3 object contents.

REMOVE IT AGAIN
  ./scripts/create-iam-user.sh --delete
EOF

echo
echo "Credentials written to $(pwd)/$CREDS_FILE (gitignored, owner-readable only)."
echo "Sign-in URL: https://${ACCOUNT}.signin.aws.amazon.com/console"
echo "Username:    ${USER_NAME}"
echo "The password and secret key are in the file -- not printed here."
