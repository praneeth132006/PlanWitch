# Direct console links (region pinned to Mumbai)

Every link forces `region=ap-south-1`. If a page still looks empty, check the
region selector top-right says **Asia Pacific (Mumbai)** — that is the one
thing that makes populated resources look like nothing is there.

| What | Count | Link |
| --- | --- | --- |
| **Trips table — items** | 55 | https://ap-south-1.console.aws.amazon.com/dynamodbv2/home?region=ap-south-1#item-explorer?table=planwitch-trips-planwitchaws0cda4c5e |
| **Jobs table — items** | 22 | https://ap-south-1.console.aws.amazon.com/dynamodbv2/home?region=ap-south-1#item-explorer?table=planwitch-jobs-planwitchaws0cda4c5e |
| **OTP table — items** | 5 | https://ap-south-1.console.aws.amazon.com/dynamodbv2/home?region=ap-south-1#item-explorer?table=planwitch-otp-planwitchaws0cda4c5e |
| **Trip photos in S3** | 9 | https://ap-south-1.console.aws.amazon.com/s3/buckets/planwitch-uploads-planwitchaws0cda4c5e-315279425577?region=ap-south-1&prefix=uploads/ |
| **Audio guides in S3** | 13 | https://ap-south-1.console.aws.amazon.com/s3/buckets/planwitch-media-planwitchaws0cda4c5e-315279425577?region=ap-south-1&prefix=audio/ |
| **Web app files in S3** | 100 | https://ap-south-1.console.aws.amazon.com/s3/buckets/planwitch-web-planwitchaws0cda4c5e-315279425577?region=ap-south-1 |
| **Step Functions executions** | 14 | https://ap-south-1.console.aws.amazon.com/states/home?region=ap-south-1#/statemachines/view/arn:aws:states:ap-south-1:315279425577ch-itinerary-planwitchaws0cda4c5e |
| **Lambda functions** | 15 | https://ap-south-1.console.aws.amazon.com/lambda/home?region=ap-south-1#/functions?f0=true&n0=false&op=and&v0=planwitch |
| **API Gateway routes** | 17 | https://ap-south-1.console.aws.amazon.com/apigateway/main/apis?region=ap-south-1 |
| **Cognito users** | 1 | https://ap-south-1.console.aws.amazon.com/cognito/v2/idp/user-pools/ap-south-1_UIHNkc9Ce/users?region=ap-south-1 |
| **CloudWatch dashboard** | live | https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=PlanWitch-planwitchaws0cda4c5e |
| **Custom metrics** | 21 | https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#metricsV2:graph=~();namespace=~'PlanWitch*2fAWS |
| **Alarms** | 3 | https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#alarmsV2: |
| **Lambda logs** | 15 groups | https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#logsV2:log-groups |
| **X-Ray service map** | traces | https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#xray:service-map/map |
| **SQS queues** | 7 sent | https://ap-south-1.console.aws.amazon.com/sqs/v3/home?region=ap-south-1#/queues |
| **SNS topic** | 15 published | https://ap-south-1.console.aws.amazon.com/sns/v3/home?region=ap-south-1#/topics |
| **EventBridge bus + rules** | 1 bus | https://ap-south-1.console.aws.amazon.com/events/home?region=ap-south-1#/eventbuses |
| **EventBridge schedule** | 1 | https://ap-south-1.console.aws.amazon.com/scheduler/home?region=ap-south-1#schedules |
| **Amazon Location** | 3 resources | https://ap-south-1.console.aws.amazon.com/location/home?region=ap-south-1#/ |
| **SSM parameters** | 9 | https://ap-south-1.console.aws.amazon.com/systems-manager/parameters?region=ap-south-1 |
| **CloudFormation stack** | 186 resources | https://ap-south-1.console.aws.amazon.com/cloudformation/home?region=ap-south-1#/stacks |
| **IAM roles** | 23 | https://us-east-1.console.aws.amazon.com/iam/home#/roles |
| **Budgets** | 3 | https://us-east-1.console.aws.amazon.com/billing/home#/budgets |
| **EC2 instance** | 1 running | https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1#Instances: |
| **EC2 status page** | live | http://15.206.123.7/ |
| **WAF web ACL** | 4 rules | https://us-east-1.console.aws.amazon.com/wafv2/homev2/web-acls?region=ap-south-1 |
| **Trusted Advisor** | free checks | https://us-east-1.console.aws.amazon.com/trustedadvisor/home#/dashboard |
| **CloudTrail history** | 178 log files | https://ap-south-1.console.aws.amazon.com/cloudtrailv2/home?region=ap-south-1#/events |

**IAM and Budgets are global services** — their consoles always show
`us-east-1` in the URL. That is normal, not a mistake.

## If a page genuinely looks empty

1. Region selector = **Asia Pacific (Mumbai)**.
2. On a DynamoDB table, click **Explore table items**, then **Run** — it does
   not always auto-load.
3. In S3, open the bucket and then the folder (`uploads/`, `audio/`).
4. CloudWatch metrics only appear under the **PlanWitch/AWS** custom namespace,
   and can lag 2–5 minutes.
