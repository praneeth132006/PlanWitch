// GET /me -- only reachable with a valid Cognito access token (JWT authorizer on the route).
import { ok, fail, claims, metric } from './_lib.mjs';

export const handler = async (event) => {
  try {
    const c = claims(event);
    await metric('AuthorizedRequest');
    return ok({
      ok: true,
      authenticated: Boolean(c),
      sub: c?.sub ?? null,
      email: c?.email ?? null,
      username: c?.['cognito:username'] ?? null,
      tokenUse: c?.token_use ?? null,
      issuer: c?.iss ?? null,
    });
  } catch (e) {
    return fail(e);
  }
};
