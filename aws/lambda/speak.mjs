// POST /speak -- Amazon Polly turns itinerary text into an audio guide, stored on S3
// and handed back as a short-lived presigned URL.
import { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand } from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ok, fail, parseBody, id, metric, track, REGION } from './_lib.mjs';

const polly = new PollyClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

export const handler = async (event) => {
  try {
    const { text, voice = 'Kajal', engine = 'neural', language = 'en-IN', listVoices } = parseBody(event);

    if (listVoices) {
      const v = await polly.send(new DescribeVoicesCommand({ Engine: engine }));
      return ok({ ok: true, voices: (v.Voices || []).map((x) => ({ id: x.Id, lang: x.LanguageCode, gender: x.Gender })) });
    }

    if (!text) return ok({ ok: false, error: 'text required' }, 400);

    const synth = (useEngine) => polly.send(new SynthesizeSpeechCommand({
      Text: text.slice(0, 3000),
      OutputFormat: 'mp3',
      VoiceId: voice,
      Engine: useEngine,
      LanguageCode: language,
    }));

    // Not every voice has a neural version (Aditi, for one). Rather than fail,
    // drop to the standard engine and report which one actually ran.
    let speech;
    let engineUsed = engine;
    try {
      speech = await synth(engine);
    } catch (e) {
      if (engine === 'neural') {
        console.warn('neural_unavailable_falling_back', voice, String(e?.message || e));
        engineUsed = 'standard';
        speech = await synth('standard');
      } else {
        throw e;
      }
    }

    const bytes = await speech.AudioStream.transformToByteArray();
    const key = `audio/${id('guide')}.mp3`;
    const Bucket = process.env.MEDIA_BUCKET;

    await s3.send(new PutObjectCommand({
      Bucket, Key: key, Body: Buffer.from(bytes), ContentType: 'audio/mpeg',
    }));

    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: 3600 });

    await metric('SpeechSynthesized');
    await track('speech_synthesized', { voice, chars: text.length });
    return ok({ ok: true, key, bytes: bytes.length, voice, engine: engineUsed, requestedEngine: engine, url, expiresInSeconds: 3600 });
  } catch (e) {
    return fail(e);
  }
};
