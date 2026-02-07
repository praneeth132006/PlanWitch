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
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    }
});

export default BannerAd;
