// EventBridge Scheduler target: a daily digest that scans upcoming trips,
// publishes a summary to SNS and pushes gauges to CloudWatch.
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { ddb, metric, track, REGION } from './_lib.mjs';

const sns = new SNSClient({ region: REGION });

export const handler = async (event) => {
  const scan = await ddb.send(new ScanCommand({ TableName: process.env.TRIPS_TABLE, Limit: 200 }));
  const trips = scan.Items || [];

  const now = Date.now();
  const upcoming = trips.filter((t) => t.startDate && Date.parse(t.startDate) > now);
  const byStatus = trips.reduce((acc, t) => {
    acc[t.status || 'unknown'] = (acc[t.status || 'unknown'] || 0) + 1;
    return acc;
  }, {});

  const digest = {
    generatedAt: new Date().toISOString(),
    totalTrips: trips.length,
    upcomingTrips: upcoming.length,
    byStatus,
    nextDepartures: upcoming
      .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate))
      .slice(0, 5)
      .map((t) => ({ destination: t.destination, startDate: t.startDate, userId: t.userId })),
  };

  await metric('TotalTrips', trips.length, 'Count');
  await metric('UpcomingTrips', upcoming.length, 'Count');
  await metric('DigestRun');
  await track('digest_run', digest);

  if (process.env.EVENTS_TOPIC_ARN) {
    await sns.send(new PublishCommand({
      TopicArn: process.env.EVENTS_TOPIC_ARN,
      Subject: `PlanWitch daily digest: ${upcoming.length} upcoming trips`,
      Message: JSON.stringify(digest, null, 2),
    }));
  }

  console.log('digest', JSON.stringify(digest));
  return digest;
};
