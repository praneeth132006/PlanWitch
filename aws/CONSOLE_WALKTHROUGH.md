# PlanWitch on AWS — console walkthrough

Everything below is live in **account 315279425577**, region **Asia Pacific (Mumbai) / ap-south-1**.

> **Before you start:** check the region selector in the top-right of the console
> reads **Mumbai**. In any other region the pages look empty and it is the single
> most common way this demo goes wrong.

Every resource is named `planwitch-<thing>-planwitchaws0cda4c5e`, so typing
`planwitch` into any service's search box filters to just this project.

---

## 1. Open with the project (30 seconds, before touching the console)

> PlanWitch is a travel planning app — React Native and Expo on the phone.
> You give it a destination, how long you're going, your budget and what you're
> into, and it builds a day-by-day itinerary, with maps, routes between places,
> trip photos and an audio guide.
>
> The app today runs on Firebase. What I built on AWS is the same backend
> re-architected as a proper cloud system — 31 AWS services, defined as code
> with AWS CDK, deployed as one CloudFormation stack.

Then say the one line that frames everything after it:

> Every service I'll show is there because the app needs it, not to collect logos.

---

## 2. CloudFormation — "I didn't click any of this"

**Console → CloudFormation → Stacks → `PlanWitchAws`** → *Resources* tab

- **What they see:** ~186 resources, all created together.
- **Why:** the entire architecture is infrastructure-as-code. One command builds
  it, one command destroys it. Nothing was hand-clicked, so it is reproducible
  and reviewable.
- **Good line:** "If you delete this stack, every resource in the demo disappears
  with it. That's deliberate — it's how I keep a throwaway account clean."

This is the strongest opening because it proves everything that follows.

---

## 3. The request path

### API Gateway
**Console → API Gateway → `planwitch-api-planwitchaws0cda4c5e`** → *Routes*

- 17 routes: `/trips`, `/places`, `/route`, `/speak`, `/media/*`, `/auth/otp`, `/ai/*`, `/me`
- **Why:** one HTTPS front door for the mobile app. HTTP API rather than REST API
  because it is cheaper and faster, and I don't need the extra REST features.
- **Point out:** `/me` has an **authorizer** attached, the others don't — that's
  the Cognito JWT check, enforced at the gateway before any code runs.

### Lambda
**Console → Lambda → Functions** → search `planwitch`

- 15 functions, one per job: `trips`, `places`, `speak`, `mediaapi`, `otp`,
  `health`, `me`, `itinerary`, `asyncitinerary`, `worker`, `tripstream`,
  `digest`, `workflowgenerate`, `workflowenrich`
- **Why:** no servers to run or patch, and it costs nothing when idle — which
  matters for a student project. Each function has its own IAM role, so the
  function that reads trips cannot touch the photo bucket.
