import React, { useState, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Platform, StatusBar, Dimensions, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';


const { width } = Dimensions.get('window');

// --- Constants & Data ---

const STEPS = [
    { id: 'style', title: 'Travel Style', isPro: false },
    { id: 'interests', title: 'Interests', isPro: false },
    { id: 'logistics', title: 'Logistics', isPro: true },
    { id: 'constraints', title: 'Well-being', isPro: true },
    { id: 'budget', title: 'Budget Plan', isPro: true },
];

const TRAVEL_VIBES = [
    { id: 'relaxed', label: 'Relaxed', icon: 'coffee', desc: 'Chill, low-stress days' },
    { id: 'balanced', label: 'Balanced', icon: 'map', desc: 'Mix of sights & rest' },
    { id: 'packed', label: 'Packed', icon: 'run', desc: 'See everything possible' },
];

const LUXURY_LEVELS = [
    { id: 'budget', label: 'Budget', icon: 'money', desc: 'Hostels & street food' },
    { id: 'comfort', label: 'Comfort', icon: 'home', desc: 'Hotels & nice meals' },
    { id: 'luxury', label: 'Luxury', icon: 'diamond', desc: 'Top-tier everything' },
];

const IMMERSION_LEVELS = [
    { id: 'tourist', label: 'Highlights', icon: 'camera', desc: 'Major landmarks' },
    { id: 'mixed', label: 'Mixed', icon: 'compass', desc: 'Hits & hidden gems' },
    { id: 'local', label: 'Deep Dive', icon: 'users', desc: 'Live like a local' },
];

const INTERESTS = [
    { id: 'nature', label: 'Nature', icon: 'leaf' },
    { id: 'history', label: 'History', icon: 'book' },
    { id: 'art', label: 'Art & Culture', icon: 'palette' },
    { id: 'food', label: 'Foodie', icon: 'restaurant' },
    { id: 'adventure', label: 'Adventure', icon: 'compass' },
    { id: 'nightlife', label: 'Nightlife', icon: 'moon' },
    { id: 'shopping', label: 'Shopping', icon: 'bag' },
    { id: 'photography', label: 'Photography', icon: 'camera' },
    { id: 'wellness', label: 'Wellness', icon: 'heart' },
    { id: 'family', label: 'Family Fun', icon: 'home' },
];

const DAILY_RHYTHMS = [
    { id: 'early', label: 'Early Bird', icon: 'sun', desc: 'Start by 7-8 AM' },
    { id: 'standard', label: 'Standard', icon: 'clock', desc: 'Start by 9-10 AM' },
    { id: 'late', label: 'Night Owl', icon: 'moon', desc: 'Start after 11 AM' },
];

// --- Component ---

export default function TripPreferencesScreen({ onBack, onComplete }) {
    const { colors, isDark } = useTheme();
    const { userPlan, tripPreferences, saveTripPreferences } = useTravelContext();

    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState({
        style: 'balanced',
        luxury: 'comfort',
        immersion: 'mixed',
        interests: [],
        rhythm: 'standard',
        transport: 'mix',
        dietary: [],
        health: [],
        budgetSplit: { stay: 40, food: 30, activities: 30 },
        ...tripPreferences
    });

    const [showProGate, setShowProGate] = useState(false);

    // Sync initial data
    useEffect(() => {
        if (tripPreferences) {
            setData(prev => ({ ...prev, ...tripPreferences }));
        }
    }, []);

    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const handleNext = () => {
        const nextStepIdx = currentStep + 1;

        // Check if finished
        if (nextStepIdx >= STEPS.length) {
            handleFinish();
            return;
        }

        // Check Pro Gate
        if (STEPS[nextStepIdx].isPro && userPlan !== 'pro') {
            setShowProGate(true);
        } else {
            setCurrentStep(nextStepIdx);
        }
    };

    const handleBackStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        } else {
            onBack?.();
        }
    };

    const handleFinish = async () => {
        await saveTripPreferences(data);
        onComplete?.(data);
    };

    const updateData = (key, value) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const toggleInterest = (id) => {
        const current = data.interests || [];
        if (current.includes(id)) {
            updateData('interests', current.filter(i => i !== id));
        } else {
            updateData('interests', [...current, id]);
        }
    };

    // --- Render Helpers ---

    const renderOptionCard = (item, selectedId, onSelect, type = 'row') => {
        const isSelected = selectedId === item.id;
        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                    type === 'grid' && { flex: 1, minWidth: '30%' }
                ]}
                onPress={() => onSelect(item.id)}
            >
                <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                    <Icon name={item.icon} size={20} color={isSelected ? '#FFF' : colors.primary} />
                </View>
                <View>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{item.label}</Text>
                    {item.desc && (
                        <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{item.desc}</Text>
                    )}
                </View>
                {isSelected && (
                    <View style={styles.checkBadge}>
                        <Icon name="check" size={10} color="#FFF" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderStepContent = () => {
        const step = STEPS[currentStep];

        switch (step.id) {
            case 'style':
                return (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.sectionTitle}>Pace of Travel</Text>
                        <View style={styles.optionsGrid}>
                            {TRAVEL_VIBES.map(v => renderOptionCard(v, data.style, (id) => updateData('style', id)))}
                        </View>

                        <Text style={styles.sectionTitle}>Comfort Level</Text>
                        <View style={styles.optionsGrid}>
                            {LUXURY_LEVELS.map(v => renderOptionCard(v, data.luxury, (id) => updateData('luxury', id)))}
                        </View>

                        <Text style={styles.sectionTitle}>Cultural Immersion</Text>
                        <View style={styles.optionsGrid}>
                            {IMMERSION_LEVELS.map(v => renderOptionCard(v, data.immersion, (id) => updateData('immersion', id)))}
                        </View>
                    </ScrollView>
                );

            case 'interests':
                return (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.sectionTitle}>What interests you?</Text>
                        <Text style={styles.sectionSubtitle}>Select up to 5 topics</Text>
                        <View style={styles.tagsContainer}>
                            {INTERESTS.map(item => {
                                const isSelected = (data.interests || []).includes(item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.tag, isSelected && styles.tagSelected]}
                                        onPress={() => toggleInterest(item.id)}
                                    >
                                        <Icon name={item.icon} size={16} color={isSelected ? '#FFF' : colors.text} style={{ marginRight: 6 }} />
                                        <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                );

            case 'logistics': // PRO
                return (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO FEATURE</Text></View>
                        <Text style={styles.sectionTitle}>Daily Rhythm</Text>
                        <View style={styles.optionsGrid}>
                            {DAILY_RHYTHMS.map(v => renderOptionCard(v, data.rhythm, (id) => updateData('rhythm', id)))}
                        </View>
                        {/* Add more pro fields here later */}
                        <Text style={styles.sectionTitle}>Accessibility & Transport</Text>
                        <View style={styles.placeholderBox}>
                            <Text style={styles.placeholderText}>More granular transport controls coming soon.</Text>
                        </View>
                    </ScrollView>
                );

            case 'constraints': // PRO
            case 'budget': // PRO
                return (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO FEATURE</Text></View>
                        <Text style={styles.sectionTitle}>{step.title}</Text>
                        <View style={styles.placeholderBox}>
                            <Text style={styles.placeholderText}>Advanced AI analysis for {step.title.toLowerCase()} is active.</Text>
                            <Icon name="sparkles" size={40} color={colors.primary} style={{ marginTop: 16 }} />
                        </View>
                    </ScrollView>
                );

            default: return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackStep} style={styles.backBtn}>
                    <Icon name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} />
                </View>
                <View style={{ width: 40 }} />
            </View>

            <Text style={styles.stepTitle}>{STEPS[currentStep].title}</Text>

            {/* Content */}
            <View style={{ flex: 1 }}>
                {renderStepContent()}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                    <Text style={styles.nextBtnText}>
                        {currentStep === STEPS.length - 1 ? 'Finish & Save' : 'Next'}
                    </Text>
                    <Icon name="arrow-right" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Pro Gate Overlay */}
            {showProGate && (
                <View style={styles.overlay}>
                    <View style={styles.gateCard}>
                        <View style={styles.gateIconBg}>
                            <Icon name="crown" size={32} color="#F59E0B" />
                        </View>
                        <Text style={styles.gateTitle}>Unlock Pro Personalization</Text>
                        <Text style={styles.gateDesc}>
                            Get hyper-personalized daily schedules, precise budget tracking, and health-focused planning.
                        </Text>

                        <TouchableOpacity
                            style={styles.upgradeBtn}
                            onPress={() => {
                                setShowProGate(false);
                                onComplete?.('Subscription'); // Signal to navigate to subscription
                            }}
                        >
                            <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.skipBtn}
                            onPress={() => handleFinish()}
                        >
                            <Text style={styles.skipBtnText}>Save Basic Preferences</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Dev Status (Hidden/Small) */}
            <View style={styles.devToggle}>
                <Text style={styles.devToggleText}>{userPlan.toUpperCase()}</Text>
            </View>

        </SafeAreaView>
    );
}

