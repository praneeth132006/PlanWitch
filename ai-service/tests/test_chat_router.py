import json

from fastapi.testclient import TestClient

from app.llm.gemini_client import StreamEvent
from app.main import app
import app.routers.chat as chat_module

client = TestClient(app)


def _parse_sse(body: str) -> list[dict]:
    events = []
    for line in body.splitlines():
        if line.startswith("data:"):
            events.append(json.loads(line[len("data:"):].strip()))
    return events


def test_emergency_intent_short_circuits_without_calling_gemini(monkeypatch):
    async def _should_not_be_called(*args, **kwargs):
        raise AssertionError("Gemini should not be called for emergency intent")
        yield  # pragma: no cover

    monkeypatch.setattr(chat_module._client, "stream_chat", _should_not_be_called)

    response = client.post(
        "/ai/chat",
        json={"message": "I lost my passport, help me!", "session_id": "s1"},
    )
    assert response.status_code == 200
    events = _parse_sse(response.text)
    assert events[0] == {"type": "intent", "intent": "emergency_intent"}
    assert any(e["type"] == "text" and "emergency services" in e["text"] for e in events)
    assert events[-1] == {"type": "done"}


def test_booking_intent_gets_fallback_message(monkeypatch):
    async def _should_not_be_called(*args, **kwargs):
        raise AssertionError("Gemini should not be called for booking intent")
        yield  # pragma: no cover

    monkeypatch.setattr(chat_module._client, "stream_chat", _should_not_be_called)

    response = client.post(
        "/ai/chat",
        json={"message": "Please book a hotel for me in Goa", "session_id": "s2"},
    )
    events = _parse_sse(response.text)
    assert events[0] == {"type": "intent", "intent": "booking_intent"}
    assert any("can't complete bookings directly" in e.get("text", "") for e in events)


def test_discovery_intent_streams_mocked_model_text(monkeypatch):
    async def _fake_stream_chat(contents, system_instruction=None, temperature=0.7):
        yield StreamEvent(type="text", text="Rome has ")
        yield StreamEvent(type="text", text="wonderful museums.")

    monkeypatch.setattr(chat_module._client, "stream_chat", _fake_stream_chat)

    response = client.post(
        "/ai/chat",
        json={"message": "What should I see in Rome?", "session_id": "s3"},
    )
    events = _parse_sse(response.text)
    assert events[0] == {"type": "intent", "intent": "discovery_intent"}
    text_events = [e for e in events if e["type"] == "text"]
    assert "".join(e["text"] for e in text_events) == "Rome has wonderful museums."
    assert events[-1] == {"type": "done"}


def test_discovery_intent_surfaces_tool_call_events(monkeypatch):
    async def _fake_stream_chat(contents, system_instruction=None, temperature=0.7):
        yield StreamEvent(type="tool_call", tool_name="search_nearby_places")
        yield StreamEvent(type="tool_result", tool_name="search_nearby_places")
        yield StreamEvent(type="text", text="Try Om Beach.")

    monkeypatch.setattr(chat_module._client, "stream_chat", _fake_stream_chat)

    response = client.post(
        "/ai/chat",
        json={"message": "What's nearby right now?", "session_id": "s4"},
    )
    events = _parse_sse(response.text)
    assert any(e["type"] == "tool_call" for e in events)
    assert any(e["type"] == "tool_result" for e in events)
