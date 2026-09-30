// Step Functions task 1: draft the itinerary on Bedrock.
//
// If Bedrock is unavailable -- on this account it is blocked outright, and in
// general it can throttle or lose model access -- the workflow must still make
// progress rather than dying at the first step. We fall back to a deterministic
// template and flag the result as degraded, so downstream steps and the UI can
// tell the difference. The fallback is never presented as model output.
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { metric, REGION, id } from './_lib.mjs';
import { buildPrompt } from './ai-itinerary.mjs';

const bedrock = new BedrockRuntimeClient({ region: REGION });

const SYSTEM = `You are PlanWitch. Reply with STRICT JSON only (no markdown fences):
{"destination":string,"summary":string,"days":[{"day":number,"title":string,
"morning":string,"afternoon":string,"evening":string,"estimatedCost":string}]}`;

/** A plain, clearly-labelled itinerary skeleton. Not model output. */
const templateItinerary = (input, reason) => {
  const destination = input.destination || 'Goa, India';
  const nights = Math.min(Math.max(Number(input.nights ?? input.days ?? 3), 1), 7);
  const interests = (input.interests || ['local food', 'sightseeing']).join(', ');

  return {
    destination,
    degraded: true,
    degradedReason: reason,
    summary: `A ${nights}-day outline for ${destination}, focused on ${interests}. `
      + 'Generated from a built-in template because the AI model was unavailable.',
    days: Array.from({ length: nights }, (_, i) => ({
      day: i + 1,
      title: i === 0 ? 'Arrival and first impressions'
        : i === nights - 1 ? 'Last sights and departure'
        : `Exploring ${destination} — day ${i + 1}`,
      morning: i === 0 ? 'Arrive, check in, and walk the area around your stay.'
        : 'Start early at the main sights before the crowds build.',
      afternoon: `Time for ${interests}.`,
      evening: i === nights - 1 ? 'Pack, and a final meal somewhere local.'
        : 'Dinner at a well-reviewed local restaurant.',
      estimatedCost: 'n/a (template)',
    })),
  };
};

export const handler = async (input) => {
  const modelId = process.env.BEDROCK_MODEL_ID;
  const started = Date.now();
  let itinerary;
  let usage = null;
  let degradedReason = null;

  try {
    const res = await bedrock.send(new ConverseCommand({
      modelId,
      system: [{ text: SYSTEM }],
      messages: [{ role: 'user', content: [{ text: buildPrompt(input) }] }],
      inferenceConfig: { maxTokens: 3000, temperature: 0.7 },
    }));

    const text = res.output?.message?.content?.map((c) => c.text).filter(Boolean).join('\n') || '';
    usage = res.usage ?? null;
    try {
      itinerary = JSON.parse(text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
    } catch {
      itinerary = { raw: text, parseError: true };
    }
    await metric('WorkflowGenerateStep', Date.now() - started, 'Milliseconds');
  } catch (e) {
    degradedReason = `${e.name || 'Error'}: ${e.message}`;
    console.warn('bedrock_unavailable_using_template', degradedReason);
    itinerary = templateItinerary(input, degradedReason);
    await metric('WorkflowGenerateDegraded');
  }

  return {
    ...input,
    tripId: input.tripId || id('trip'),
    destination: input.destination || itinerary?.destination || 'Goa, India',
    modelId,
    itinerary,
    summary: itinerary?.summary || '',
    degraded: Boolean(degradedReason),
    degradedReason,
    usage,
  };
};
