import React, { useState, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, Pressable,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';
import { generateFullPersonalizedPlan } from '../services/aiService';

export default function AIPersonalizedPlanScreen({ navigation }) {
    const { colors } = useTheme();
    const { currency, tripInfo, tripPreferences } = useTravelContext();
    const [loading, setLoading] = useState(false);

    // Form State
    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');
    const [stops, setStops] = useState([{ location: '', days: '1' }]);
    const [dietary, setDietary] = useState('Non-Veg'); // Veg or Non-Veg
    const [travelers, setTravelers] = useState('2');
    const [ages, setAges] = useState('');
    const [budget, setBudget] = useState('2000');
    const [additionalNotes, setAdditionalNotes] = useState('');

    // Pre-fill from Context
    useEffect(() => {
        if (tripInfo) {
            if (tripInfo.destination) setEndLocation(tripInfo.destination);
            if (tripInfo.budget?.total) setBudget(tripInfo.budget.total.toString());
            const count = tripInfo.participants?.length || 1;
            setTravelers(count.toString());
        }

        if (tripPreferences && Object.keys(tripPreferences).length > 0) {
            const parts = [];
            if (tripPreferences.style) parts.push(`Travel Pace: ${tripPreferences.style}`);
            if (tripPreferences.luxury) parts.push(`Comfort Level: ${tripPreferences.luxury}`);
            if (tripPreferences.immersion) parts.push(`Experience: ${tripPreferences.immersion}`);
            if (tripPreferences.interests?.length) parts.push(`Interests: ${tripPreferences.interests.join(', ')}`);
            if (tripPreferences.rhythm) parts.push(`Daily Rhythm: ${tripPreferences.rhythm}`);

            // Map dietary if common match found
            if (tripPreferences.dietary?.some(d => d.toLowerCase().includes('veg') && !d.toLowerCase().includes('non'))) {
                setDietary('Veg');
            } else {
                setDietary('Non-Veg');
            }

            setAdditionalNotes(prev => [prev, ...parts].filter(Boolean).join('\n'));
        }
    }, [tripInfo, tripPreferences]);

    // Result State
    const [planResult, setPlanResult] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [lastPrompt, setLastPrompt] = useState('');
    const [showManualModal, setShowManualModal] = useState(false);

    const styles = useMemo(() => createStyles(colors), [colors]);

    const addStop = () => setStops([...stops, { location: '', days: '1' }]);
    const removeStop = (index) => {
        const newStops = stops.filter((_, i) => i !== index);
        setStops(newStops);
    };
    const updateStop = (index, field, value) => {
        const newStops = [...stops];
        newStops[index][field] = value;
        setStops(newStops);
    };

    const handleGenerate = async () => {
        if (!startLocation || !endLocation) {
            Alert.alert('Missing Info', 'Please provide at least a start and end location.');
            return;
        }

        setLoading(true);
        setPlanResult(null);
        const totalDays = stops.reduce((acc, stop) => acc + parseInt(stop.days || 0), 0);
        const details = {
            startLocation,
            endLocation,
            stops,
            totalDays,
            budget: `${currency.symbol}${budget}`,
            dietary,
            travelers,
            ages,
            additionalNotes
        };

        // Construct the prompt manually so we can offer it as a fallback
        const prompt = `Act as a premium travel concierge. Create a comprehensive, billionaire-level travel plan based on these details:
- Start Location: ${details.startLocation}
- End Location: ${details.endLocation}
- Stops: ${JSON.stringify(details.stops)}
- Total Days: ${details.totalDays}
- Budget: ${details.budget}
- Dietary Preference: ${details.dietary}
- Travelers: ${details.travelers} (Ages: ${details.ages})
- Additional Notes: ${details.additionalNotes}

Return ONLY a JSON object (no extra text) with this exact structure:
{
  "success": true,
  "itinerary": [
    {
      "day": 1,
      "title": "Day Title",
      "activities": [
        { "time": "hh:mm AM/PM", "title": "Activity Name", "description": "Brief description", "cost": "est cost" }
      ]
    }
  ],
  "packingList": [
    { "category": "Clothing/Gear/Health", "items": ["Item name with reason"] }
  ],
  "foodRecommendations": [
    { "name": "Dish/Restaurant Name", "description": "Why they should try it", "isVegFriendly": true }
  ],
  "budgetAnalysis": {
    "summary": "Short breakdown of how to spend the budget",
    "tips": ["Tip 1", "Tip 2"]
  }
}`;
        setLastPrompt(prompt);

        try {
            const result = await generateFullPersonalizedPlan(details);
            if (result.success) {
                setPlanResult(result);
                setShowResultModal(true);
            } else {
                setLastPrompt(prompt);
                setShowManualModal(true);
            }
        } catch (error) {
            setLastPrompt(prompt);
            setShowManualModal(true);
        } finally {
            setLoading(false);
        }
    };

    const copyPrompt = async () => {
        await Clipboard.setStringAsync(lastPrompt);
        Alert.alert('Copied!', 'Prompt copied to clipboard. You can paste it into Gemini or ChatGPT.');
    };

    const renderResultModal = () => {
        if (!planResult) return null;

        return (
            <Modal
                visible={showResultModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowResultModal(false)}
            >
                <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.headerTitle}>Your Master Plan 👑</Text>
                        <Pressable onPress={() => setShowResultModal(false)} style={styles.closeBtn}>
                            <Icon name="close" size={24} color={colors.text} />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 60 }}
                    >
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultMainTitle}>Epic Journey Found! ✨</Text>
                            <Text style={styles.resultSubtitle}>Refined by TravelWitch AI</Text>
                        </View>

                        {/* Itinerary Section */}
                        <View style={styles.resultSection}>
                            <Text style={styles.resultSectionTitle}>🗺️ Complete Itinerary</Text>
                            {planResult.itinerary.map((day, idx) => (
                                <View key={idx} style={styles.itineraryDay}>
                                    <View style={styles.dayDot} />
                                    <Text style={styles.itineraryDayTitle}>Day {day.day}: {day.title}</Text>
                                    {day.activities.map((act, aIdx) => (
                                        <View key={aIdx} style={styles.itineraryAct}>
                                            <View style={styles.timeLabel}>
                                                <Text style={styles.itineraryTime}>{act.time}</Text>
                                            </View>
                                            <View style={styles.itineraryContentBox}>
                                                <Text style={styles.itineraryActTitle}>{act.title}</Text>
                                                <Text style={styles.itineraryActDesc}>{act.description}</Text>
                                                {act.cost && <Text style={styles.itineraryCost}>💰 {act.cost}</Text>}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </View>

                        {/* Packing List Section */}
                        <View style={styles.resultSection}>
                            <Text style={styles.resultSectionTitle}>🎒 Smart Packing List</Text>
                            <View style={styles.glassCard}>
                                {planResult.packingList.map((cat, idx) => (
                                    <View key={idx} style={styles.packingCat}>
                                        <Text style={styles.packingCatTitle}>{cat.category}</Text>
                                        {cat.items.map((item, iIdx) => (
                                            <View key={iIdx} style={styles.packingItemRow}>
                                                <View style={styles.bullet} />
                                                <Text style={styles.packingItem}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Food Section */}
                        <View style={styles.resultSection}>
                            <Text style={styles.resultSectionTitle}>🍱 Local Food Guide ({dietary})</Text>
                            {planResult.foodRecommendations.map((food, idx) => (
                                <View key={idx} style={styles.foodCard}>
                                    <View style={styles.foodHeader}>
                                        <Text style={styles.foodName}>{food.name}</Text>
                                        {food.isVegFriendly && <View style={styles.vegBadge}><Text style={styles.vegText}>VEG</Text></View>}
                                    </View>
                                    <Text style={styles.foodDesc}>{food.description}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Budget Section */}
                        <View style={styles.resultSection}>
                            <Text style={styles.resultSectionTitle}>💰 Budget Strategy</Text>
                            <View style={styles.budgetCard}>
                                <Text style={styles.budgetText}>{planResult.budgetAnalysis.summary}</Text>
                                {planResult.budgetAnalysis.tips.map((tip, idx) => (
                                    <View key={idx} style={styles.tipRow}>
                                        <Text style={styles.budgetTip}>✨ {tip}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        );
    };

    const renderManualModal = () => {
        return (
            <Modal
                visible={showManualModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowManualModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.manualModal}>
                        <Text style={styles.manualTitle}>AI Connection Timeout 🔌</Text>
                        <Text style={styles.manualDesc}>
                            I'm having trouble connecting to the AI brain right now. You can copy the custom prompt I created for you and paste it into ChatGPT or Gemini to get your plan instantly!
                        </Text>

                        <View style={styles.promptBox}>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                                <Text style={styles.promptText}>{lastPrompt}</Text>
                            </ScrollView>
                        </View>

                        <Pressable style={styles.copyBtn} onPress={copyPrompt}>
                            <Text style={styles.copyBtnText}>Copy Prompt & Open Google ✨</Text>
                        </Pressable>

                        <Pressable style={styles.cancelLink} onPress={() => setShowManualModal(false)}>
                            <Text style={styles.cancelLinkText}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Icon name="close" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Master Plan ✨</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 60 }}
                >
                    <Text style={styles.sectionTitle}>🗺️ Route Details</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Start Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., New York, NY"
                            placeholderTextColor={colors.textMuted}
                            value={startLocation}
                            onChangeText={setStartLocation}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>End Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Los Angeles, CA"
                            placeholderTextColor={colors.textMuted}
                            value={endLocation}
                            onChangeText={setEndLocation}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>📍 Intermediate Stops</Text>
                        <Pressable onPress={addStop} style={styles.addStopBtn}>
                            <Text style={styles.addStopText}>+ Add Stop</Text>
                        </Pressable>
                    </View>

                    {stops.map((stop, index) => (
                        <View key={index} style={styles.stopCard}>
                            <View style={styles.stopInputRow}>
                                <TextInput
                                    style={[styles.input, { flex: 2 }]}
                                    placeholder="Stop location"
                                    placeholderTextColor={colors.textMuted}
                                    value={stop.location}
                                    onChangeText={(v) => updateStop(index, 'location', v)}
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                                    placeholder="Days"
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.textMuted}
                                    value={stop.days}
                                    onChangeText={(v) => updateStop(index, 'days', v)}
                                />
                                {stops.length > 1 && (
                                    <Pressable onPress={() => removeStop(index)} style={styles.removeBtn}>
                                        <Icon name="close" size={20} color="#EF4444" />
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    ))}

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>🍱 Preferences & Crew</Text>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Dietary</Text>
                            <View style={styles.toggleRow}>
                                <Pressable
                                    onPress={() => setDietary('Veg')}
                                    style={[styles.toggleBtn, dietary === 'Veg' && styles.toggleActive]}
                                >
                                    <Text style={[styles.toggleText, dietary === 'Veg' && styles.toggleTextActive]}>Veg</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setDietary('Non-Veg')}
                                    style={[styles.toggleBtn, dietary === 'Non-Veg' && styles.toggleActive]}
                                >
                                    <Text style={[styles.toggleText, dietary === 'Non-Veg' && styles.toggleTextActive]}>Non-Veg</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Total People</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={travelers}
                                onChangeText={setTravelers}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Ages of Travellers (e.g., 25, 28, 5)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="List ages separated by commas"
                            placeholderTextColor={colors.textMuted}
                            value={ages}
                            onChangeText={setAges}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Budget ({currency.symbol})</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={budget}
                            onChangeText={setBudget}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Anything else? (Interests, special needs...)</Text>
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="e.g., We love museums and quiet parks. Traveling with a senior."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            value={additionalNotes}
                            onChangeText={setAdditionalNotes}
                        />
                    </View>

                    <Pressable
                        style={({ pressed }) => [styles.generateBtn, (loading || pressed) && { opacity: 0.8 }]}
                        onPress={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ActivityIndicator color="white" style={{ marginRight: 10 }} />
                                <Text style={styles.generateBtnText}>AI is calculating...</Text>
                            </View>
                        ) : (
                            <Text style={styles.generateBtnText}>Create My Master Plan ✨</Text>
                        )}
                    </Pressable>
                </ScrollView>
                {renderResultModal()}
                {renderManualModal()}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.primaryBorder,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    backBtn: { padding: 5 },
    content: { flex: 1, padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, color: colors.textMuted, marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        fontSize: 15,
    },
    divider: { height: 1, backgroundColor: colors.primaryBorder, marginVertical: 20 },
    stopCard: { marginBottom: 10 },
    stopInputRow: { flexDirection: 'row', alignItems: 'center' },
    removeBtn: { marginLeft: 10, padding: 5 },
    addStopBtn: { backgroundColor: colors.primaryMuted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    addStopText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
    row: { flexDirection: 'row', marginBottom: 5 },
    toggleRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.primaryBorder },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    toggleActive: { backgroundColor: colors.primary },
    toggleText: { color: colors.textMuted, fontWeight: '600' },
    toggleTextActive: { color: 'white' },
    generateBtn: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    generateBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

    // Modal Styles
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.primaryBorder,
    },
    closeBtn: { padding: 8, backgroundColor: colors.cardLight, borderRadius: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    manualModal: { backgroundColor: colors.card, borderRadius: 24, padding: 25, width: '100%', borderWidth: 1, borderColor: colors.primaryBorder },
    manualTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 12, textAlign: 'center' },
    manualDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 20, textAlign: 'center' },
    promptBox: { backgroundColor: colors.bg, borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: colors.primaryBorder },
    promptText: { fontSize: 12, color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    copyBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 15 },
    copyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    cancelLink: { alignItems: 'center' },
    cancelLinkText: { color: colors.textMuted, fontWeight: '600' },

    // Result Styles
    resultHeader: { alignItems: 'center', marginBottom: 30, paddingVertical: 30 },
    resultMainTitle: { fontSize: 28, fontWeight: '900', color: colors.primary, marginBottom: 8, textAlign: 'center' },
    resultSubtitle: { fontSize: 14, color: colors.textMuted, letterSpacing: 2, fontWeight: '600' },
    resultSection: { marginBottom: 40 },
    resultSectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: colors.primary, paddingLeft: 12 },

    itineraryDay: { marginBottom: 25, paddingLeft: 15, borderLeftWidth: 2, borderLeftColor: colors.primaryBorder },
    dayDot: { position: 'absolute', left: -7, top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.bg },
    itineraryDayTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 20 },
    itineraryAct: { flexDirection: 'row', marginBottom: 15 },
    timeLabel: { width: 75 },
    itineraryTime: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
    itineraryContentBox: { flex: 1, backgroundColor: colors.card, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.primaryBorder },
    itineraryActTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    itineraryActDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    itineraryCost: { fontSize: 12, fontWeight: '700', color: colors.secondary, marginTop: 8 },

    glassCard: { backgroundColor: colors.card, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: colors.primaryBorder },
    packingCat: { marginBottom: 25 },
    packingCatTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: 12, textTransform: 'uppercase', opacity: 0.8 },
    packingItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 10 },
    packingItem: { fontSize: 14, color: colors.text, lineHeight: 20 },

    foodCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: colors.primaryBorder },
    foodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    foodName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    vegBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#10B981' },
    vegText: { color: '#10B981', fontSize: 11, fontWeight: '900' },
    foodDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },

    budgetCard: { backgroundColor: colors.card, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: colors.primaryBorder },
    budgetText: { fontSize: 15, color: colors.text, lineHeight: 24, marginBottom: 20, opacity: 0.9 },
    tipRow: { flexDirection: 'row', marginBottom: 10 },
    budgetTip: { fontSize: 14, color: colors.primary, fontWeight: '700' },
});
