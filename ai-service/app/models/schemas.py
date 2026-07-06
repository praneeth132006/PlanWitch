from typing import Any, Optional, Union

from pydantic import BaseModel, Field


class ItinerarySlot(BaseModel):
    day: Optional[int] = None
    time: Optional[str] = None
    duration: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None


class TripContext(BaseModel):
    destination: Optional[str] = None
    days: Optional[int] = None
    # The mobile client sends a numeric amount (TravelContext's budget.total);
    # other callers may send a label like "moderate" — accept both.
    budget: Optional[Union[str, float, int]] = None
    travelers: Optional[int] = None
    interests: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    message: str
    session_id: str = Field(..., description="Client-generated id used when the caller is a guest / unauthenticated")
    trip_context: TripContext = Field(default_factory=TripContext)
    itinerary: list[ItinerarySlot] = Field(default_factory=list)
    user_profile: dict[str, Any] = Field(default_factory=dict)


class ChatChunk(BaseModel):
    type: str  # "text" | "intent" | "tool_call" | "tool_result" | "done" | "error"
    text: str = ""
    intent: str = ""
    tool_name: str = ""
