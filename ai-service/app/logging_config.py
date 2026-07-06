import json
import logging
import sys
import time
import uuid
from contextlib import contextmanager
from typing import Any, Optional


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        extra = getattr(record, "extra_fields", None)
        if extra:
            payload.update(extra)
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)


logger = logging.getLogger("ai_service")


def log_event(message: str, **fields: Any) -> None:
    logger.info(message, extra={"extra_fields": fields})


@contextmanager
def timed_request(request_id: Optional[str] = None, **base_fields: Any):
    """Context manager that logs a single structured line with latency_ms on exit.

    Usage:
        with timed_request(uid=uid, endpoint="/ai/chat", intent=intent) as ctx:
            ... do work ...
            ctx["model"] = "gemini-2.0-flash"
    """
    rid = request_id or str(uuid.uuid4())
    fields: dict[str, Any] = {"request_id": rid, **base_fields}
    start = time.perf_counter()
    error: Optional[str] = None
    try:
        yield fields
    except Exception as exc:
        error = str(exc)
        raise
    finally:
        fields["latency_ms"] = round((time.perf_counter() - start) * 1000, 1)
        if error:
            fields["error"] = error
        log_event("request_completed", **fields)
