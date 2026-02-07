// Web stub for AdService
class AdService {
    constructor() {
        this.isLoaded = false;
    }

    async init() {
        // No-op on web
    }

    loadInterstitial() {
        // No-op on web
    }

    showInterstitial() {
        console.log('[AdService] Web/Test Interstitial Shown');
        return true;
    }
}

const adServiceInstance = new AdService();
export default adServiceInstance;
