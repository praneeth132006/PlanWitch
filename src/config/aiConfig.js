// AI Provider Configuration
// SECURITY NOTE: This file contains the API key directly for React Native compatibility.
// The .env file approach doesn't work reliably in Expo/React Native without additional setup.
// Since .gitignore excludes this file pattern is NOT the issue (we can't gitignore this file),
// we rely on the private repo for security.

// For enhanced security in production:
// 1. Use Expo's app.config.js with expo-constants
// 2. Or use a backend proxy to hide the API key completely

export const AI_CONFIG = {
    // Provider: 'gemini' | 'openai'
    provider: 'gemini',

    // API Key - Read from environment variables for security
    // TODO: In production, move this to a backend service or use expo-constants
    // [PRANEETH-RULE] Removed the hardcoded Gemini API key and replaced it with process.env.EXPO_PUBLIC_GEMINI_API_KEY to pass CodeQL Security Scans and prevent credentials from being committed to the repo.
    geminiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,

    openaiKey: '',

    // Model configuration
    models: {
        // The line below updates the default Gemini model from 'gemini-2.0-flash' to 'gemini-2.5-flash'. This fixes the '404 Not Found' error since the older model is no longer available under that name.
        gemini: 'gemini-2.5-flash',
        openai: 'gpt-3.5-turbo'
    }
};
