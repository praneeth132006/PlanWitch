from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException

from app.config import get_settings

_firebase_app = None


@dataclass
class Identity:
    uid: Optional[str]
    is_authenticated: bool


def _get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    settings = get_settings()
    if not settings.firebase_service_account_path:
        return None

    import firebase_admin
    from firebase_admin import credentials

    cred = credentials.Certificate(settings.firebase_service_account_path)
    _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


async def get_identity(authorization: Optional[str] = Header(default=None)) -> Identity:
    """Resolves caller identity from a Firebase ID token.

    If no Firebase service account is configured (ALLOW_DEV_AUTH / local dev),
    verification is skipped and callers fall back to a client-supplied
    sessionId for continuity, matching how the app already treats guest users.
    """
    settings = get_settings()
    app = _get_firebase_app()

    if app is None:
        if settings.allow_dev_auth:
            return Identity(uid=None, is_authenticated=False)
        raise HTTPException(status_code=500, detail="Auth is not configured on this server")

    if not authorization or not authorization.startswith("Bearer "):
        return Identity(uid=None, is_authenticated=False)

    token = authorization.removeprefix("Bearer ").strip()

    from firebase_admin import auth as firebase_auth

    try:
        decoded = firebase_auth.verify_id_token(token, app=app)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid auth token") from exc

    return Identity(uid=decoded.get("uid"), is_authenticated=True)
