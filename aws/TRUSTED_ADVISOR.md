# AWS Trusted Advisor — what you can show, and what it will say

Console: https://us-east-1.console.aws.amazon.com/trustedadvisor/home#/dashboard
(Trusted Advisor is a global service, so its console always shows `us-east-1`.)

## What is actually available on this account

Your account is on **Basic support**, which gives the **free check set only**:
core security checks plus service limits. The full ~115 checks (cost
optimisation, fault tolerance, performance) need a **Business or Enterprise**
support plan, which is $100/month minimum.

The Trusted Advisor **API is unavailable entirely** on Basic:

```
aws support describe-trusted-advisor-checks
-> SubscriptionRequiredException: Amazon Web Services Premium Support
   Subscription is required to use this service.
```

So this is a console-only item. Say that plainly if asked — it is a support-plan
limit, not something configured wrong.

## What it will report, and why

I ran the equivalent checks directly against the account, so there are no
surprises on screen.

| Check | Result | Why, and what I would do |
| --- | --- | --- |
| **Root account MFA** | ❌ Not enabled | The one finding worth fixing. Enable MFA on the root user — it takes two minutes and is the single highest-value security change on any AWS account. |
| **S3 bucket permissions** | ⚠️ `planwitch-web-…` allows public reads | Deliberate: it serves the web app, and CloudFront is blocked on this account so the browser hits S3 directly. With CloudFront enabled the bucket goes private behind an Origin Access Control. The other four buckets are fully blocked. |
| **Security groups — unrestricted ports** | ⚠️ Port 80 open to 0.0.0.0/0 | Expected for a public status page. Note what is *not* there: no port 22. The instance is reached through Systems Manager Session Manager, so there is no SSH exposure at all. |
| **IAM use** | ✅ Roles and a user exist | 23 roles, one per Lambda, each least-privilege. |
| **MFA on IAM users** | ⚠️ `planwitch-reviewer` has none | A read-only demo user created for this review, deleted afterwards. |
| **Service limits** | ✅ Far below every quota | Nothing close to a limit. |
| **Idle resources** | ✅ 1 EBS volume, 0 unattached Elastic IPs | The one volume is the EC2 root disk. No orphans. |

## How to show it well

1. Open the Trusted Advisor dashboard.
2. Point out that only the security checks and service limits are populated, and
   say why — Basic support.
3. Walk the findings above. **Do not skip the red one.** "Root MFA is off and
   that is the first thing I would fix" is a much stronger answer than hoping
   nobody scrolls.
4. Contrast with what you built deliberately: the public S3 bucket and open
   port 80 are findings you can *explain*, and the absence of an SSH rule is a
   decision you made rather than a default you inherited.

## Fix the red one before the review

Root MFA, roughly two minutes, needs your phone:

1. https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials
2. **Multi-factor authentication (MFA)** → **Assign MFA device**
3. Choose **Authenticator app**, scan the QR with Google Authenticator or similar
4. Enter two consecutive codes

That single change turns the only red check green.
