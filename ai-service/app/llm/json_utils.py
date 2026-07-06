import json
import re

_FENCE_RE = re.compile(r"```json|```", re.IGNORECASE)


def strip_markdown_fences(text: str) -> str:
    return _FENCE_RE.sub("", text).strip()


def extract_json(text: str) -> dict:
    """Parses a JSON object/array out of raw LLM text, tolerating markdown
    fences, leading/trailing junk, and truncated (unclosed) brackets.

    Ports the recovery logic already proven in src/services/aiService.js's
    callGemini(), since Gemini occasionally truncates or wraps JSON output.
    """
    cleaned = strip_markdown_fences(text)

    first_brace = cleaned.find("{")
    first_bracket = cleaned.find("[")
    candidates = [i for i in (first_brace, first_bracket) if i != -1]
    if candidates:
        start = min(candidates)
        cleaned = cleaned[start:]

    last_brace = cleaned.rfind("}")
    last_bracket = cleaned.rfind("]")
    end = max(last_brace, last_bracket)
    if end != -1 and end < len(cleaned) - 1:
        cleaned = cleaned[: end + 1]

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Attempt to recover truncated JSON by closing unbalanced brackets.
    open_braces = cleaned.count("{")
    close_braces = cleaned.count("}")
    open_brackets = cleaned.count("[")
    close_brackets = cleaned.count("]")

    fixed = cleaned
    fixed += "]" * max(0, open_brackets - close_brackets)
    fixed += "}" * max(0, open_braces - close_braces)

    return json.loads(fixed)
