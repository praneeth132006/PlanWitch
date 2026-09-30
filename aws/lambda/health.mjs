// GET /health -- liveness probe plus a live inventory of the AWS services this stack wires up.
import { ok, fail, metric, track, REGION } from './_lib.mjs';

const SERVICES = [
  'CloudFormation', 'IAM', 'KMS', 'Lambda', 'API Gateway (HTTP API)', 'DynamoDB',
  'S3', 'CloudFront', 'Cognito (User + Identity Pool)', 'Amazon Bedrock',
  'Amazon Translate', 'Amazon Comprehend', 'Amazon Polly', 'Amazon Rekognition',
  'Amazon Location Service', 'SES v2', 'SNS', 'SQS', 'Step Functions',
  'DynamoDB Streams',
  'EventBridge (bus + rules)', 'EventBridge Scheduler',
  'SSM Parameter Store', 'Secrets Manager',
  'Kinesis Data Firehose', 'AWS Glue', 'Amazon Athena', 'CloudWatch',
  'AWS X-Ray', 'CloudTrail', 'AWS Budgets',
];

export const handler = async (event) => {
  try {
    await metric('HealthCheck');
    await track('health_check', { path: event?.rawPath });
    return ok({
      ok: true,
      app: 'PlanWitch',
      stack: process.env.STACK_NAME,
      region: REGION,
      runtime: process.version,
      serviceCount: SERVICES.length,
      services: SERVICES,
      endpoints: [
        'GET  /health',
        'GET  /trips?userId=',
        'POST /trips',
        'DELETE /trips/{tripId}?userId=',
        'POST /ai/itinerary          (Bedrock, synchronous)',
        'POST /ai/itinerary/async    (Step Functions workflow)',
        'GET  /ai/itinerary/status?executionArn=',
        'GET  /places?q=             (Amazon Location)',
        'GET  /route?from=lon,lat&to=lon,lat',
        'POST /translate             (Translate + Comprehend)',
        'POST /speak                 (Polly -> S3 presigned mp3)',
        'POST /media/upload-url      (S3 presigned PUT)',
        'POST /media/analyze         (Rekognition labels)',
        'POST /auth/otp              (SES email OTP)',
        'POST /auth/otp/verify',
        'GET  /me                    (Cognito JWT protected)',
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return fail(e);
  }
};
