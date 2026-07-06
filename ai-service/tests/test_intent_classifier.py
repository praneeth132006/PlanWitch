from app.intent.classifier import classify_intent


def test_emergency_intent():
    assert classify_intent("I lost my passport, help me!") == "emergency_intent"
    assert classify_intent("I'm sick and need a doctor urgently") == "emergency_intent"


def test_booking_intent():
    assert classify_intent("Can you book a hotel in Goa for me?") == "booking_intent"
    assert classify_intent("I want to reserve a flight to Tokyo") == "booking_intent"


def test_support_intent():
    assert classify_intent("I need to cancel my reservation, there's a problem") == "support_intent"
    assert classify_intent("My payment failed, can you help?") == "support_intent"


def test_discovery_intent():
    assert classify_intent("What are the best places to visit in Rome?") == "discovery_intent"
    assert classify_intent("Suggest some good restaurants nearby") == "discovery_intent"


def test_discovery_is_default_fallback():
    assert classify_intent("Tell me a fun fact") == "discovery_intent"


def test_emergency_takes_priority_over_discovery_keywords():
    # Contains "trip" (discovery) and "emergency" (emergency) — emergency should win.
    assert classify_intent("Emergency during my trip, need police now") == "emergency_intent"


def test_natural_phrasing_lost_my_passport_is_emergency():
    # The doc's own example phrase. A naive "lost passport" substring check
    # misses this because of the inserted "my" — regression test for that.
    assert classify_intent("I lost my passport in Rome, help!") == "emergency_intent"
    assert classify_intent("My passport was stolen") == "emergency_intent"
