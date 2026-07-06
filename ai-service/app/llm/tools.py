from typing import Any

import httpx

from app.config import get_settings
from app.llm.gemini_client import ToolDeclaration

_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"


def geocode_address(address: str) -> dict[str, float] | None:
    settings = get_settings()
    if not settings.google_maps_api_key or not address:
        return None

    response = httpx.get(
        _GEOCODE_URL,
        params={"address": address, "key": settings.google_maps_api_key},
        timeout=8.0,
    )
    data = response.json()
    results = data.get("results") or []
    if data.get("status") != "OK" or not results:
        return None

    location = results[0]["geometry"]["location"]
    return {"lat": location["lat"], "lng": location["lng"]}


def search_nearby_places_impl(args: dict[str, Any]) -> Any:
    """Runs on the server, mirroring src/services/transitService.js::getNearbyPlaces
    but called server-side (no browser CORS proxy needed here)."""
    location_name = args.get("location", "")
    place_type = args.get("place_type", "tourist_attraction")
    limit = min(int(args.get("limit", 8)), 15)

    settings = get_settings()
    if not settings.google_maps_api_key:
        return {"error": "Places lookup is not configured on this server"}

    coords = geocode_address(location_name)
    if not coords:
        return {"error": f"Could not locate '{location_name}'"}

    response = httpx.get(
        _NEARBY_URL,
        params={
            "location": f"{coords['lat']},{coords['lng']}",
            "radius": 30000,
            "type": place_type,
            "rankby": "prominence",
            "key": settings.google_maps_api_key,
        },
        timeout=8.0,
    )
    data = response.json()
    if data.get("status") != "OK":
        return {"error": f"Places lookup failed: {data.get('status')}"}

    results = data.get("results", [])[:limit]
    return {
        "places": [
            {
                "name": p.get("name"),
                "rating": p.get("rating"),
                "user_ratings_total": p.get("user_ratings_total"),
                "types": p.get("types"),
            }
            for p in results
        ]
    }


SEARCH_NEARBY_PLACES_TOOL = ToolDeclaration(
    name="search_nearby_places",
    description=(
        "Searches for real, currently-rated nearby places (attractions, restaurants, "
        "cafes, etc.) around a given location. Use this whenever the traveler asks "
        "what's nearby, what to do right now, or for concrete place recommendations "
        "instead of guessing from general knowledge."
    ),
    parameters={
        "type": "OBJECT",
        "properties": {
            "location": {
                "type": "STRING",
                "description": "A place name or address to search around, e.g. 'Om Beach, Gokarna'.",
            },
            "place_type": {
                "type": "STRING",
                "description": (
                    "Google Places type to filter by, e.g. 'restaurant', 'cafe', "
                    "'tourist_attraction', 'museum'. Defaults to 'tourist_attraction'."
                ),
            },
            "limit": {
                "type": "NUMBER",
                "description": "Max number of places to return (default 8, max 15).",
            },
        },
        "required": ["location"],
    },
    handler=search_nearby_places_impl,
)
