# PlanWitch AI Service

Backend for Section 3.2 (Conversational AI Travel Agent) of the AI Specialist
Requirements doc. Moves chat off the mobile client so the Gemini API key is no
longer embedded in the app bundle, and adds session memory, intent routing,
tool calling, and streaming.

Other Phase 1 endpoints (itinerary generation, budget, safety brief, document
parsing) are not built yet — this service currently exposes `/ai/chat` only.

## Setup

```bash
cd ai-service
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; use .venv\Scripts\activate.bat on cmd
pip install -r requirements.txt
cp .env.example .env            # then fill in GEMINI_API_KEY, GOOGLE_MAPS_API_KEY
```

## Running locally

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`GET /health` should return `{"status": "ok"}`. `GET /docs` has interactive Swagger UI.

## Auth

`ALLOW_DEV_AUTH=true` (the default) skips Firebase ID token verification —
sessions are keyed by the client-supplied `session_id` instead, matching how
the app already treats guest/unauthenticated users.

To turn on real Firebase auth: set `FIREBASE_SERVICE_ACCOUNT_PATH` to a
service-account JSON downloaded from the Firebase console (Project Settings →
Service Accounts). Once set, requests are keyed by the verified `uid` if a
valid `Authorization: Bearer <Firebase ID token>` header is present.

## Trying it

```bash
curl -N -X POST http://127.0.0.1:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What restaurants are near Om Beach right now?",
    "session_id": "demo-1",
    "trip_context": {"destination": "Gokarna", "days": 3}
  }'
```

Response is Server-Sent Events (`text/event-stream`), one JSON object per
event:

```
data: {"type": "intent", "intent": "discovery_intent"}
data: {"type": "tool_call", "tool_name": "search_nearby_places"}
data: {"type": "tool_result", "tool_name": "search_nearby_places"}
data: {"type": "text", "text": "Certainly, here are some restaurants..."}
data: {"type": "done"}
```

`emergency_intent` and `booking_intent` short-circuit before calling Gemini at
all (see `app/fallback_responses.py`) — you'll see a single `text` event and
`done`, with no `tool_call`.

## Known model-name gotcha

`app/llm/gemini_client.py`'s `FALLBACK_MODELS` list was updated during
development after `gemini-2.0-flash` / `gemini-1.5-pro` / `gemini-1.5-flash`
(the same chain used by the existing `src/services/aiService.js`) started
returning `404 ... no longer available` from the live API. If you see the
same error, run:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
  | python -c "import json,sys; d=json.load(sys.stdin); [print(m['name']) for m in d['models'] if 'generateContent' in m.get('supportedGenerationMethods', [])]"
```

and update the list to models currently supporting `generateContent`.

## Architecture notes / tradeoffs

- **Streaming + tool calling**: Gemini can stream partial text and *then*
  decide to call a tool within the same turn (confirmed via live testing,
  not just documentation). To avoid showing a garbled reply (partial
  pre-call text followed by an unrelated tool-grounded answer), the first
  turn is buffered in full before being forwarded — the client sees no text
  until the model either finishes without a tool call, or the tool result is
  in and the follow-up turn starts streaming. True incremental
  first-token streaming is guaranteed on the tool-result follow-up turn;
  the initial decision turn is atomic. This is a deliberate correctness
  tradeoff, not an oversight.
- **Session memory**: `app/memory/session_store.py` ships an in-memory
  TTL-based `SessionStore`. It's single-process and non-persistent by
  design — the doc recommends Redis for production; swapping in a
  Redis-backed implementation means adding one class that satisfies the
  same `SessionStore` interface, not touching any caller.
- **Long-term profile**: not persisted server-side yet. The client already
  owns trip/preference state via `TravelContext`/Firebase RTDB and is
  expected to pass it in as `trip_context` / `user_profile` on each
  request. Adding Firebase-Admin-backed persistence here is future work
  once a service-account credential is available.
- **search_nearby_places tool**: the one real backend capability wired up
  as a callable tool (Google Places Nearby Search, same key as
  `src/config/googleMaps.js`). No booking-API tools exist because the app
  has none to call — booking requests get a graceful fallback message
  instead of a fabricated confirmation.
- **Safety data**: no curated safety-briefing data source is integrated
  yet (that's `/ai/safety/brief`, a separate not-yet-built endpoint). The
  emergency short-circuit here is a static, non-hallucinated message with
  only well-known universal emergency numbers.
