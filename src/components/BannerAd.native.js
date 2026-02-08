import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { BannerAd as AdMobBanner, BannerAdSize } from 'react-native-google-mobile-ads';
import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import AD_UNIT_IDS from '../config/admob';

const BannerAd = () => {
    const { isPremium } = usePremium();
    const { colors } = useTheme();

    if (isPremium) return null;

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
