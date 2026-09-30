// POST /media/upload-url -- presigned S3 PUT so the app uploads trip photos directly.
// POST /media/analyze    -- Rekognition labels + moderation on an uploaded object.
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  RekognitionClient, DetectLabelsCommand,
  DetectModerationLabelsCommand, DetectTextCommand,
} from '@aws-sdk/client-rekognition';
import { ok, fail, parseBody, id, metric, track, userIdOf, REGION } from './_lib.mjs';

const s3 = new S3Client({ region: REGION });
const rekognition = new RekognitionClient({ region: REGION });
const Bucket = process.env.UPLOADS_BUCKET;

export const handler = async (event) => {
  try {
    const path = event.rawPath || '';
    const body = parseBody(event);
    const userId = userIdOf(event, body);

    if (path.endsWith('/upload-url')) {
      const ext = (body.contentType || 'image/jpeg').split('/')[1] || 'jpg';
      const key = `uploads/${userId}/${id('photo')}.${ext}`;
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket, Key: key, ContentType: body.contentType || 'image/jpeg' }),
        { expiresIn: 900 },
      );
      await metric('UploadUrlIssued');
      return ok({ ok: true, key, uploadUrl, method: 'PUT', expiresInSeconds: 900 });
    }

    if (path.endsWith('/analyze')) {
      const Key = body.key;
      if (!Key) return ok({ ok: false, error: 'key required (from /media/upload-url)' }, 400);
      const Image = { S3Object: { Bucket, Name: Key } };

      const [labels, moderation, text] = await Promise.all([
        rekognition.send(new DetectLabelsCommand({ Image, MaxLabels: 15, MinConfidence: 70 })),
        rekognition.send(new DetectModerationLabelsCommand({ Image, MinConfidence: 70 })).catch(() => null),
        rekognition.send(new DetectTextCommand({ Image })).catch(() => null),
      ]);

      const viewUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }), { expiresIn: 3600 });

      await metric('ImageAnalysed');
      await track('image_analysed', { userId, key: Key });
      return ok({
        ok: true,
        key: Key,
        viewUrl,
        labels: (labels.Labels || []).map((l) => ({ name: l.Name, confidence: Math.round(l.Confidence) })),
        safe: !(moderation?.ModerationLabels?.length),
        moderation: (moderation?.ModerationLabels || []).map((m) => m.Name),
        detectedText: (text?.TextDetections || []).filter((t) => t.Type === 'LINE').map((t) => t.DetectedText),
      });
    }

    return ok({ ok: false, error: 'use /media/upload-url or /media/analyze' }, 404);
  } catch (e) {
    return fail(e);
  }
};
