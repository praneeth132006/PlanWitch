# PlanWitch on AWS — service table

Account **315279425577**, region **ap-south-1 (Mumbai)**.
Live app: the PlanWitch PWA is served from S3 over HTTPS.

> **Scope note, say this if asked:** the PlanWitch app itself still uses Firebase
> for its live auth and database — that is the production app. What is built on
> AWS is the same backend re-architected as a cloud-native system, deployed and
> populated with real data, plus the web app hosted on AWS.

---

## A. Live and working (24 services)

| # | Service | Why we used it | How to show it |
| --- | --- | --- | --- |
| 1 | **CloudFormation** | The whole architecture as one deployable, deletable unit — nothing hand-clicked | CloudFormation → `PlanWitchAws` → Resources (~186) |
| 2 | **IAM** | 23 roles, one per function, least privilege | IAM → Roles → search `planwitch` |
| 3 | **KMS** | Encryption at rest for every DynamoDB table | DynamoDB → table → Additional settings → Encryption |
| 4 | **Lambda** | Serverless compute — no servers, zero cost when idle | Lambda → Functions → search `planwitch` (15) |
| 5 | **API Gateway** | One HTTPS front door for the mobile app; 17 routes | API Gateway → `planwitch-api-…` → Routes |
| 6 | **DynamoDB** | Trips, OTPs, jobs — key-value access, scales to zero | DynamoDB → Tables → `planwitch-trips-…` → Explore items (12 trips) |
| 7 | **DynamoDB Streams** | Fire a Lambda on every trip write, no polling | Trips table → Exports and streams → Stream enabled |
| 8 | **DynamoDB TTL** | Auto-expire OTP codes; no cleanup job to run | OTP table → Additional settings → TTL on `expiresAt` |
| 9 | **S3** | Web hosting, photo uploads, audio, event lake, audit logs | S3 → Buckets → 5 × `planwitch-…` |
| 10 | **S3 presigned URLs** | Phone uploads photos straight to S3, bypassing Lambda | Uploads bucket → `uploads/demo-user-1/` → 3 photos |
| 11 | **Cognito User Pool** | Managed sign-up/sign-in; we never store passwords | Cognito → `planwitch-users-…` → Users |
| 12 | **Cognito Identity Pool** | Temporary AWS creds so the app loads maps client-side | Cognito → Identity pools → `planwitch_identity_…` |
| 13 | **API Gateway JWT authorizer** | Auth enforced at the edge, before any code runs | API Gateway → Authorization → `/me` protected, others not |
| 14 | **Amazon Location** | Place search, geocoding and routing — core travel features | Location → Place indexes / Route calculators / Maps |
| 15 | **Amazon Polly** | Spoken audio guide so travellers listen instead of read | S3 media bucket → `audio/` → play an `.mp3` |
| 16 | **Amazon Rekognition** | Auto-tag trip photos, moderate them, read text in them | Run panel 8 of the demo console, or CloudWatch logs for `mediaapi` |
| 17 | **Amazon SES** | Delivers the email OTP | SES → Identities; logs in `planwitch-otp-…` |
| 18 | **SNS** | Notifies when an itinerary is ready | SNS → `planwitch-events-…` → Subscriptions |
| 19 | **SQS + DLQ** | Accept work instantly, retry 3×, never lose a failed job | SQS → `planwitch-jobs-…` and `-dlq-…` |
| 20 | **Step Functions** | Itinerary generation exceeds API Gateway's 30s limit | Step Functions → `planwitch-itinerary-…` → an execution → Graph view |
| 21 | **EventBridge** | Custom bus decoupling app events from consumers | EventBridge → Event buses → `planwitch-bus-…` → Rules |
| 22 | **EventBridge Scheduler** | Daily traveller digest at 09:00 IST, no cron server | EventBridge → Schedules → `planwitch-daily-digest-…` |
| 23 | **SSM Parameter Store** | App discovers its config instead of hardcoding URLs | Systems Manager → Parameter Store → `/planwitch/` (9) |
| 24 | **CloudWatch** | Logs, 15 custom metrics, 3 alarms, 1 dashboard | CloudWatch → Dashboards → `PlanWitch-…`; Alarms |
| 25 | **AWS X-Ray** | Trace one request across Lambda, DynamoDB, S3, Location | CloudWatch → X-Ray traces → Service map |
| 26 | **CloudTrail** | Audit log of every API call in the account | CloudTrail → Event history |
| 27 | **Amazon EC2** | A conventional compute tier: t3.micro status host in the default VPC, encrypted gp3 root volume | EC2 → Instances → `planwitch-status-…`; open its public IP |
| 28 | **AWS Systems Manager Session Manager** | Shell access with no SSH port and no key pair | EC2 → select instance → Connect → Session Manager |
| 29 | **AWS WAF** | Managed rule groups + per-IP rate limit, protecting the Cognito user pool | WAF → Web ACLs → `planwitch-waf-…` |
| 30 | **API Gateway throttling** | 100 req/s steady, 200 burst — WAF cannot attach to an HTTP API, so this is the API's own rate limit | API Gateway → stage → Default route settings |
| 31 | **AWS Trusted Advisor** | Account-level security and limits review (free check set on Basic support) | See `TRUSTED_ADVISOR.md` |
| 32 | **AWS Budgets** | 3 budgets: monthly $5 tiered, daily $1, Lambda-only $1 | Billing → Budgets |

