// AdMob Configuration
// Using official test IDs for development
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

export const AD_UNIT_IDS = {
    INTERSTITIAL: __DEV__ ? TEST_INTERSTITIAL_ID : 'ca-app-pub-3940256099942544/1033173712',
    BANNER: __DEV__ ? TEST_BANNER_ID : 'ca-app-pub-3940256099942544/6300978111',
};

export default AD_UNIT_IDS;
