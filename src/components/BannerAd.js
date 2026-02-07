import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const BannerAd = ({ onPress }) => {
    const { isPremium } = usePremium();
    const { colors, isDark } = useTheme();

    if (isPremium) return null;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? '#1F1F1F' : '#FFF',
                    borderColor: '#F59E0B', // Gold border
                }
            ]}
        >
            <View style={styles.contentContainer}>
                {/* Left Icon */}
                <View style={[styles.iconContainer, { backgroundColor: '#F59E0B15' }]}>
                    <Icon name="crown" size={24} color="#F59E0B" />
                </View>

                {/* Text Content */}
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

                {/* Right Arrow */}
                <Icon name="arrow_right" size={20} color="#F59E0B" />
            </View>
        </TouchableOpacity>
    );
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
        alignItems: 'center', // Align PRO badge with text
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
});

export default BannerAd;