## B. Built but blocked by the Free Plan (5 services)

The code and infrastructure exist and are feature-flagged off. A support case is
drafted in `SUPPORT_CASE.md`; after approval, two environment variables re-enable
all of it with no code change.

| Service | Why we wanted it | What AWS returns | What's needed |
| --- | --- | --- | --- |
| **Amazon Bedrock** | Generate the itinerary (Claude) | `Operation not allowed` | Account verification |
| **Amazon Translate** | Itinerary in Hindi / Tamil / French | `SubscriptionRequiredException` | Account verification |
| **Amazon Comprehend** | Detect language, sentiment, key phrases | `SubscriptionRequiredException` | Account verification |
| **Kinesis Data Firehose** | Stream events to the S3 lake for Athena | `needs a subscription for the service` | Account verification |
| **CloudFront** | CDN + HTTPS in front of the web app | `account must be verified` | Account verification |

Glue and Athena are written and switch on with Firehose, since they query what it lands.

**The engineering answer when they ask about Bedrock being down:** the itinerary
workflow still completes. It falls back to a template, marks the result
`degraded: true` with the reason, and the Step Functions execution finishes green
rather than failing. Degrading honestly beats breaking.

---

## C. Demo data already in the account

| Evidence | Where |
| --- | --- |
| 12 trips across 3 users | DynamoDB → `planwitch-trips-…` → Explore items |
| 3 trip photos + Rekognition labels | S3 uploads bucket; `mediaapi` logs |
| 3 audio guides (mp3) | S3 media bucket → `audio/` |
| Completed workflow executions | Step Functions → Executions |
| OTP issue + verify cycles | `planwitch-otp-…` logs |
| Cognito user + successful JWT sign-in | Cognito → Users → `reviewer@planwitch.demo` |
| Metrics and traces | CloudWatch dashboard, X-Ray service map |

Re-run any time: `./scripts/seed-demo-data.sh`

---

## D. What would come next in production

| Area | Next step |
| --- | --- |
| Delivery | CloudFront + WAF in front of S3 |
| Secrets | Move third-party keys to Secrets Manager |
| Data | Point-in-time recovery and backups on DynamoDB |
| Deploys | CodePipeline or GitHub Actions with OIDC, no long-lived keys |
| Resilience | Multi-AZ/multi-region, canary Lambda deployments |
| Cost | Reserved capacity once traffic is predictable |