const createStyles = (colors, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        justifyContent: 'space-between',
    },
    backBtn: { padding: 8 },
    progressContainer: {
        flex: 1,
        height: 6,
        backgroundColor: colors.card,
        borderRadius: 3,
        marginHorizontal: 20,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginTop: 24,
        marginBottom: 12,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 16,
        marginTop: -8,
    },
    optionsGrid: {
        gap: 12,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        marginBottom: 8,
    },
    optionCardSelected: {
        backgroundColor: colors.primary + '10', // 10% opacity
        borderColor: colors.primary,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    iconCircleSelected: {
        backgroundColor: colors.primary,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    optionLabelSelected: {
        color: colors.primary,
    },
    optionDesc: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    optionDescSelected: {
        color: colors.text,
    },
    checkBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
    },
    tagSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tagText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '500',
    },
    tagTextSelected: {
        color: '#FFF',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.primaryBorder,
    },
    nextBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    nextBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },

    // Pro Overlay
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 100,
    },
    gateCard: {
        backgroundColor: colors.card,
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
    },
    gateIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F59E0B20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    gateTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    gateDesc: {
        fontSize: 15,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    upgradeBtn: {
        backgroundColor: '#F59E0B',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    upgradeBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    skipBtn: {
        paddingVertical: 12,
    },
    skipBtnText: {
        color: colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },

    // Dev Toggle
    devToggle: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(255,0,0,0.2)',
        padding: 4,
        borderRadius: 4,
    },
    devToggleText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'red',
    },

    // Pro Badge
    proBadge: {
        backgroundColor: '#F59E0B',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 12,
    },
    proBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    placeholderBox: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: colors.textMuted,
        textAlign: 'center',
        fontSize: 15,
    },
});
