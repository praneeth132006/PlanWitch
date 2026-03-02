// Web stub for AdService
class AdService {
    constructor() {
        this.isLoaded = false;
        this.isDisabled = false;
    }

    setDisabled(disabled) {
        this.isDisabled = disabled;
        // console.log(`[AdService] Disabled state: ${disabled}`);
    }

    async init() {
        // No-op on web
    }

    loadInterstitial() {
        // No-op on web
    }

    showInterstitial() {
        if (this.isDisabled) {
            // console.log('[AdService] Ad skipped (Disabled)');
            return true;
        }
        console.log('[AdService] Web/Test Interstitial Shown');
        return true;
    }
}

const adServiceInstance = new AdService();
export default adServiceInstance;
