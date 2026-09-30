// POST /translate -- Amazon Translate, with Comprehend auto-detecting the source language.
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { ComprehendClient, DetectDominantLanguageCommand, DetectSentimentCommand } from '@aws-sdk/client-comprehend';
import { ok, fail, parseBody, metric, REGION } from './_lib.mjs';

const translate = new TranslateClient({ region: REGION });
const comprehend = new ComprehendClient({ region: REGION });

export const handler = async (event) => {
  try {
    const { text, to = 'hi', from } = parseBody(event);
    if (!text) return ok({ ok: false, error: 'text required' }, 400);

    let source = from;
    let detected = null;
    if (!source) {
      const d = await comprehend.send(new DetectDominantLanguageCommand({ Text: text.slice(0, 4500) }));
      detected = d.Languages?.[0] || null;
      source = detected?.LanguageCode || 'auto';
    }

    const r = await translate.send(new TranslateTextCommand({
      Text: text, SourceLanguageCode: source, TargetLanguageCode: to,
    }));

    let sentiment = null;
    try {
      const s = await comprehend.send(new DetectSentimentCommand({
        Text: text.slice(0, 4500), LanguageCode: (source === 'auto' ? 'en' : source).slice(0, 2),
      }));
      sentiment = { sentiment: s.Sentiment, scores: s.SentimentScore };
    } catch { /* Comprehend supports a subset of languages; skip quietly. */ }

    await metric('TextTranslated');
    return ok({
      ok: true,
      from: r.SourceLanguageCode,
      to: r.TargetLanguageCode,
      detected,
      sentiment,
      translated: r.TranslatedText,
    });
  } catch (e) {
    return fail(e);
  }
};
