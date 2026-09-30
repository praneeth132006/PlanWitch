# AWS support case — account verification / service enablement

File this under **Account and billing**, not Technical support: technical cases
require a paid support plan, account/billing cases are free on Basic.

Direct link: https://support.console.aws.amazon.com/support/home#/case/create

## Form selections

| Field | Value |
| --- | --- |
| Case type | **Account and billing** |
| Service | **Account** |
| Category | **Activation** (use **Other account issues** if Activation is absent) |
| Severity | General question (highest available on Basic) |
| Subject | Account verification required for Bedrock, Translate, Comprehend, Firehose and CloudFront — account 315279425577 |

## Body — copy from here

Hello,

My account (ID 315279425577, Ternwing) is newly created and on the AWS Free
Plan. I am deploying a CloudFormation/CDK stack in ap-south-1 for a university
project and three services are blocked with errors that each direct me to open
a support case. I would like the account verified and these services enabled.

1) CloudFront — creating a distribution fails:

   "Access denied for operation 'AWS::CloudFront::Distribution: Your account
   must be verified before you can add new CloudFront resources. To verify your
   account, please contact AWS Support and include this error message.
   (Service: CloudFront, Status Code: 403,
   Request ID: a086b0ba-1995-4986-9732-ab28c42fba63)'"

2) Amazon Bedrock — I cannot submit the model access form:

   "An error occurred (ValidationException) when calling the
   PutUseCaseForModelAccess operation: Your account is not authorized to
   perform this action. Please create a support case with details about your
   use case and we will get back to you."

   Invoking a model directly also fails with "Operation not allowed", for both
   Anthropic Claude and Amazon Nova, in ap-south-1.

3) Amazon Kinesis Data Firehose — creating a delivery stream fails:

   "The AWS Access Key Id needs a subscription for the service
   (Service: Firehose, Status Code: 400,
   Request ID: f86ca5d8-4e08-7527-9b39-17404ea284d6)"

4) Amazon Translate — TranslateText fails:

   "An error occurred (SubscriptionRequiredException) when calling the
   TranslateText operation: The AWS Access Key Id needs a subscription for
   the service"

5) Amazon Comprehend — DetectDominantLanguage fails with the same
   SubscriptionRequiredException.

   Translate and Comprehend are used only for showing an itinerary summary in
   Hindi and detecting its sentiment. Both are within their free tiers at the
   volumes above.

Use case details, as requested by the Bedrock error message:

- Purpose: a student academic project, presented for a college project review.
- Application: a travel planning app that generates day-by-day trip
  itineraries from a destination, budget, trip length and interests.
- How Bedrock is used: a single text-generation call per request, through the
  Converse API, returning a JSON itinerary. No fine-tuning, no model
  distribution, no end-user content moderation workload.
- Audience: myself and my reviewers only. Not a public or commercial service.
- Expected volume: fewer than 100 requests in total.
- Region: ap-south-1. Model of interest:
  anthropic.claude-3-7-sonnet-20250219-v1:0 (Amazon Nova is equally fine).

All other services in the stack deploy correctly, so this appears to be new
account verification rather than a configuration problem on my side. I have
$100 in free plan credits available and am not asking for a quota increase,
only for the account to be verified so these services can be used.

This is needed for a project review, so a quick turnaround would be very much
appreciated.

Thank you,
Praneeth

## Copy from above — end

## After it is approved

```bash
cd aws
# re-enable everything that was flagged off
sed -i '' 's/^FREE_TIER_ONLY=true/FREE_TIER_ONLY=false/; s/^USE_CLOUDFRONT=false/USE_CLOUDFRONT=true/' .env
./scripts/deploy.sh
```

That restores CloudFront, Firehose, Glue, Athena, Secrets Manager and the
customer-managed KMS key, and the two Bedrock panels start working — no code
changes, the stack is already written for it.
