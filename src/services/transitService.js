/**
 * Smart Travel Logistics Service
 * Fetches distance & travel time between stops using Google Directions API.
 * Supports multiple travel modes and caches results to minimize API calls.
 */

import GOOGLE_MAPS_CONFIG from '../config/googleMaps';

// In-memory cache: "lat,lng-lat,lng" → result
const logisticsCache = {};

/**
 * Proxy helper for web development to bypass CORS.
 * Only used if running in a browser environment.
 */
const getWrappedUrl = (url) => {
    if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
        return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
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
        const res = await fetch(getWrappedUrl(url));
        const data = await res.json();
        if (data.status === 'OK' && data.results[0]) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng };
        }
        return null;
    } catch (e) {
        if (e.message?.includes('fetch') || e.message?.includes('Network')) {
            console.warn('[Logistics] Geocode CORS/Network error - usually a browser limitation on localhost');
        } else {
            console.warn('[Logistics] Geocode error:', e.message);
        }
        return null;
    }
};

/**
 * Fetch travel logistics between two points for a given mode.
 * mode: 'driving' | 'walking' | 'transit'
 */
const fetchDirections = async (origin, destination, mode = 'driving') => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=${mode}&key=${GOOGLE_MAPS_CONFIG.apiKey}`;
    try {
        const res = await fetch(getWrappedUrl(url));
        const data = await res.json();
        if (data.status === 'OK' && data.routes[0]?.legs[0]) {
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
        if (e.message?.includes('fetch') || e.message?.includes('Network')) {
            console.warn(`[Logistics] ${mode} CORS/Network error - Google APIs block requests from localhost in browsers`);
            return { error: 'CORS_BLOCK' };
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

    if (!origin || !dest) return null;

    // 2. Check cache
    const cacheKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}-${dest.lat.toFixed(4)},${dest.lng.toFixed(4)}`;
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

    // 4. Cache and return only if we have at least a distance OR an error
    if (!result.distance && !result.error) {
        console.warn('[Logistics] No travel data found between points');
        return null;
    }

    logisticsCache[cacheKey] = result;
    return result;
};
