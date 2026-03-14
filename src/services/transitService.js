/**
 * Smart Travel Logistics Service
 * Fetches distance & travel time between stops using Google Directions API.
 * Supports multiple travel modes and caches results to minimize API calls.
 */

import GOOGLE_MAPS_CONFIG from '../config/googleMaps';
import { Platform } from 'react-native';

// In-memory cache: "lat,lng-lat,lng" → result
const logisticsCache = {};

const fetchWithTimeout = (url, options = {}, timeout = 8000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeout))
    ]);
};

/**
 * Proxy helper for web development to bypass CORS.
 * Only used if running in a browser environment.
 */
const PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

let proxyIndex = 0;

const getWrappedUrl = (url, forceNext = false) => {
    if (Platform.OS === 'web') {
        if (forceNext) proxyIndex = (proxyIndex + 1) % PROXIES.length;
        return PROXIES[proxyIndex](url);
    }
    return url;
};

/**
 * Geocode an address string to {lat, lng}
 */
export const geocodeAddress = async (address) => {
    if (!address) return null;

    // Web-specific SDK implementation
    if (Platform.OS === 'web' && window.google?.maps?.Geocoder) {
        try {
            const geocoder = new window.google.maps.Geocoder();
            return new Promise((resolve) => {
                geocoder.geocode({ address }, (results, status) => {
                    if (status === 'OK' && results?.[0]) {
                        const { lat, lng } = results[0].geometry.location;
                        resolve({ lat: lat(), lng: lng() });
                    } else {
                        resolve(null);
                    }
                });
            });
        } catch (e) {
            console.warn('[Logistics] SDK Geocode error:', e.message);
        }
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_CONFIG.apiKey}`;
    try {
        let res = await fetchWithTimeout(getWrappedUrl(url));
        if (!res.ok) {
            res = await fetchWithTimeout(getWrappedUrl(url, true));
        }

        const text = await res.text();
        if (!text.trim().startsWith('{')) {
            throw new Error('Proxy returned non-JSON response');
        }

        let data = JSON.parse(text);
        if (data.contents && typeof data.contents === 'string') {
            data = JSON.parse(data.contents);
        }

        if (data.status === 'OK' && data.results?.[0]) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng };
        }
        return null;
    } catch (e) {
        if (e.message?.includes('fetch') || e.message?.includes('Network') || e.message === 'TIMEOUT') {
            console.warn(`[Logistics] Geocode ${e.message === 'TIMEOUT' ? 'Timeout' : 'CORS/Network'} error`);
            return { error: 'GEOCODE_FAIL' };
        } else {
            console.warn('[Logistics] Geocode error:', e.message);
        }
        return { error: 'GEOCODE_FAIL' };
    }
};

/**
 * Calculate distance between two coordinates in km using Haversine formula
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Fetch travel logistics between two points for a given mode.
 * mode: 'driving' | 'walking' | 'transit'
 */
const fetchDirections = async (origin, destination, mode = 'driving') => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=${mode}&key=${GOOGLE_MAPS_CONFIG.apiKey}`;
    try {
        let res = await fetchWithTimeout(getWrappedUrl(url));
        if (!res.ok) {
            res = await fetchWithTimeout(getWrappedUrl(url, true));
        }

        const text = await res.text();
        if (!text.trim().startsWith('{')) {
            throw new Error('Proxy returned non-JSON response');
        }

        let data = JSON.parse(text);
        if (data.contents && typeof data.contents === 'string') {
            data = JSON.parse(data.contents);
        }

        if (data.status === 'OK' && data.routes?.[0]?.legs?.[0]) {
            const leg = data.routes[0].legs[0];
            const result = {
                distance: leg.distance.text,
                distanceValue: leg.distance.value, // meters
                duration: leg.duration.text,
                durationValue: leg.duration.value, // seconds
            };
            console.log(`[Logistics] ${mode} success:`, result.distance, result.duration);
            return result;
        }

        // --- FALLBACK LOGIC ---
        // If Google fails but we have coordinates, provide an estimate
        if (origin.lat && origin.lng && destination.lat && destination.lng) {
            const distKm = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
            // Rough multipliers for road distance and speed
            const roadDistKm = distKm * 1.3;
            let speedKph = 40; // Default driving speed
            if (mode === 'walking') speedKph = 5;
            if (mode === 'transit') speedKph = 25;

            const durationHrs = roadDistKm / speedKph;
            const durationMins = Math.round(durationHrs * 60);

            return {
                distance: `${roadDistKm.toFixed(1)} km (est)`,
                distanceValue: Math.round(roadDistKm * 1000),
                duration: durationMins >= 60
                    ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
                    : `${durationMins} mins`,
                durationValue: durationMins * 60,
                isFallback: true
            };
        }

        console.warn(`[Logistics] ${mode} failed with status:`, data.status, data.error_message || '');
        return null;
    } catch (e) {
        if (e.message?.includes('fetch') || e.message?.includes('Network') || e.message === 'TIMEOUT') {
            console.warn(`[Logistics] ${mode} ${e.message === 'TIMEOUT' ? 'Timeout' : 'CORS/Network'} error`);
            // Attempt fallback even on timeout if we have coords
            if (origin.lat && origin.lng && destination.lat && destination.lng) {
                const distKm = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
                const roadDistKm = distKm * 1.3;
                let speedKph = mode === 'walking' ? 5 : (mode === 'transit' ? 25 : 40);
                const durationMins = Math.round((roadDistKm / speedKph) * 60);

                return {
                    distance: `${roadDistKm.toFixed(1)} km (est)`,
                    distanceValue: Math.round(roadDistKm * 1000),
                    duration: durationMins >= 60
                        ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
                        : `${durationMins} mins`,
                    durationValue: durationMins * 60,
                    isFallback: true
                };
            }
            return { error: 'NETWORK_FAIL' };
        } else {
            console.warn(`[Logistics] ${mode} directions error:`, e.message);
        }
        return null;
    }
};