- **Point out:** open any function → *Configuration → Monitoring* → **Active tracing**
  is on (that's X-Ray), and architecture is **arm64**, ~20% cheaper than x86.

---

## 4. Where the data lives

### DynamoDB
**Console → DynamoDB → Tables**

| Table | Holds | Why this design |
| --- | --- | --- |
| `planwitch-trips-…` | Saved trips and itineraries | Key is `userId` + `tripId`, so "all my trips" is one fast query, never a scan |
| `planwitch-otp-…` | Email verification codes | **TTL enabled** — AWS deletes expired codes automatically, no cleanup job |
| `planwitch-jobs-…` | Background job records | Also TTL'd, 7 days |

- **Why DynamoDB over SQL:** the access pattern is simple key lookups, it scales
  to zero cost when idle, and it's serverless like the rest of the stack.
- **Point out:** on the trips table → *Exports and streams* → **DynamoDB Streams**
  is on. Every write fires a Lambda, which is how notifications happen without
  the app having to ask for them.

### S3
**Console → S3 → Buckets** → search `planwitch`

| Bucket | Purpose |
| --- | --- |
| `…-web-…` | The web build + demo page, served over HTTPS |
| `…-uploads-…` | Trip photos — uploaded **straight from the phone** with a presigned URL |
| `…-media-…` | Generated audio guides |
| `…-analytics-…` | Event lake |
| `…-trail-…` | CloudTrail audit logs |

- **Best thing to say:** "Photos never pass through my backend. The phone asks for
  a presigned URL and uploads directly to S3. That keeps Lambda cheap and fast —
  I'm not paying to move image bytes through compute."

---

## 5. Who the user is

### Cognito
**Console → Cognito → User pools → `planwitch-users-planwitchaws0cda4c5e`**

- **Why:** managed sign-up, sign-in, email verification and password resets. I'm
  not storing passwords myself — that's a security decision, not a lazy one.
- Two halves worth naming:
  - **User pool** = who you are → issues a JWT the API Gateway validates
  - **Identity pool** = temporary AWS credentials → lets the app load map tiles
    directly without a backend call

---

## 6. What the app actually does for the traveller

### Amazon Location Service
**Console → Amazon Location Service → Place indexes → `planwitch-places-…`**
(also a Map and a Route calculator)

- **Why:** place search, geocoding and driving routes — the core of a travel app.
  It replaces Google Maps APIs and keeps everything inside one AWS bill and one
  IAM permission model.
- **Live proof:** searching "Kerala" returns `[76.408, 10.450], IND`.

### Amazon Polly
**Console → Amazon Polly**

- **Why:** turns an itinerary into a spoken audio guide, so you can listen while
  walking instead of staring at your phone. Uses neural Indian-English voices.

### Amazon Rekognition
- **Why:** when a traveller uploads a trip photo it gets auto-tagged (beach,
  temple, food), checked for unsafe content, and any text in the image is read.
  That's how photos become searchable without anyone tagging them by hand.

---

## 7. The part worth lingering on: orchestration

### Step Functions
**Console → Step Functions → `planwitch-itinerary-planwitchaws0cda4c5e`** → open the
newest execution → **Graph view**

- **What they see:** a visual flow — Draft → Enrich → Persist → Notify — all green.
- **Why it exists:** API Gateway kills any request at 30 seconds. Generating a
  full itinerary can take longer. So the slow path runs as a workflow: the phone
  gets an ID immediately and polls for the result.
- **Point out:** *Persist* writes to DynamoDB with **no Lambda at all** — Step
  Functions talks to DynamoDB directly. Less code, less to go wrong.
- **Strong line:** "Each step retries twice with exponential backoff, and if a
  step fails permanently the execution routes to a failure state instead of
  hanging."

### SQS + SNS + EventBridge
**Console → SQS → `planwitch-jobs-…` and `planwitch-jobs-dlq-…`**

- **Why a queue:** work gets accepted instantly and processed in the background.
  If processing fails it retries **3 times**, then the message moves to the
  **dead-letter queue** — so a bad job is never silently lost, and a CloudWatch
  alarm fires when anything lands there.
- **SNS** (`planwitch-events-…`) sends notifications when an itinerary is ready.
- **EventBridge** has a custom bus plus a **Scheduler** entry
  (`planwitch-daily-digest-…`) that runs a digest every day at 09:00 IST —
  a cron job with no server to keep running.

---

## 8. Running it safely

- **CloudWatch** → Lambda logs (1-week retention, so logs cost nothing), custom
  metrics, and **3 alarms**: Lambda errors, dead-letter queue not empty, AI failures.
- **X-Ray** → *Service map* shows one request fanning out across DynamoDB, S3 and
  Location. Good visual if they ask "how would you debug this?"
- **CloudTrail** (`planwitch-…`) → records every API call made in the account.
- **AWS Budgets** → emails me at 50% of actual and 100% of forecast spend.
- **IAM** → 23 roles. **Say this:** "Every function gets only the permissions it
  needs. Least privilege, enforced by the deployment, not by me remembering."
- **SSM Parameter Store** → 9 config values under `/planwitch/`, so the app
  discovers its own configuration instead of hardcoding URLs.

---

## 9. Be upfront about what doesn't run

Do not skip past the broken panels — own them. It reads as competence.

> This AWS account is a few hours old and on the Free Plan. AWS gates five
> services behind account verification, and I hit all five:
>
> | Service | What AWS says |
> | --- | --- |
> | Bedrock | `Operation not allowed` |
> | Translate | `SubscriptionRequiredException` |
> | Comprehend | `SubscriptionRequiredException` |
> | Kinesis Firehose | needs a subscription for the service |
> | CloudFront | account must be verified |
>
> The architecture is built for all five. I feature-flagged them off so the rest
> deploys cleanly, and I've filed a support case. When it's approved, two
> environment variables turn them all back on — no code changes.

**And the engineering point to land:**

> The itinerary workflow still completes without the AI. It falls back to a
> template and marks the result `degraded: true` with the reason, rather than
> failing. A demo that degrades honestly is better than one that breaks.

---

## 10. Questions you'll probably get

**"Why not just use EC2?"**
Nothing here runs continuously. Serverless costs nothing when idle, and there are
no servers to patch. For a project with bursts of traffic it's the cheaper and
safer choice.

**"What does this cost?"**
Effectively nothing — it's shaped to fit the free tier. No NAT gateway (~$32/month
on its own), no RDS, no idle compute. I have $100 of credits and have used cents.

**"Is it secure?"**
Encryption at rest on every table, HTTPS enforced on every bucket, per-function
IAM roles, JWT auth at the gateway, and CloudTrail recording every API call.

**"What would you do differently in production?"**
Put CloudFront in front with WAF, move secrets to Secrets Manager, add
multi-region for the database, and put a canary deployment in front of Lambda.

**"How long did this take to build?"**
It's about 1,100 lines of CDK plus 15 Lambda handlers. The point of IaC is that
rebuilding it in a fresh account takes one command and ten minutes.

---

## 11. Shut it down afterwards

```bash
cd aws && ./scripts/destroy.sh
```

Do this **before** closing the account — closing an account does not immediately
stop everything inside it.
