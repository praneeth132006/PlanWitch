// POST /auth/otp        -- issue a 6-digit code, store it in DynamoDB under a TTL, mail it with SES v2.
// POST /auth/otp/verify -- check the code and burn it.
import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { ddb, ok, fail, parseBody, metric, track, REGION } from './_lib.mjs';

const ses = new SESv2Client({ region: REGION });
const TABLE = process.env.OTP_TABLE;
const TTL_SECONDS = 600;

export const handler = async (event) => {
  try {
    const path = event.rawPath || '';
    const { email, code } = parseBody(event);
    if (!email) return ok({ ok: false, error: 'email required' }, 400);

    if (path.endsWith('/verify')) {
      const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { email } }));
      if (!r.Item) return ok({ ok: false, error: 'no code issued, or it expired' }, 404);
      if (String(r.Item.code) !== String(code)) {
        await metric('OtpRejected');
        return ok({ ok: false, error: 'incorrect code' }, 401);
      }
      await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { email } }));
      await metric('OtpVerified');
      return ok({ ok: true, verified: true, email });
    }

    const generated = String(Math.floor(100000 + Math.random() * 900000));
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        email,
        code: generated,
        createdAt: new Date().toISOString(),
        expiresAt: Math.floor(Date.now() / 1000) + TTL_SECONDS,
      },
    }));

    let delivery = 'skipped';
    let note = null;
    const sender = process.env.SES_SENDER;
    if (sender) {
      try {
        await ses.send(new SendEmailCommand({
          FromEmailAddress: sender,
          Destination: { ToAddresses: [email] },
          Content: {
            Simple: {
              Subject: { Data: 'Your PlanWitch verification code' },
              Body: {
                Text: { Data: `Your PlanWitch code is ${generated}. It expires in 10 minutes.` },
                Html: { Data: `<p>Your PlanWitch code is <strong style="font-size:20px">${generated}</strong>.</p><p>It expires in 10 minutes.</p>` },
              },
            },
          },
        }));
        delivery = 'sent';
      } catch (e) {
        // SES starts in sandbox: both sender and recipient must be verified identities.
        delivery = 'failed';
        note = `SES refused delivery: ${e.message}. In the SES sandbox the recipient must also be a verified identity.`;
      }
    }

    await metric('OtpIssued');
    await track('otp_issued', { email, delivery });

    const debug = process.env.EXPOSE_OTP === 'true';
    return ok({
      ok: true,
      email,
      delivery,
      note,
      expiresInSeconds: TTL_SECONDS,
      ...(debug ? { code: generated, debugNote: 'code returned because EXPOSE_OTP=true (demo only)' } : {}),
    });
  } catch (e) {
    return fail(e);
  }
};
