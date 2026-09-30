#!/usr/bin/env bash
# Tears the whole stack down. Every resource carries a DESTROY removal policy,
# so this leaves the account empty apart from the CDK bootstrap stack.
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck disable=SC1091
[ -f .env ] && set -a && . ./.env && set +a
REGION="${AWS_REGION:-ap-south-1}"

echo "This permanently deletes the PlanWitchAws stack in $REGION:"
echo "  - all DynamoDB tables and their data"
echo "  - all S3 buckets and their contents (web, uploads, media, analytics, trail)"
echo "  - the Cognito user pool and every user in it"
echo
read -r -p 'Type DESTROY to continue: ' confirm
[ "$confirm" = "DESTROY" ] || { echo "Aborted."; exit 1; }

npx cdk destroy PlanWitchAws --force -c "region=$REGION"

echo
echo "Stack deleted. To remove the CDK bootstrap stack as well:"
echo "  aws cloudformation delete-stack --stack-name CDKToolkit --region $REGION"
echo "Then confirm nothing is left billable:"
echo "  https://$REGION.console.aws.amazon.com/costmanagement/home#/dashboard"
