import { AWS_CONFIG } from '../config/awsConfig';

/**
 * Client for the PlanWitch AWS stack (see aws/README.md).
 *
 * This sits alongside the existing Firebase services rather than replacing
 * them: nothing in the app imports it by default. Call `isAwsEnabled()` before
 * routing any user-facing flow through here.
 */

const TIMEOUT_MS = 90000;

export const isAwsEnabled = () => Boolean(AWS_CONFIG.enabled && AWS_CONFIG.apiUrl);

let accessToken = null;

/** Store a Cognito access token so protected routes can be called. */
export const setAwsAccessToken = (token) => { accessToken = token || null; };

async function request(path, { method = 'GET', body, auth = false } = {}) {
    if (!isAwsEnabled()) {
        return { success: false, error: 'AWS stack is not deployed (AWS_CONFIG.enabled is false)' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (auth && accessToken) headers.Authorization = accessToken;

        const response = await fetch(`${AWS_CONFIG.apiUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return { success: false, status: response.status, error: data.error || response.statusText, data };
        }
        return { success: true, status: response.status, data };
    } catch (error) {
        const aborted = error.name === 'AbortError';
        return { success: false, error: aborted ? `Request timed out after ${TIMEOUT_MS / 1000}s` : error.message };
    } finally {
        clearTimeout(timer);
    }
}

// --- Health ----------------------------------------------------------------

export const checkAwsHealth = () => request('/health');

// --- AI itineraries (Amazon Bedrock) ---------------------------------------

/** Synchronous generation. API Gateway caps this at 30s -- use the workflow for longer runs. */
export const generateItineraryOnAws = (trip) => request('/ai/itinerary', {
    method: 'POST',
    body: {
        destination: trip.destination,
        nights: trip.nights ?? trip.days,
        travellers: trip.travellers,
        budget: trip.budget,
        interests: trip.interests,
        currency: trip.currency || 'INR',
        userId: trip.userId,
    },
});

/** Kicks off the Step Functions workflow; returns an executionArn to poll. */
export const startItineraryWorkflow = (trip) => request('/ai/itinerary/async', {
    method: 'POST',
    body: trip,
});

export const getItineraryWorkflowStatus = (executionArn) =>
    request(`/ai/itinerary/status?executionArn=${encodeURIComponent(executionArn)}`);

/** Polls the workflow until it leaves the RUNNING state. */
export async function awaitItineraryWorkflow(executionArn, { intervalMs = 4000, maxAttempts = 30 } = {}) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const result = await getItineraryWorkflowStatus(executionArn);
        if (!result.success) return result;
        if (result.data.status !== 'RUNNING') return result;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return { success: false, error: 'Workflow still running after the polling window closed' };
}

// --- Trips (DynamoDB) ------------------------------------------------------

export const saveTripToAws = (trip) => request('/trips', { method: 'POST', body: trip });

export const listAwsTrips = (userId, limit = 50) =>
    request(`/trips?userId=${encodeURIComponent(userId)}&limit=${limit}`);

export const deleteAwsTrip = (userId, tripId) =>
    request(`/trips/${encodeURIComponent(tripId)}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });

// --- Maps and routing (Amazon Location) ------------------------------------

export const searchPlaces = (query, { limit = 8, country } = {}) => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (country) params.set('country', country);
    return request(`/places?${params}`);
};

export const reverseGeocode = (longitude, latitude) =>
    request(`/places?lon=${longitude}&lat=${latitude}`);

export const calculateRoute = (from, to, mode = 'Car') =>
    request(`/route?from=${from.join(',')}&to=${to.join(',')}&mode=${mode}`);

// --- Language (Translate + Comprehend) -------------------------------------

export const translateText = (text, to, from) =>
    request('/translate', { method: 'POST', body: { text, to, from } });

// --- Audio guide (Polly) ---------------------------------------------------

/** Resolves to a presigned mp3 URL, valid for an hour. */
export const synthesizeAudioGuide = (text, voice = 'Kajal') =>
    request('/speak', { method: 'POST', body: { text, voice } });

// --- Trip photos (S3 + Rekognition) ----------------------------------------

/** Uploads straight to S3 with a presigned URL, then tags the photo with Rekognition. */
export async function uploadAndAnalysePhoto(fileOrBlob, contentType = 'image/jpeg', userId) {
    const presigned = await request('/media/upload-url', {
        method: 'POST',
        body: { contentType, userId },
    });
    if (!presigned.success) return presigned;

    try {
        const upload = await fetch(presigned.data.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: fileOrBlob,
        });
        if (!upload.ok) return { success: false, error: `S3 upload failed with ${upload.status}` };
    } catch (error) {
        return { success: false, error: `S3 upload failed: ${error.message}` };
    }

    return request('/media/analyze', { method: 'POST', body: { key: presigned.data.key, userId } });
}

// --- Email OTP (SES) -------------------------------------------------------

export const sendAwsOtp = (email) => request('/auth/otp', { method: 'POST', body: { email } });

export const verifyAwsOtp = (email, code) =>
    request('/auth/otp/verify', { method: 'POST', body: { email, code } });

// --- Cognito-protected route ----------------------------------------------

export const getAwsProfile = () => request('/me', { auth: true });

export default {
    isAwsEnabled,
    setAwsAccessToken,
    checkAwsHealth,
    generateItineraryOnAws,
    startItineraryWorkflow,
    getItineraryWorkflowStatus,
    awaitItineraryWorkflow,
    saveTripToAws,
    listAwsTrips,
    deleteAwsTrip,
    searchPlaces,
    reverseGeocode,
    calculateRoute,
    translateText,
    synthesizeAudioGuide,
    uploadAndAnalysePhoto,
    sendAwsOtp,
    verifyAwsOtp,
    getAwsProfile,
};
