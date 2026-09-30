// SQS consumer. Records each job in DynamoDB and reports partial batch failures so
// only the genuinely failed messages are retried (then land in the DLQ).
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, id, metric, track } from './_lib.mjs';

export const handler = async (event) => {
  const batchItemFailures = [];

  for (const record of event.Records || []) {
    try {
      const msg = JSON.parse(record.body);
      await ddb.send(new PutCommand({
        TableName: process.env.JOBS_TABLE,
        Item: {
          jobId: msg.jobId || id('job'),
          type: msg.type || 'unknown',
          userId: msg.userId || 'demo-user',
          payload: msg,
          messageId: record.messageId,
          receiveCount: Number(record.attributes?.ApproximateReceiveCount ?? 1),
          processedAt: new Date().toISOString(),
          expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        },
      }));
      await metric('JobProcessed', 1, 'Count', { Type: msg.type || 'unknown' });
      await track('job_processed', { type: msg.type, jobId: msg.jobId });
    } catch (e) {
      console.error('job_failed', record.messageId, e);
      await metric('JobFailed');
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
