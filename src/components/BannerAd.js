import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTravelContext } from '../context/TravelContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const BannerAd = () => {
    const { userPlan } = useTravelContext();
    const { colors } = useTheme();
    const navigation = useNavigation();

    if (userPlan === 'pro') return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.primaryBorder }]}>
            <View style={styles.adBadge}>
                <Text style={styles.adBadgeText}>Ad</Text>
            </View>
            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>Travel Pro Deal</Text>
                <Text style={[styles.desc, { color: colors.textMuted }]}>Get 20% off flights today!</Text>
            </View>
            <Pressable
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Subscription')}
            >
                <Text style={styles.buttonText}>Remove Ads</Text>
            </Pressable>
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
    },
    adBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 10,
    },
    adBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    desc: {
        fontSize: 12,
    },
    button: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    }
});

export default BannerAd;
