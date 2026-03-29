import { Platform } from 'react-native';
import AD_UNIT_IDS from '../config/admob';

// Safe import for native ads module (crashes in Expo Go)
let mobileAds = null;
let InterstitialAd = null;
let AdEventType = null;
try {
    const adsModule = require('react-native-google-mobile-ads');
    mobileAds = adsModule.default;
    InterstitialAd = adsModule.InterstitialAd;
    AdEventType = adsModule.AdEventType;
} catch (e) {
    // react-native-google-mobile-ads not available (Expo Go)
}

class AdService {
    constructor() {
        this.interstitial = null;
        this.isLoaded = false;
        this.isDisabled = false;
        this.requestOptions = {
            requestNonPersonalizedAdsOnly: true,
        };
    }

    setDisabled(disabled) {
        this.isDisabled = disabled;
    }

    async init() {
        if (!mobileAds) {
            console.log('[AdService] Native ads not available (Expo Go)');
            return;
        }
        try {
            await mobileAds().initialize();
            this.loadInterstitial();
        } catch (error) {
            console.error('AdMob Initialization Error:', error);
        }
    }

    loadInterstitial() {
        if (!InterstitialAd || !AdEventType) return;

        if (this.interstitial) {
            this.interstitial.removeAllListeners();
        }

        try {
            this.interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL, this.requestOptions);

            this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
                this.isLoaded = true;
            });

            this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
                this.isLoaded = false;
                this.loadInterstitial(); // Load next one
            });

            this.interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
                console.error('AdMob Interstitial Error:', error);
                this.isLoaded = false;
            });

            this.interstitial.load();
        } catch (e) {
            console.error('Error loading interstitial:', e);
        }
    }

    showInterstitial() {
        if (this.isDisabled) {
            return true;
        }
        if (this.isLoaded && this.interstitial) {
            this.interstitial.show();
            return true;
        } else {
            // If not loaded, just reload for next time
            this.loadInterstitial();
            return false;
        }
    }
}

const adServiceInstance = new AdService();
export default adServiceInstance;
