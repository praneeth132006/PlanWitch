// DynamoDB Streams consumer: every write to the trips table lands here.
// Publishes a notification when a trip first reaches a completed state.
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { metric, track, REGION } from './_lib.mjs';

const sns = new SNSClient({ region: REGION });
const plain = (img) => {
  // Stream images are DynamoDB-typed; pull out just the scalars we care about.
  const out = {};
  for (const [k, v] of Object.entries(img || {})) {
    if (v.S !== undefined) out[k] = v.S;
    else if (v.N !== undefined) out[k] = Number(v.N);
    else if (v.BOOL !== undefined) out[k] = v.BOOL;
  }
  return out;
};

export const handler = async (event) => {
  const batchItemFailures = [];

  for (const record of event.Records || []) {
    try {
      const newImage = plain(record.dynamodb?.NewImage);
      const oldImage = plain(record.dynamodb?.OldImage);

      await metric('TripStreamEvent', 1, 'Count', { EventName: record.eventName });
      await track('trip_stream_event', {
        eventName: record.eventName,
        userId: newImage.userId || oldImage.userId,
        tripId: newImage.tripId || oldImage.tripId,
        status: newImage.status,
      });

      const becameComplete =
        newImage.status && newImage.status !== oldImage.status &&
        ['generated', 'workflow-complete', 'confirmed'].includes(newImage.status);

      if (becameComplete && process.env.EVENTS_TOPIC_ARN) {
        await sns.send(new PublishCommand({
          TopicArn: process.env.EVENTS_TOPIC_ARN,
          Subject: `PlanWitch: trip ${newImage.status}`,
          Message: JSON.stringify({
            trigger: 'dynamodb-stream',
            eventName: record.eventName,
            userId: newImage.userId,
            tripId: newImage.tripId,
            destination: newImage.destination,
            status: newImage.status,
          }, null, 2),
        }));
      }
    } catch (e) {
      console.error('stream_record_failed', record.eventID, e);
      batchItemFailures.push({ itemIdentifier: record.eventID });
    }
  }

  return { batchItemFailures };
};