/**
 * Get full travel logistics between two stops.
 * Returns { distance, driving, walking, transit } with travel times for each mode.
 * Results are cached in memory to avoid duplicate API calls.
 */
export const getTravelLogistics = async (stop1, stop2) => {
    // 1. Resolve coordinates
    let origin = (stop1.latitude && stop1.longitude) ? { lat: stop1.latitude, lng: stop1.longitude } : null;
    let dest = (stop2.latitude && stop2.longitude) ? { lat: stop2.latitude, lng: stop2.longitude } : null;

    if (!origin) origin = await geocodeAddress(stop1.location || stop1.name);
    if (!dest) dest = await geocodeAddress(stop2.location || stop2.name);

    if (origin?.error || dest?.error) {
        return { error: 'NETWORK_FAIL' };
    }

    if (!origin || !dest) return { error: 'NO_ROUTE' };

    // 2. Check cache
    const cacheKey = `${(origin.lat || 0).toFixed(4)},${(origin.lng || 0).toFixed(4)}-${(dest.lat || 0).toFixed(4)},${(dest.lng || 0).toFixed(4)}`;
    if (logisticsCache[cacheKey]) return logisticsCache[cacheKey];

    // 3. Fetch all three modes in parallel
    const [driving, walking, transit] = await Promise.all([
        fetchDirections(origin, dest, 'driving'),
        fetchDirections(origin, dest, 'walking'),
        fetchDirections(origin, dest, 'transit'),
    ]);

    const result = {
        distance: driving?.distance || walking?.distance || transit?.distance || null,
        distanceValue: driving?.distanceValue || 0,
        driving: driving?.duration ? { duration: driving.duration, durationValue: driving.durationValue } : null,
        walking: walking?.duration ? { duration: walking.duration, durationValue: walking.durationValue } : null,
        transit: transit?.duration ? { duration: transit.duration, durationValue: transit.durationValue } : null,
        error: driving?.error || walking?.error || transit?.error || null,
    };

    // 4. Cache and return
    if (!result.distance && !result.error) {
        // If we geocoded but Google found no route
        result.error = 'NO_ROUTE';
    }

    logisticsCache[cacheKey] = result;
    return result;
};

/**
 * Fetch place suggestions from Google Places Autocomplete API
 * Uses Google Maps SDK on web if available, otherwise falls back to fetch.
 * biasLocation: string or {lat, lng} to prioritize results near this area
 */
export const getPlaceSuggestions = async (query, biasLocation = null) => {
    if (!query || query.length < 2) return [];

    let coords = null;
    if (biasLocation) {
        if (typeof biasLocation === 'string') {
            coords = await geocodeAddress(biasLocation);
        } else if (biasLocation.lat && biasLocation.lng) {
            coords = biasLocation;
        }
    }

    // Web-specific SDK implementation
    if (Platform.OS === 'web' && window.google?.maps?.places?.AutocompleteService) {
        try {
            const service = new window.google.maps.places.AutocompleteService();
            const request = { input: query };

            if (coords && !coords.error) {
                request.locationBias = new window.google.maps.Circle({
                    center: { lat: coords.lat, lng: coords.lng },
                    radius: 50000
                });
            }

            return new Promise((resolve) => {
                service.getPlacePredictions(request, (predictions, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                        resolve(predictions.map(p => ({
                            description: p.description,
                            mainText: p.structured_formatting?.main_text || p.description,
                            secondaryText: p.structured_formatting?.secondary_text || '',
                            placeId: p.place_id
                        })));
                    } else {
                        resolve([]);
                    }
                });
            });
        } catch (e) {
            console.warn('[Logistics] SDK Suggestions error:', e.message);
        }
    }

    // Fallback/Native implementation
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_CONFIG.apiKey}`;

    if (coords && !coords.error) {
        url += `&locationbias=circle:50000@${coords.lat},${coords.lng}`;
    }

    try {
        let res = await fetchWithTimeout(getWrappedUrl(url));
        if (!res.ok) {
            res = await fetchWithTimeout(getWrappedUrl(url, true));
        }

        const text = await res.text();
        if (!text.trim().startsWith('{')) {
            throw new Error('Proxy returned non-JSON response');
        }

        let data = JSON.parse(text);
        if (data.contents && typeof data.contents === 'string') {
            data = JSON.parse(data.contents);
        }

        if (data.status === 'OK' && data.predictions) {
            return data.predictions.map(p => ({
                description: p.description,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || '',
                placeId: p.place_id
            }));
        }
        return [];
    } catch (e) {
        console.warn('[Logistics] Fetch Suggestions error:', e.message);
        return [];
    }
};
