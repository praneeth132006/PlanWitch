import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Animated, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';
import PremiumButton from '../components/PremiumButton';

const SubscriptionScreen = ({ navigation, isPopover = false }) => {
    const { colors, isDark } = useTheme();
    const { userPlan, toggleUserPlan } = useTravelContext();
    const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' or 'yearly'

    const handleSubscribe = () => {
        const price = billingCycle === 'yearly' ? '₹1490/year' : '₹149/month';
        // Mock purchase flow
        Alert.alert(
            'Confirm Subscription',
            `Upgrade to Pro for ${price}? (Mock)`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Subscribe',
                    onPress: () => {
                        if (userPlan !== 'pro') toggleUserPlan();
                        Alert.alert('Success', 'Welcome to Pro!');
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    const FeatureItem = ({ text }) => (
        <View style={styles.featureItem}>
            <View style={styles.checkCircle}>
                <Icon name="check" size={14} color="#000" />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );

    const Container = isPopover ? View : SafeAreaView;

    return (
        <Container style={[styles.container, { backgroundColor: '#111' }]}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <Icon name="close" size={24} color="#FFF" />
                </Pressable>
                <View style={styles.headerTag}>
                    <Text style={styles.headerTagText}>Pricing detail</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.mainTitle}>Access All Features</Text>
                <Text style={styles.subtitle}>
                    Insight provides you with the tools & resources you need to build a stunning journey.
                </Text>

                {/* Features List */}
                <View style={styles.featuresList}>
                    <View style={styles.featureRow}>
                        <Icon name="star" size={24} color="#FFF" style={{ marginTop: 2 }} />
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>Unlimited Trips</Text>
                            <Text style={styles.featureDesc}>Create as many trips as you want without limits.</Text>
                        </View>
                    </View>
                    <View style={styles.featureRow}>
                        <Icon name="group" size={24} color="#FFF" style={{ marginTop: 2 }} />
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>Collaborative Workspace</Text>
                            <Text style={styles.featureDesc}>Invite unlimited friends and family to your trips.</Text>
                        </View>
                    </View>
                    <View style={styles.featureRow}>
                        <Icon name="sparkles" size={24} color="#FFF" style={{ marginTop: 2 }} />
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>AI Trip Planning</Text>
                            <Text style={styles.featureDesc}>Get personalized itineraries powered by AI.</Text>
                        </View>
                    </View>
                </View>

                {/* Pricing Card */}
                <View style={styles.pricingCard}>
                    {/* Toggle */}
                    <View style={styles.toggleContainer}>
                        <Pressable
                            style={[styles.toggleOption, billingCycle === 'monthly' && styles.toggleActive]}
                            onPress={() => setBillingCycle('monthly')}
                        >
                            <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.toggleOption, billingCycle === 'yearly' && styles.toggleActive]}
                            onPress={() => setBillingCycle('yearly')}
                        >
                            <Text style={[styles.toggleText, billingCycle === 'yearly' && styles.toggleTextActive]}>Yearly</Text>
                        </Pressable>
                    </View>

                    <View style={styles.priceHeader}>
                        <Text style={styles.planName}>Pro Plan</Text>
                        <View style={styles.priceContainer}>
                            <Text style={styles.currency}>₹</Text>
                            <Text style={styles.priceAmount}>{billingCycle === 'yearly' ? '1490' : '149'}</Text>
                            <Text style={styles.period}>/{billingCycle === 'yearly' ? 'year' : 'month'}</Text>
                        </View>
                        {billingCycle === 'yearly' && (
                            <View style={styles.savingsContainer}>
                                <Text style={styles.originalPrice}>₹1800</Text>
                                <View style={styles.savingBadge}>
                                    <Text style={styles.savingText}>SAVE 17%</Text>
                                </View>
                            </View>
                        )}
                        <Text style={styles.billingNote}>
                            {billingCycle === 'yearly' ? 'per user, billed annually' : 'per user, billed monthly'}
                        </Text>
                    </View>

                    <View style={styles.cardDivider} />

                    <Text style={styles.includesText}>EVERYTHING IN FREE, PLUS</Text>

                    <FeatureItem text="Unlimited Active Trips" />
                    <FeatureItem text="Unlimited Travelers" />
                    <FeatureItem text="AI Trip Generation" />
                    <FeatureItem text="Ad-Free Experience" />
                    <FeatureItem text="Priority Email Support" />

                    <Pressable style={styles.subscribeButton} onPress={handleSubscribe}>
                        <Text style={styles.subscribeButtonText}>Start 14 days free trial</Text>
                    </Pressable>
                </View>

            </ScrollView>
        </Container>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerTag: {
        backgroundColor: '#333',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    headerTagText: { color: '#CCC', fontSize: 12, fontWeight: '600' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    mainTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#AAA', lineHeight: 24, marginBottom: 30 },

    featuresList: { marginBottom: 40 },
    featureRow: { flexDirection: 'row', marginBottom: 24 },
    featureContent: { marginLeft: 16, flex: 1 },
    featureTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
    featureDesc: { fontSize: 14, color: '#AAA', lineHeight: 20 },

    pricingCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#333',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#000',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        alignSelf: 'center',
    },
    toggleOption: {
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 8,
    },
    toggleActive: {
        backgroundColor: '#333',
    },
    toggleText: {
        color: '#888',
        fontWeight: '600',
    },
    toggleTextActive: {
        color: '#FFF',
    },
    priceHeader: { marginBottom: 24 },
    planName: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
    priceContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
    currency: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 8, marginRight: 4 },
    priceAmount: { fontSize: 56, fontWeight: 'bold', color: '#FFF', lineHeight: 64 },
    period: { fontSize: 16, color: '#AAA', marginBottom: 12, marginLeft: 4 },

    savingsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    originalPrice: { fontSize: 16, color: '#666', textDecorationLine: 'line-through', marginRight: 10 },
    savingBadge: { backgroundColor: '#DB2777', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    savingText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

    billingNote: { fontSize: 14, color: '#666' },

    cardDivider: { height: 1, backgroundColor: '#333', marginBottom: 24 },
    includesText: { fontSize: 12, color: '#888', fontWeight: 'bold', marginBottom: 16 },

    featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    featureText: { fontSize: 15, color: '#EEE' },

    subscribeButton: {
        backgroundColor: '#E5E5E5',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    subscribeButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    }

});

export default SubscriptionScreen;
