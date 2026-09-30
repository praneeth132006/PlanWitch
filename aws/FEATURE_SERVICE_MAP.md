# PlanWitch — functions and feature-to-service map

Companion to `SERVICES_TABLE.md`. This one answers two questions:
what code is deployed, and which AWS service serves which app feature.

---

## A. The 15 Lambda functions

All are Node.js 20 on arm64, 512 MB, X-Ray tracing on, logs kept 7 days.
Each has its own IAM role with only the permissions that row needs.

| # | Function | Triggered by | What it does | AWS services it calls |
| --- | --- | --- | --- | --- |
| 1 | `planwitch-health` | `GET /health` | Liveness probe; returns the live service inventory | CloudWatch |
| 2 | `planwitch-me` | `GET /me` | Returns the caller's identity from the JWT. Only reachable with a valid token | Cognito (via authorizer) |
| 3 | `planwitch-trips` | `GET/POST /trips`, `GET/DELETE /trips/{id}` | Create, list, fetch and delete trips | DynamoDB, CloudWatch |
| 4 | `planwitch-itinerary` | `POST /ai/itinerary` | Generates an itinerary synchronously, saves it, announces it | Bedrock, DynamoDB, SNS |
| 5 | `planwitch-asyncitinerary` | `POST /ai/itinerary/async`, `GET /ai/itinerary/status` | Starts the workflow, reports execution status | Step Functions, SQS |
| 6 | `planwitch-places` | `GET /places`, `GET /route` | Place search, reverse geocoding, driving routes | Amazon Location |
| 7 | `planwitch-translate` | `POST /translate` | Detects language, translates, scores sentiment | Translate, Comprehend |
| 8 | `planwitch-speak` | `POST /speak` | Synthesises an audio guide, stores it, returns a presigned link | Polly, S3 |
| 9 | `planwitch-mediaapi` | `POST /media/upload-url`, `POST /media/analyze` | Issues presigned uploads; labels, moderates and reads text in photos | S3, Rekognition |
| 10 | `planwitch-otp` | `POST /auth/otp`, `POST /auth/otp/verify` | Issues a 6-digit code with a TTL, emails it, verifies and burns it | SES, DynamoDB |
| 11 | `planwitch-worker` | SQS message | Processes queued jobs; reports partial batch failures so only genuine failures retry | SQS, DynamoDB |
| 12 | `planwitch-tripstream` | DynamoDB Stream | Reacts to every trip write; notifies when a trip reaches a completed state | DynamoDB Streams, SNS |
| 13 | `planwitch-digest` | EventBridge Scheduler, 09:00 IST | Daily digest of upcoming trips; publishes gauges | DynamoDB, SNS, CloudWatch |
| 14 | `planwitch-workflowgenerate` | Step Functions step 1 | Drafts the itinerary; falls back to a labelled template if the model is unavailable | Bedrock |
| 15 | `planwitch-workflowenrich` | Step Functions step 2 | Adds sentiment, key phrases, a translation and the destination's coordinates | Comprehend, Translate, Location |

Two more steps in the workflow use **no Lambda at all** — Step Functions writes
to DynamoDB and publishes to SNS through native service integrations.

---

## B. App feature → AWS services

Screens are the real ones in `src/screens/`.

| App feature | Screen(s) | AWS services behind it | How it works |
| --- | --- | --- | --- |
| **Sign up / sign in** | `SignInScreen`, `SignUpScreen`, `AuthScreen`, `ForgotPasswordScreen` | Cognito User Pool, API Gateway JWT authorizer | Cognito handles accounts and passwords; the token it issues is checked at the gateway before any code runs |
| **Email OTP verification** | `AuthScreen` | SES, DynamoDB (TTL), Lambda | Code stored with an expiry attribute; DynamoDB deletes it automatically |
| **Guest / first open** | `WelcomeScreen`, `OnboardingScreen` | Cognito Identity Pool | Grants temporary credentials so maps load before anyone signs in |
| **Plan a trip** | `PlanTripScreen`, `TripSetupScreen`, `TripPreferencesScreen` | DynamoDB, Lambda, API Gateway | Trip saved under `userId` + `tripId`, so "my trips" is one query |
| **AI itinerary** | `AIPersonalizedPlanScreen` | Bedrock, Step Functions, DynamoDB, SNS, SQS | Short requests answered directly; long ones run as a workflow because API Gateway cuts off at 30s |
| **Itinerary view** | `ItineraryScreen` | DynamoDB | Reads the stored day-by-day plan |
| **Maps and places** | `MapScreen`, `HomeMap`, `TripMap`, `PlacesAutocomplete` | Amazon Location (map, place index) | Map tiles fetched directly by the app with identity-pool credentials |
| **Travel time between stops** | `ItineraryScreen`, `MapScreen` | Amazon Location (route calculator) | Returns distance and duration for ordering a day's plan |
| **Audio travel guide** | `ItineraryScreen` | Polly, S3 | Narration generated, stored, returned as a 1-hour presigned URL |
| **Trip photos** | `TripDashboardScreen`, `HistoryScreen` | S3 presigned uploads, Rekognition | Phone uploads straight to S3; labels, moderation and OCR run after |
| **Multilingual itinerary** | `ItineraryScreen` | Translate, Comprehend | Summary translated; language and sentiment detected |
| **Budget and expenses** | `BudgetScreen`, `ExpensesScreen`, `ExpenseScreen`, `PieChart` | DynamoDB | Stored on the trip record and aggregated for the chart |
| **Packing and food lists** | `PackingScreen`, `FoodChecklistScreen`, `FoodListScreen` | DynamoDB | Checklist state on the trip record |
| **Join a trip by code** | `JoinSelectionScreen` | DynamoDB, EventBridge, SQS | Join published as an event, routed to the queue, handled by the worker |
| **Trip notifications** | all trip screens | DynamoDB Streams, SNS, Lambda | A write fires the stream consumer, which publishes — the app never polls |
| **Daily digest** | background | EventBridge Scheduler, Lambda, SNS | Runs at 09:00 IST with no server to keep alive |
| **Dashboard / history** | `DashboardScreen`, `HomeScreen`, `TripDashboardScreen`, `HistoryScreen` | DynamoDB, CloudWatch | Trip data plus the custom metrics each call emits |
| **Subscription / premium** | `SubscriptionScreen`, `PremiumContext` | — (RevenueCat) | Third party; AWS not involved |
| **Ads** | `AdBanner`, `BannerAd` | — (AdMob) | Third party; AWS not involved |
| **Admin view** | `AdminScreen` | CloudWatch, DynamoDB | Reads metrics and trip records |
| **App delivery itself** | whole web build | S3 (+ CloudFront when enabled) | The PWA is served over HTTPS from S3 |

### Cross-cutting, behind every feature

| Concern | Services |
| --- | --- |
| Deployment | CloudFormation via AWS CDK |
| Permissions | IAM — 23 roles, one per function |
| Configuration | SSM Parameter Store |
| Encryption at rest | KMS on every DynamoDB table |
| Logs, metrics, alarms | CloudWatch |
| Request tracing | X-Ray |
| Audit | CloudTrail |
| Cost control | AWS Budgets |

### Features currently degraded on this account

| Feature | Blocked service | What happens instead |
| --- | --- | --- |
| AI itinerary | Bedrock | Workflow completes with a template, flagged `degraded: true` |
| Multilingual itinerary | Translate, Comprehend | Endpoint returns an explicit error |
| Analytics pipeline | Firehose, Glue, Athena | Events skipped; everything else unaffected |
| CDN delivery | CloudFront | Served from S3 over HTTPS instead |
