import { Platform } from 'react-native';
import mobileAds, { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import AD_UNIT_IDS from '../config/admob';

class AdService {
    constructor() {
        this.interstitial = null;
        this.isLoaded = false;
        this.requestOptions = {
            requestNonPersonalizedAdsOnly: true,
        };
    }

    async init() {
        try {
            await mobileAds().initialize();
            this.loadInterstitial();
        } catch (error) {
            console.error('AdMob Initialization Error:', error);
        }
    }

    loadInterstitial() {
        if (this.interstitial) {
            this.interstitial.removeAllListeners();
        }

        try {
            this.interstitial = InterstitialAd.createForAdUnitId(AD_UNIT_IDS.INTERSTITIAL, this.requestOptions);

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
