import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class SessionState:
    messages: list[dict[str, str]] = field(default_factory=list)
    last_seen: float = field(default_factory=time.time)

    def append(self, role: str, text: str, max_messages: int = 20) -> None:
        self.messages.append({"role": role, "text": text})
        if len(self.messages) > max_messages:
            self.messages = self.messages[-max_messages:]
        self.last_seen = time.time()


class SessionStore(ABC):
    """Short-term (per-session) conversation memory.

    Interface-compatible so swapping InMemoryTTLStore for a Redis-backed
    implementation later is a one-file change (per the doc's Redis
    recommendation for production) rather than a rewrite of callers.
    """

    @abstractmethod
    def get(self, session_key: str) -> SessionState: ...

    @abstractmethod
    def clear(self, session_key: str) -> None: ...


class InMemoryTTLStore(SessionStore):
    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._ttl = ttl_seconds
        self._sessions: dict[str, SessionState] = {}

    def _evict_expired(self) -> None:
        now = time.time()
        expired = [k for k, s in self._sessions.items() if now - s.last_seen > self._ttl]
        for k in expired:
            del self._sessions[k]

    def get(self, session_key: str) -> SessionState:
        self._evict_expired()
        if session_key not in self._sessions:
            self._sessions[session_key] = SessionState()
        return self._sessions[session_key]

    def clear(self, session_key: str) -> None:
        self._sessions.pop(session_key, None)


_store: SessionStore | None = None


def get_session_store() -> SessionStore:
    global _store
    if _store is None:
        from app.config import get_settings

        _store = InMemoryTTLStore(ttl_seconds=get_settings().session_ttl_seconds)
    return _store
