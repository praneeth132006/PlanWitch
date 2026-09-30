// Step Functions task 2: enrich the draft -- Comprehend sentiment/key phrases,
// Translate into the traveller's language, Amazon Location geocode of the destination.
import { ComprehendClient, DetectSentimentCommand, DetectKeyPhrasesCommand } from '@aws-sdk/client-comprehend';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { LocationClient, SearchPlaceIndexForTextCommand } from '@aws-sdk/client-location';
import { metric, REGION } from './_lib.mjs';

const comprehend = new ComprehendClient({ region: REGION });
const translate = new TranslateClient({ region: REGION });
const location = new LocationClient({ region: REGION });

export const handler = async (input) => {
  const summary = (input.summary || '').slice(0, 4500) || 'A pleasant trip.';
  const target = input.language || 'hi';
  const out = { ...input, enrichment: {} };

  const settle = async (label, fn) => {
    try {
      out.enrichment[label] = await fn();
    } catch (e) {
      // One failing enrichment must not sink the whole workflow.
      out.enrichment[label] = { error: String(e?.message || e) };
    }
  };

  await settle('sentiment', async () => {
    const r = await comprehend.send(new DetectSentimentCommand({ Text: summary, LanguageCode: 'en' }));
    return { sentiment: r.Sentiment, scores: r.SentimentScore };
  });

  await settle('keyPhrases', async () => {
    const r = await comprehend.send(new DetectKeyPhrasesCommand({ Text: summary, LanguageCode: 'en' }));
    return (r.KeyPhrases || []).slice(0, 10).map((k) => k.Text);
  });

  await settle('translatedSummary', async () => {
    const r = await translate.send(new TranslateTextCommand({
      Text: summary, SourceLanguageCode: 'en', TargetLanguageCode: target,
    }));
    return { language: target, text: r.TranslatedText };
  });

  await settle('geo', async () => {
    const r = await location.send(new SearchPlaceIndexForTextCommand({
      IndexName: process.env.PLACE_INDEX_NAME,
      Text: input.destination || 'Goa, India',
      MaxResults: 1,
    }));
    const p = r.Results?.[0]?.Place;
    return p ? { label: p.Label, point: p.Geometry?.Point, country: p.Country } : null;
  });

  await metric('WorkflowEnrichStep');
  return out;
};
