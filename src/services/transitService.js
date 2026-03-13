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
        console.warn(`[Logistics] ${mode} failed with status:`, data.status, data.error_message || '');
        return null;
    } catch (e) {
        if (e.message?.includes('fetch') || e.message?.includes('Network') || e.message === 'TIMEOUT') {
            console.warn(`[Logistics] ${mode} ${e.message === 'TIMEOUT' ? 'Timeout' : 'CORS/Network'} error`);
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
 */
export const getPlaceSuggestions = async (query) => {
    if (!query || query.length < 2) return [];

    // Web-specific SDK implementation
    if (Platform.OS === 'web' && window.google?.maps?.places?.AutocompleteService) {
        try {
            const service = new window.google.maps.places.AutocompleteService();
            return new Promise((resolve) => {
                service.getPlacePredictions({ input: query }, (predictions, status) => {
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
            // Fallthrough to fetch
        }
    }

    // Fallback/Native implementation
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_CONFIG.apiKey}`;

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
