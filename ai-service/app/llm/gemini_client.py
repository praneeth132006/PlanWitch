import json
import logging
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Callable, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger("ai_service")

# NOTE: gemini-2.0-flash / gemini-1.5-pro / gemini-1.5-flash (the chain used
# by the existing src/services/aiService.js) have been retired by Google as
# of this writing — confirmed via a live 404 "no longer available" response.
# This list reflects models actually verified working against ListModels +
# a live generateContent call at build time.
FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-001", "gemini-flash-latest"]

_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiSafetyBlockError(Exception):
    """Raised when Gemini refuses to answer for safety reasons."""


class GeminiUnavailableError(Exception):
    """Raised when every fallback model failed."""


@dataclass
class FunctionCall:
    name: str
    args: dict[str, Any]


@dataclass
class ToolDeclaration:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable[[dict[str, Any]], Any]


@dataclass
class StreamEvent:
    type: str  # "text" | "tool_call" | "tool_result"
    text: str = ""
    tool_name: str = ""
    tool_args: dict[str, Any] = field(default_factory=dict)


def _tools_payload(tools: list[ToolDeclaration]) -> list[dict[str, Any]]:
    if not tools:
        return []
    return [
        {
            "functionDeclarations": [
                {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters,
                }
                for t in tools
            ]
        }
    ]


def _extract_parts(event_json: dict[str, Any]) -> tuple[Optional[str], Optional[FunctionCall]]:
    """Returns (text, function_call) found in one streamed Gemini chunk."""
    feedback = event_json.get("promptFeedback")
    if feedback and feedback.get("blockReason"):
        raise GeminiSafetyBlockError(feedback["blockReason"])

    candidates = event_json.get("candidates") or []
    if not candidates:
        return None, None

    parts = (candidates[0].get("content") or {}).get("parts") or []
    text_chunks = []
    call = None
    for part in parts:
        if "text" in part:
            text_chunks.append(part["text"])
        elif "functionCall" in part:
            fc = part["functionCall"]
            call = FunctionCall(name=fc.get("name", ""), args=fc.get("args", {}) or {})

    text = "".join(text_chunks) if text_chunks else None
    return text, call


async def _stream_once(
    client: httpx.AsyncClient,
    model: str,
    api_key: str,
    contents: list[dict[str, Any]],
    system_instruction: Optional[str],
    tools: list[ToolDeclaration],
    temperature: float,
) -> AsyncGenerator[tuple[Optional[str], Optional[FunctionCall]], None]:
    url = f"{_BASE_URL}/{model}:streamGenerateContent?alt=sse&key={api_key}"

    body: dict[str, Any] = {
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    tools_payload = _tools_payload(tools)
    if tools_payload:
        body["tools"] = tools_payload

    async with client.stream("POST", url, json=body, timeout=30.0) as response:
        if response.status_code != 200:
            error_text = await response.aread()
            raise GeminiUnavailableError(
                f"{model} returned {response.status_code}: {error_text.decode(errors='replace')[:500]}"
            )

        async for line in response.aiter_lines():
            if not line or not line.startswith("data:"):
                continue
            payload = line[len("data:") :].strip()
            if not payload or payload == "[DONE]":
                continue
            try:
                event_json = json.loads(payload)
            except json.JSONDecodeError:
                continue

            text, call = _extract_parts(event_json)
            if text or call:
                yield text, call


class GeminiClient:
    def __init__(self, tools: Optional[list[ToolDeclaration]] = None) -> None:
        self._tools = tools or []
        self._tools_by_name = {t.name: t for t in self._tools}

    async def stream_chat(
        self,
        contents: list[dict[str, Any]],
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Streams a chat turn, transparently executing at most one round of
        tool calls before streaming the model's final natural-language answer.
        """
        settings = get_settings()
        if not settings.gemini_api_key:
            raise GeminiUnavailableError("GEMINI_API_KEY is not configured")

        async with httpx.AsyncClient() as client:
            last_error: Optional[Exception] = None

            for model in FALLBACK_MODELS:
                try:
                    # Buffer the whole turn instead of forwarding text as it
                    # arrives: live testing showed Gemini can stream partial
                    # text and THEN decide to call a tool within the same
                    # turn. Forwarding that pre-call text would leave the
                    # client with a garbled reply (partial answer + a second,
                    # different answer from the tool follow-up). We only know
                    # it's safe to show the text once the turn ends with no
                    # function call — true incremental streaming still
                    # happens on the tool-result follow-up turn below.
                    pending_call: Optional[FunctionCall] = None
                    buffered_text: list[str] = []

                    async for text, call in _stream_once(
                        client, model, settings.gemini_api_key, contents,
                        system_instruction, self._tools, temperature,
                    ):
                        if call is not None:
                            pending_call = call
                        if text:
                            buffered_text.append(text)

                    yielded_any = False

                    if pending_call is not None:
                        async for event in self._handle_tool_call(
                            client, model, settings.gemini_api_key, contents,
                            system_instruction, pending_call, temperature,
                        ):
                            yielded_any = True
                            yield event
                    elif buffered_text:
                        yielded_any = True
                        yield StreamEvent(type="text", text="".join(buffered_text))

                    if yielded_any:
                        return
                    # No content and no error: try next model.
                    last_error = GeminiUnavailableError(f"{model} returned no content")
                except GeminiSafetyBlockError:
                    raise
                except Exception as exc:  # noqa: BLE001 - deliberate fallback boundary
                    logger.warning("gemini_model_failed", extra={"extra_fields": {"model": model, "error": str(exc)}})
                    last_error = exc
                    continue

            raise GeminiUnavailableError(str(last_error) if last_error else "All models failed")

    async def _handle_tool_call(
        self,
        client: httpx.AsyncClient,
        model: str,
        api_key: str,
        contents: list[dict[str, Any]],
        system_instruction: Optional[str],
        call: FunctionCall,
        temperature: float,
    ) -> AsyncGenerator[StreamEvent, None]:
        yield StreamEvent(type="tool_call", tool_name=call.name, tool_args=call.args)

        tool = self._tools_by_name.get(call.name)
        if tool is None:
            result: Any = {"error": f"Unknown tool {call.name}"}
        else:
            try:
                result = tool.handler(call.args)
            except Exception as exc:  # noqa: BLE001
                result = {"error": str(exc)}

        yield StreamEvent(type="tool_result", tool_name=call.name, tool_args=call.args)

        follow_up_contents = contents + [
            {"role": "model", "parts": [{"functionCall": {"name": call.name, "args": call.args}}]},
            {
                "role": "function",
                "parts": [{"functionResponse": {"name": call.name, "response": {"result": result}}}],
            },
        ]

        async for text, _ in _stream_once(
            client, model, api_key, follow_up_contents, system_instruction, self._tools, temperature,
        ):
            if text:
                yield StreamEvent(type="text", text=text)
