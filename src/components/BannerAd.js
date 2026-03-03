import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import { ADSENSE_PUBLISHER_ID, AD_SLOTS, AD_FORMATS } from '../config/adsense';

/**
 * AdSense Banner Component for Web
 * Renders a real Google AdSense ad unit, with a premium upsell fallback.
 * Falls back to the PRO upsell banner if AdSense is not yet configured.
 */

const isAdSenseConfigured = ADSENSE_PUBLISHER_ID && !ADSENSE_PUBLISHER_ID.includes('YOUR_PUBLISHER_ID');

/**
 * Renders a Google AdSense ad unit inside a React component
 */
const AdSenseUnit = ({ adSlot, adFormat = AD_FORMATS.AUTO, style }) => {
    const adRef = useRef(null);
    const pushed = useRef(false);

    useEffect(() => {
        if (Platform.OS !== 'web' || !isAdSenseConfigured) return;

        // Push ad only once per mount
        if (!pushed.current && adRef.current) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                pushed.current = true;
            } catch (e) {
                console.warn('AdSense push error:', e);
            }
        }
    }, []);

    if (Platform.OS !== 'web' || !isAdSenseConfigured) return null;

    return (
        <View style={style}>
            <ins
                className="adsbygoogle"
                style={{
                    display: 'block',
                    width: '100%',
                    minHeight: 60,
                }}
                data-ad-client={ADSENSE_PUBLISHER_ID}
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive="true"
                ref={adRef}
            />
        </View>
    );
};

/**
 * Premium Upsell Banner (fallback when AdSense is not configured)
 */
const PremiumUpsellBanner = ({ onPress, colors, isDark }) => (
    <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[
            styles.container,
            {
                backgroundColor: isDark ? '#1F1F1F' : '#FFF',
                borderColor: '#F59E0B',
            }
        ]}
    >
        <View style={styles.contentContainer}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B15' }]}>
                <Icon name="crown" size={24} color="#F59E0B" />
            </View>
            <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                    <View style={[styles.proBadge, { backgroundColor: '#F59E0B' }]}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Unlock Pro Features</Text>
                </View>
                <Text style={[styles.description, { color: colors.textMuted }]}>
                    Unlimited trips, AI planning & more
                </Text>
            </View>
            <Icon name="arrow_right" size={20} color="#F59E0B" />
        </View>
    </TouchableOpacity>
);

/**
 * Main BannerAd Component (Web)
 * Shows real AdSense ads when configured, or falls back to the PRO upsell banner.
 * 
 * Props:
 * - adSlot: string (specific ad slot ID, defaults to BANNER_HOME)
 * - adFormat: string (ad format, defaults to 'auto')
 * - onPress: function (fallback upsell tap handler)
 */
const BannerAd = ({ onPress, adSlot, adFormat }) => {
    const { isPremium } = usePremium();
    const { colors, isDark } = useTheme();

    // Premium users never see ads
    if (isPremium) return null;

    // If AdSense is configured, show real ads
    if (isAdSenseConfigured) {
        return (
            <AdSenseUnit
                adSlot={adSlot || AD_SLOTS.BANNER_HOME}
                adFormat={adFormat || AD_FORMATS.AUTO}
                style={styles.adContainer}
            />
        );
    }

    // Fallback: show PRO upsell banner
    return <PremiumUpsellBanner onPress={onPress} colors={colors} isDark={isDark} />;
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginVertical: 10,
        borderRadius: 16,
        borderWidth: 2,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    proBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 8,
    },
    proBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    description: {
        fontSize: 13,
        fontWeight: '500',
    },
    adContainer: {
        marginHorizontal: 20,
        marginVertical: 10,
        minHeight: 60,
        overflow: 'hidden',
    },
});

export { AdSenseUnit };
export default BannerAd;
