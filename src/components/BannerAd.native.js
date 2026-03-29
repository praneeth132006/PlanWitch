import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import AD_UNIT_IDS from '../config/admob';

// Safe import for native ads module (crashes in Expo Go)
let AdMobBanner = null;
let BannerAdSize = null;
try {
    const adsModule = require('react-native-google-mobile-ads');
    AdMobBanner = adsModule.BannerAd;
    BannerAdSize = adsModule.BannerAdSize;
} catch (e) {
    // react-native-google-mobile-ads not available (Expo Go)
}

const BannerAd = () => {
    const { isPremium } = usePremium();
    const { colors } = useTheme();

    if (isPremium) return null;

    // If native ads module not available, render nothing
    if (!AdMobBanner || !BannerAdSize) return null;

    return (
        <View style={styles.container}>
            <AdMobBanner
                unitId={AD_UNIT_IDS.BANNER}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    }
});

export default BannerAd;
