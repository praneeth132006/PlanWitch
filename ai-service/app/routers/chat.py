import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.auth import Identity, get_identity
from app.fallback_responses import (
    BOOKING_FALLBACK_RESPONSE,
    EMERGENCY_RESPONSE,
    GENERIC_ERROR_RESPONSE,
    SAFETY_BLOCK_RESPONSE,
)
from app.intent.classifier import classify_intent
from app.llm.gemini_client import GeminiClient, GeminiSafetyBlockError, GeminiUnavailableError
from app.llm.tools import SEARCH_NEARBY_PLACES_TOOL
from app.logging_config import timed_request
from app.memory.session_store import get_session_store
from app.models.schemas import ChatRequest
import app.prompts.templates  # noqa: F401  (registers chat_system template)
from app.prompts.registry import get_registry
from app.scheduling.gaps import find_free_windows

router = APIRouter()

_client = GeminiClient(tools=[SEARCH_NEARBY_PLACES_TOOL])


def _sse(chunk: dict) -> str:
    return f"data: {json.dumps(chunk)}\n\n"


async def _chat_stream(payload: ChatRequest, identity: Identity):
    session_key = identity.uid or f"guest:{payload.session_id}"
    store = get_session_store()
    session = store.get(session_key)

    intent = classify_intent(payload.message)
    session.append("user", payload.message)

    with timed_request(uid=identity.uid, session_id=payload.session_id, endpoint="/ai/chat", intent=intent) as ctx:
        yield _sse({"type": "intent", "intent": intent})

        if intent == "emergency_intent":
            yield _sse({"type": "text", "text": EMERGENCY_RESPONSE})
            session.append("assistant", EMERGENCY_RESPONSE)
            ctx["model"] = "none (short-circuited)"
            yield _sse({"type": "done"})
            return

        if intent == "booking_intent":
            yield _sse({"type": "text", "text": BOOKING_FALLBACK_RESPONSE})
            session.append("assistant", BOOKING_FALLBACK_RESPONSE)
            ctx["model"] = "none (short-circuited)"
            yield _sse({"type": "done"})
            return

        free_windows = find_free_windows([slot.model_dump() for slot in payload.itinerary])
        system_prompt = get_registry().latest("chat_system").render(
            trip_context=payload.trip_context.model_dump(),
            user_profile=payload.user_profile,
            free_window_hints=[w.as_hint() for w in free_windows],
        )

        contents = [
            {"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["text"]}]}
            for m in session.messages
        ]

        full_reply = []
        try:
            async for event in _client.stream_chat(contents, system_instruction=system_prompt):
                if event.type == "text":
                    full_reply.append(event.text)
                    yield _sse({"type": "text", "text": event.text})
                elif event.type == "tool_call":
                    yield _sse({"type": "tool_call", "tool_name": event.tool_name})
                elif event.type == "tool_result":
                    yield _sse({"type": "tool_result", "tool_name": event.tool_name})
        except GeminiSafetyBlockError:
            yield _sse({"type": "text", "text": SAFETY_BLOCK_RESPONSE})
            full_reply = [SAFETY_BLOCK_RESPONSE]
            ctx["blocked"] = True
        except GeminiUnavailableError as exc:
            yield _sse({"type": "text", "text": GENERIC_ERROR_RESPONSE})
            full_reply = [GENERIC_ERROR_RESPONSE]
            ctx["upstream_error"] = str(exc)

        session.append("assistant", "".join(full_reply))
        yield _sse({"type": "done"})


@router.post("/ai/chat")
async def chat(payload: ChatRequest, identity: Identity = Depends(get_identity)):
    return StreamingResponse(_chat_stream(payload, identity), media_type="text/event-stream")
