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

    // API Key - Hardcoded for React Native compatibility
    // TODO: In production, move this to a backend service or use expo-constants
    geminiKey: 'AIzaSyBMHuGTA3NYGSV-rhxyNJ9jkInDtB6rB94',

    openaiKey: '',

    // Model configuration
    models: {
        gemini: 'gemini-2.0-flash',
        openai: 'gpt-3.5-turbo'
    }
};
