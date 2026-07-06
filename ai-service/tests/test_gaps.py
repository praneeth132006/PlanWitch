from app.scheduling.gaps import find_free_windows


def test_no_gaps_when_fully_packed():
    slots = [
        {"day": 1, "time": "08:00 AM", "duration": "6 hours"},
        {"day": 1, "time": "02:00 PM", "duration": "8 hours"},
    ]
    assert find_free_windows(slots) == []


def test_finds_gap_between_activities():
    slots = [
        {"day": 1, "time": "09:00 AM", "duration": "1 hour"},  # ends 10:00 AM
        {"day": 1, "time": "01:00 PM", "duration": "1 hour"},  # starts 1:00 PM -> 3h gap
    ]
    windows = find_free_windows(slots)
    # Gap between the two activities (10AM-1PM) plus the trailing gap after
    # the last activity ends (2PM) through the default day-end cutoff (10PM).
    assert len(windows) == 2
    between = next(w for w in windows if w.start_minutes == 10 * 60)
    assert between.day == 1
    assert between.duration_minutes == 180


def test_empty_itinerary_has_no_windows():
    assert find_free_windows([]) == []


def test_trailing_gap_before_end_of_day():
    slots = [
        {"day": 2, "time": "08:00 AM", "duration": "2 hours"},  # ends 10:00 AM
    ]
    windows = find_free_windows(slots)
    # One trailing window from 10:00 AM to 10:00 PM (day_end default).
    assert len(windows) == 1
    assert windows[0].start_minutes == 10 * 60
    assert windows[0].end_minutes == 22 * 60


def test_activity_running_past_day_end_yields_no_negative_trailing_window():
    slots = [
        {"day": 1, "time": "09:00 PM", "duration": "3 hours"},  # ends past 22:00 cutoff
    ]
    windows = find_free_windows(slots)
    # The leading gap (8AM-9PM) before the late activity is legitimate; what
    # must NOT happen is a trailing window with end > day_end or end < start.
    assert all(w.end_minutes <= 22 * 60 and w.end_minutes > w.start_minutes for w in windows)


def test_ignores_slots_missing_day_or_time():
    slots = [{"time": "09:00 AM", "duration": "1 hour"}, {"day": 1, "duration": "1 hour"}]
    assert find_free_windows(slots) == []
