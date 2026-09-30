// POST /ai/itinerary -- synchronous itinerary generation on Amazon Bedrock.
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { ddb, ok, fail, parseBody, id, metric, track, userIdOf, REGION } from './_lib.mjs';

const bedrock = new BedrockRuntimeClient({ region: REGION });
const sns = new SNSClient({ region: REGION });

const SYSTEM = `You are PlanWitch, a travel itinerary planner.
Reply with STRICT JSON only, no markdown fences, matching:
{"destination":string,"summary":string,"days":[{"day":number,"title":string,
"morning":string,"afternoon":string,"evening":string,"estimatedCost":string}],
"packingTips":[string],"localEtiquette":[string]}`;

export const buildPrompt = (b) => {
  const nights = b.nights ?? b.days ?? 3;
  return `Plan a ${nights}-day trip to ${b.destination || 'Goa, India'}.
Travellers: ${b.travellers ?? 2}. Budget: ${b.budget || 'mid-range'}.
Interests: ${(b.interests || ['food', 'culture']).join(', ')}.
Pace: ${b.pace || 'balanced'}. Currency: ${b.currency || 'INR'}.`;
};

export const handler = async (event) => {
  const started = Date.now();
  try {
    const body = parseBody(event);
    const userId = userIdOf(event, body);
    const modelId = body.modelId || process.env.BEDROCK_MODEL_ID;

    const res = await bedrock.send(new ConverseCommand({
      modelId,
      system: [{ text: SYSTEM }],
      messages: [{ role: 'user', content: [{ text: buildPrompt(body) }] }],
      inferenceConfig: { maxTokens: 3000, temperature: 0.7 },
    }));

    const text = res.output?.message?.content?.map((c) => c.text).filter(Boolean).join('\n') || '';
    let itinerary;
    try {
      itinerary = JSON.parse(text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
    } catch {
      itinerary = { raw: text, parseError: true };
    }

    const tripId = id('trip');
    await ddb.send(new PutCommand({
      TableName: process.env.TRIPS_TABLE,
      Item: {
        userId,
        tripId,
        destination: body.destination || itinerary?.destination || 'Unknown',
        itinerary,
        source: 'bedrock',
        modelId,
        status: 'generated',
        tokensIn: res.usage?.inputTokens ?? null,
        tokensOut: res.usage?.outputTokens ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }));

    if (process.env.EVENTS_TOPIC_ARN) {
      await sns.send(new PublishCommand({
        TopicArn: process.env.EVENTS_TOPIC_ARN,
        Subject: 'PlanWitch: itinerary generated',
        Message: JSON.stringify({ userId, tripId, destination: body.destination, modelId }, null, 2),
      }));
    }

    const latency = Date.now() - started;
    await metric('ItineraryGenerated');
    await metric('BedrockLatency', latency, 'Milliseconds', { Model: String(modelId) });
    await metric('BedrockTokens', (res.usage?.totalTokens ?? 0), 'Count');
    await track('itinerary_generated', { userId, tripId, modelId, latency });

    return ok({ ok: true, tripId, modelId, latencyMs: latency, usage: res.usage ?? null, itinerary });
  } catch (e) {
    await metric('ItineraryFailed');
    if (String(e?.name).includes('AccessDenied') || String(e?.message).includes('access')) {
      return fail(new Error(
        `Bedrock rejected the call (${e.name}). Enable model access for ` +
        `${process.env.BEDROCK_MODEL_ID} in the Bedrock console -> Model access, then retry. Original: ${e.message}`
      ), 403);
    }
    return fail(e);
  }
};
