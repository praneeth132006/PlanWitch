import { useState, useCallback } from 'react';

// IMPORTANT: This file is a stub for web compatibility.
// The react-native-google-mobile-ads library does NOT support web and will crash the bundler.
// This provides a no-op hook that won't break your app.

export function useInterstitialAd() {
    const [loaded] = useState(false);

    const showAd = useCallback(() => {
        console.log('Ads not available on web. Native build required.');
    }, []);

    return { showAd, loaded };
}
