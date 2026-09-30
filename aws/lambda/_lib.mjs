// Shared helpers for every PlanWitch AWS Lambda handler.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { FirehoseClient, PutRecordCommand } from '@aws-sdk/client-firehose';

export const REGION = process.env.AWS_REGION || 'ap-south-1';

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

const cw = new CloudWatchClient({ region: REGION });
const firehose = new FirehoseClient({ region: REGION });

const CORS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,authorization',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export const ok = (body, status = 200) => ({
  statusCode: status,
  headers: CORS,
  body: JSON.stringify(body),
});

export const fail = (err, status = 500) => {
  console.error('handler_error', err);
  return {
    statusCode: status,
    headers: CORS,
    body: JSON.stringify({ ok: false, error: String(err?.message || err) }),
  };
};

export const parseBody = (event) => {
  if (!event?.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const qs = (event, key, dflt = undefined) => event?.queryStringParameters?.[key] ?? dflt;

export const id = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Emit a custom CloudWatch metric. Never throws -- telemetry must not break a request. */
export const metric = async (name, value = 1, unit = 'Count', dims = {}) => {
  try {
    await cw.send(new PutMetricDataCommand({
      Namespace: 'PlanWitch/AWS',
      MetricData: [{
        MetricName: name,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: Object.entries(dims).map(([Name, Value]) => ({ Name, Value: String(Value) })),
      }],
    }));
  } catch (e) {
    console.warn('metric_failed', name, String(e?.message || e));
  }
};

/** Stream an analytics event to Kinesis Data Firehose -> S3 (queryable via Athena). */
export const track = async (eventName, payload = {}) => {
  const stream = process.env.ANALYTICS_STREAM;
  if (!stream) return;
  try {
    await firehose.send(new PutRecordCommand({
      DeliveryStreamName: stream,
      Record: { Data: Buffer.from(JSON.stringify({ event: eventName, ts: new Date().toISOString(), ...payload }) + '\n') },
    }));
  } catch (e) {
    console.warn('track_failed', eventName, String(e?.message || e));
  }
};

/** Cognito JWT claims injected by the API Gateway authorizer, when the route is protected. */
export const claims = (event) => event?.requestContext?.authorizer?.jwt?.claims || null;

export const userIdOf = (event, body = {}) =>
  claims(event)?.sub || body.userId || qs(event, 'userId') || 'demo-user';
