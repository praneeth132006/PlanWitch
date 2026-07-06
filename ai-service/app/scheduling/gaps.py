import re
from dataclasses import dataclass

_TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})\s*(AM|PM)$", re.IGNORECASE)
_DURATION_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(hour|hr|minute|min)", re.IGNORECASE)


def _parse_time_to_minutes(value: str) -> int | None:
    match = _TIME_RE.match(value.strip())
    if not match:
        return None
    hour, minute, meridiem = int(match.group(1)), int(match.group(2)), match.group(3).upper()
    if meridiem == "PM" and hour != 12:
        hour += 12
    if meridiem == "AM" and hour == 12:
        hour = 0
    return hour * 60 + minute


def _parse_duration_to_minutes(value: str) -> int:
    match = _DURATION_RE.search(value)
    if not match:
        return 60
    amount = float(match.group(1))
    unit = match.group(2).lower()
    return int(amount * 60) if unit.startswith("hour") or unit == "hr" else int(amount)


@dataclass
class FreeWindow:
    day: int
    start_minutes: int
    end_minutes: int

    @property
    def duration_minutes(self) -> int:
        return self.end_minutes - self.start_minutes

    def as_hint(self) -> str:
        hours = self.duration_minutes / 60
        return f"Day {self.day}: free from {_format(self.start_minutes)} to {_format(self.end_minutes)} (~{hours:.1f}h)"


def _format(minutes: int) -> str:
    hour, minute = divmod(minutes % (24 * 60), 60)
    meridiem = "AM" if hour < 12 else "PM"
    display_hour = hour % 12
    if display_hour == 0:
        display_hour = 12
    return f"{display_hour:02d}:{minute:02d} {meridiem}"


def find_free_windows(
    itinerary_slots: list[dict],
    min_gap_minutes: int = 90,
    day_start_minutes: int = 8 * 60,
    day_end_minutes: int = 22 * 60,
) -> list[FreeWindow]:
    """Given a flat list of {day, time, duration} activity slots, returns the
    free-time windows on each day that are long enough to be worth a
    proactive suggestion (default: 90+ minutes).

    Grounds the "you have N free hours" proactive-suggestion requirement in
    real schedule data instead of letting the model invent gaps.
    """
    by_day: dict[int, list[tuple[int, int]]] = {}
    for slot in itinerary_slots:
        day = slot.get("day")
        time_str = slot.get("time")
        if day is None or not time_str:
            continue
        start = _parse_time_to_minutes(time_str)
        if start is None:
            continue
        duration = _parse_duration_to_minutes(slot.get("duration") or "")
        by_day.setdefault(day, []).append((start, start + duration))

    windows: list[FreeWindow] = []
    for day, intervals in by_day.items():
        intervals.sort()
        cursor = day_start_minutes
        for start, end in intervals:
            if start > cursor and start - cursor >= min_gap_minutes:
                windows.append(FreeWindow(day=day, start_minutes=cursor, end_minutes=start))
            cursor = max(cursor, end)
        if day_end_minutes > cursor and day_end_minutes - cursor >= min_gap_minutes:
            windows.append(FreeWindow(day=day, start_minutes=cursor, end_minutes=day_end_minutes))

    return windows
