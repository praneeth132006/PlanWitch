"""Keyword-based intent classifier for the chat agent.

Collapses the finer-grained keyword taxonomy already proven in
src/ai_data_files/tripData.json (used by the mobile app's current inline
chat logic) into the 4 top-level buckets the spec asks for. This is a
deliberate copy rather than a shared import: ai-service is meant to be
deployable independently of the mobile app's source tree.
"""

EMERGENCY_KEYWORDS = [
    "emergency", "hospital", "ambulance", "police", "fire", "danger",
    "accident", "medical emergency", "injury", "lost passport",
    "passport stolen", "robbery", "robbed", "mugged", "assaulted",
    "unsafe", "urgent", "help me", "sos", "critical", "disaster",
    "earthquake", "flood", "storm", "tsunami", "panic", "security issue",
    "attack", "need doctor", "clinic", "health emergency",
]

# Plain substring matches miss natural phrasing like "I lost my passport"
# (the doc's own example) since "lost passport" isn't a substring of it.
# These word-pair checks catch that without needing full NLP: if every word
# in the pair appears anywhere in the message, it counts as a match.
EMERGENCY_WORD_PAIRS = [
    ("passport", "lost"),
    ("passport", "stolen"),
    ("passport", "missing"),
    ("wallet", "stolen"),
    ("bag", "stolen"),
    ("sick", "help"),
    ("hurt", "help"),
    ("injured", "help"),
]

BOOKING_KEYWORDS = [
    "book", "booking", "reserve", "reservation", "hotel", "hostel",
    "resort", "villa", "airbnb", "apartment", "room", "flight", "flights",
    "tickets", "plane ticket", "train ticket", "bus ticket", "cab", "taxi",
    "uber", "ola", "rental car", "car rental", "rent a bike",
    "check availability", "check in", "check out", "stay", "accommodation",
    "lodging", "book now", "confirm booking", "travel package", "package",
    "vacation package", "booking confirmation", "airport transfer",
    "pickup", "drop", "reservation details",
]

SUPPORT_KEYWORDS = [
    "support", "help", "assist", "problem", "issue", "cancel", "refund",
    "reschedule", "delay", "lost baggage", "missed flight",
    "customer service", "complaint", "unable to book", "technical issue",
    "payment failed", "booking failed", "change booking", "modify booking",
    "contact support", "travel issue", "flight cancelled", "hotel issue",
    "can you help", "need help", "stuck", "problem with reservation",
]

# Everything else the app already understands (trip planning, food,
# transport, weather, activities, general budget/cost questions) counts as
# "discovery" — the traveler is exploring options, not booking or reporting
# a problem.
DISCOVERY_KEYWORDS = [
    "trip", "travel", "vacation", "holiday", "plan", "planning",
    "itinerary", "tour", "journey", "destination", "explore", "visit",
    "things to do", "places to visit", "best places", "food", "restaurant",
    "cafe", "eat", "dinner", "lunch", "breakfast", "nightlife", "shopping",
    "museum", "activities", "adventure", "sightseeing", "weather",
    "best time to visit", "budget", "cheap", "affordable", "cost", "price",
    "how much", "currency", "transport", "metro", "taxi", "directions",
]

INTENT_BUCKETS = {
    "emergency_intent": EMERGENCY_KEYWORDS,
    "booking_intent": BOOKING_KEYWORDS,
    "support_intent": SUPPORT_KEYWORDS,
    "discovery_intent": DISCOVERY_KEYWORDS,
}

# Checked in this order: emergency is always highest signal. Support is
# checked before booking because words like "cancel"/"problem"/"refund"
# alongside a booking noun (e.g. "cancel my reservation") describe an issue
# with an existing booking — a support case, not a new booking request.
PRIORITY_ORDER = ["emergency_intent", "support_intent", "booking_intent", "discovery_intent"]


def classify_intent(message: str) -> str:
    lower = message.lower()

    if any(all(word in lower for word in pair) for pair in EMERGENCY_WORD_PAIRS):
        return "emergency_intent"

    for bucket in PRIORITY_ORDER:
        keywords = INTENT_BUCKETS[bucket]
        if any(keyword in lower for keyword in keywords):
            return bucket
    return "discovery_intent"
