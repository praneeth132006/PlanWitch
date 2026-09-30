// POST /ai/itinerary/async -- hand the job to Step Functions.
// GET  /ai/itinerary/status?executionArn=... -- poll that execution.
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ok, fail, parseBody, qs, id, metric, track, userIdOf, REGION } from './_lib.mjs';

const sfn = new SFNClient({ region: REGION });
const sqs = new SQSClient({ region: REGION });

export const handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || 'POST';

    if (method === 'GET') {
      const arn = qs(event, 'executionArn');
      if (!arn) return ok({ ok: false, error: 'executionArn required' }, 400);
      const r = await sfn.send(new DescribeExecutionCommand({ executionArn: arn }));
      return ok({
        ok: true,
        status: r.status,
        startDate: r.startDate,
        stopDate: r.stopDate ?? null,
        output: r.output ? JSON.parse(r.output) : null,
      });
    }

    const body = parseBody(event);
    const userId = userIdOf(event, body);
    const jobId = id('job');

    const exec = await sfn.send(new StartExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      name: jobId,
      input: JSON.stringify({ ...body, userId, jobId }),
    }));

    // Also fan the job onto SQS so the worker Lambda records it independently.
    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.JOBS_QUEUE_URL,
      MessageBody: JSON.stringify({ type: 'itinerary_requested', userId, jobId, destination: body.destination }),
    }));

    await metric('WorkflowStarted');
    await track('workflow_started', { userId, jobId });

    return ok({ ok: true, jobId, executionArn: exec.executionArn, startDate: exec.startDate }, 202);
  } catch (e) {
    return fail(e);
  }
};
