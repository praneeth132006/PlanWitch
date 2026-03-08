import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    Modal, Animated, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';
import { CustomAlert } from '../components/CustomAlert';

export default function FoodChecklistScreen({ onSetScreen }) {
    const { colors } = useTheme();
    // Destructure new Context methods for persistence
    const { tripInfo, foodItems, addFoodItem, toggleFoodItem, deleteFoodItem, checkFeatureAccess } = useTravelContext();
    const styles = useMemo(() => createStyles(colors), [colors]);

    // Animation refs
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: () => { }, onCancel: null, confirmText: 'OK', cancelText: 'Cancel', neutralText: '' });

    const showAlert = (title, message, type = 'info', onConfirm = () => hideAlert(), onCancel = null, onNeutral = null, confirmText = 'OK', cancelText = 'Cancel', neutralText = '') => {
        setAlertConfig({ visible: true, title, message, type, onConfirm, onCancel, onNeutral, confirmText, cancelText, neutralText });
    };

    const hideAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    };

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    // Get places from trip info safely - FIXED PARSING
    // Get places from trip info safely - Uses STOPS only (excluding start/end)
    const places = useMemo(() => {
        try {
            if (!tripInfo?.stops || !Array.isArray(tripInfo.stops)) return [];

            // Extract names and filter duplicates
            const uniquePlaces = new Set();

            // If destination is a combined string "City A - City B", don't add it as a standalone header
            const dest = tripInfo.destination?.trim();
            const stopsExist = tripInfo.stops.length > 0;
            const isCombined = dest?.includes(' - ');

            if (dest && (!isCombined || !stopsExist)) {
                uniquePlaces.add(dest);
            }

            tripInfo.stops.forEach(stop => {
                if (stop.name) uniquePlaces.add(stop.name.trim());
            });

            return Array.from(uniquePlaces);
        } catch (e) {
            console.warn('Error parsing stops', e);
            return [];
        }
    }, [tripInfo?.destination, tripInfo?.stops]);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemType, setNewItemType] = useState(null); // 'Veg' | 'Non-Veg' | null
    const [newItemTime, setNewItemTime] = useState('');
    const [newItemLocation, setNewItemLocation] = useState('');

    const openAddModal = (place) => {
        setSelectedPlace(place);
        setNewItemName('');
        setNewItemType(null);
        setNewItemTime('');
        setNewItemLocation('');
        setModalVisible(true);
    };

    const handleAddItem = async () => {
        if (!newItemName.trim() || !selectedPlace) return;

        // Use Context method -> Persists to DB
        await addFoodItem(selectedPlace, newItemName.trim(), newItemType, newItemTime.trim(), newItemLocation.trim());
        setModalVisible(false);
    };



    // Derived helpers for UI, filtering the global persisted list by place
    const getPlaceItems = (place) => {
        return foodItems.filter(item => item.place === place);
    };

    const getPlaceStats = (place) => {
        const items = getPlaceItems(place);
        return {
            total: items.length,
            tried: items.filter(i => i.tried).length
        };
    };



    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="food" size={24} color={colors.text} style={{ marginRight: 8 }} />
                    <Text style={styles.headerTitle}>Food Checklist</Text>
                </View>
            </View>

            <ScrollView
                style={styles.mainScroll}
                contentContainerStyle={styles.mainScrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Empty State / Intro */}
                {places.length === 0 && (
                    <View style={styles.emptyHero}>
                        <View style={styles.emptyHeroGlobe}>
                            <Text style={{ fontSize: 50 }}>🍽️</Text>
                            <Animated.View style={[styles.emptyHeroRing, { transform: [{ scale: pulseAnim }] }]} />
                        </View>
                        <Text style={styles.emptyHeroTitle}>No Places Found</Text>
                        <Text style={styles.emptyHeroText}>Set up your trip destinations to start adding food items!</Text>
                    </View>
                )}

                {/* Timeline-style List */}
                <View style={styles.timeline}>
                    {places.map((place, index) => {
                        const items = getPlaceItems(place);
                        const hasItems = items.length > 0;
                        const isLast = index === places.length - 1;
                        const stats = getPlaceStats(place);

                        return (
                            <View key={index} style={styles.daySection}>
                                <View style={styles.dayCard}>
                                    {/* Left Column (Number) */}
                                    <View style={styles.dayCardLeft}>
                                        <View style={[styles.dayBadge, hasItems && styles.dayBadgeActive]}>
                                            <Text style={[styles.dayBadgeText, hasItems && styles.dayBadgeTextActive]}>{index + 1}</Text>
                                        </View>
                                        {!isLast && <View style={styles.dayConnector} />}
                                    </View>

                                    {/* Content Column */}
                                    <View style={styles.dayCardContent}>
                                        {/* Header */}
                                        <View style={styles.dayCardHeader}>
                                            <View>
                                                <Text style={styles.dayCardTitle}>{place}</Text>
                                                <Text style={styles.dayCardStats}>
                                                    {stats.total} items • {stats.tried} tried
                                                </Text>
                                            </View>
                                            {!tripInfo.isCompleted && (
                                                <TouchableOpacity
                                                    style={styles.addButton}
                                                    onPress={() => openAddModal(place)}
                                                >
                                                    <Text style={styles.addButtonIcon}>+</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Food Items List */}
                                        {!hasItems ? (
                                            <TouchableOpacity
                                                style={styles.emptyCard}
                                                onPress={() => !tripInfo.isCompleted && openAddModal(place)}
                                                activeOpacity={tripInfo.isCompleted ? 1 : 0.7}
                                            >
                                                <View style={styles.emptyCardIcon}>
                                                    <Text style={{ fontSize: 18 }}>🍽️</Text>
                                                </View>
                                                <View style={styles.emptyCardText}>
                                                    <Text style={styles.emptyCardTitle}>No food items yet</Text>
                                                    {!tripInfo.isCompleted && (
                                                        <Text style={styles.emptyCardSubtitle}>Tap + to add dishes to try in {place}</Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.itemsList}>
                                                {items.map((item) => (
                                                    <View key={item.id} style={[styles.itemCard, item.tried && styles.itemCardTried]}>
                                                        <TouchableOpacity
                                                            style={[styles.checkBox, item.tried && styles.checkBoxActive]}
                                                            onPress={() => !tripInfo.isCompleted && toggleFoodItem(item.id)}
                                                            activeOpacity={tripInfo.isCompleted ? 1 : 0.7}
                                                        >
                                                            {item.tried && <Icon name="check" size={12} color="#fff" />}
                                                        </TouchableOpacity>

                                                        {/* Veg/Non-Veg Indicator - Case insensitive check */}
                                                        {item.type && (
                                                            <View style={[{
                                                                width: 16, height: 16, borderWidth: 1,
                                                                borderColor: item.type?.toLowerCase().includes('non') ? '#EF4444' : '#22C55E',
                                                                alignItems: 'center', justifyContent: 'center', marginRight: 10
                                                            }]}>
                                                                <View style={[{
                                                                    width: 8, height: 8, borderRadius: 4,
                                                                    backgroundColor: item.type?.toLowerCase().includes('non') ? '#EF4444' : '#22C55E'
                                                                }]} />
                                                            </View>
                                                        )}

                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.itemName, item.tried && styles.itemNameTried]}>
                                                                {item.name}
                                                            </Text>
                                                            {(item.bestTime || item.bestLocation) && (
                                                                <View style={styles.itemDetails}>
                                                                    {item.bestTime && (
                                                                        <View style={styles.detailRow}>
                                                                            <Icon name="calendar" size={10} color={colors.textLight} />
                                                                            <Text style={styles.detailText}>{item.bestTime}</Text>
                                                                        </View>
                                                                    )}
                                                                    {item.bestLocation && (
                                                                        <View style={styles.detailRow}>
                                                                            <Icon name="location" size={10} color={colors.textLight} />
                                                                            <Text style={styles.detailText}>{item.bestLocation}</Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            )}
                                                        </View>

                                                        {!tripInfo.isCompleted && (
                                                            <TouchableOpacity
                                                                style={styles.deleteBtn}
                                                                onPress={() => deleteFoodItem(item.id)}
                                                            >
                                                                <Icon name="close" size={16} color={colors.textMuted} />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add Item Modal */}
            <Modal
                transparent
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Food Item</Text>
                        <Text style={styles.modalSubtitle}>What do you want to eat in {selectedPlace}?</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Sushi, Gelato, Pad Thai..."
                            placeholderTextColor={colors.textMuted}
                            value={newItemName}
                            onChangeText={setNewItemName}
                            autoFocus={false}
                            selectionColor={colors.text}
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Best Time</Text>
                                <TextInput
                                    style={[styles.input, { marginBottom: 0 }]}
                                    placeholder="e.g. Dinner"
                                    placeholderTextColor={colors.textMuted}
                                    value={newItemTime}
                                    onChangeText={setNewItemTime}
                                    selectionColor={colors.text}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Best Area/Stall</Text>
                                <TextInput
                                    style={[styles.input, { marginBottom: 0 }]}
                                    placeholder="e.g. Center Street"
                                    placeholderTextColor={colors.textMuted}
                                    value={newItemLocation}
                                    onChangeText={setNewItemLocation}
                                    selectionColor={colors.text}
                                />
                            </View>
                        </View>

                        {/* Veg/Non-Veg Selector */}
                        <View style={{ flexDirection: 'row', marginBottom: 20, gap: 12 }}>
                            <TouchableOpacity
                                style={[
                                    styles.typeBtn,
                                    newItemType === 'Veg' && { borderColor: 'green', backgroundColor: 'rgba(0, 128, 0, 0.1)' }
                                ]}
                                onPress={() => setNewItemType(newItemType === 'Veg' ? null : 'Veg')}
                            >
                                <View style={[styles.dot, { backgroundColor: 'green' }]} />
                                <Text style={[styles.typeBtnText, newItemType === 'Veg' && { color: 'green' }]}>Veg</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeBtn,
                                    newItemType === 'Non-Veg' && { borderColor: 'red', backgroundColor: 'rgba(255, 0, 0, 0.1)' }
                                ]}
                                onPress={() => setNewItemType(newItemType === 'Non-Veg' ? null : 'Non-Veg')}
                            >
                                <View style={[styles.dot, { backgroundColor: 'red' }]} />
                                <Text style={[styles.typeBtnText, newItemType === 'Non-Veg' && { color: 'red' }]}>Non-Veg</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalBtnCancel}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnAdd, !newItemName.trim() && { opacity: 0.5 }]}
                                onPress={handleAddItem}
                                disabled={!newItemName.trim()}
                            >
                                <Text style={styles.modalBtnTextAdd}>Add Item</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>



            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
                onCancel={alertConfig.onCancel}
                onNeutral={alertConfig.onNeutral}
                confirmText={alertConfig.confirmText}
                cancelText={alertConfig.cancelText}
                neutralText={alertConfig.neutralText}
            />
        </SafeAreaView>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10
    },
    headerTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '800'
    },
    headerSubtitle: {
        color: colors.primary,
        fontSize: 14,
        marginTop: 4
    },
    mainScroll: {
        flex: 1,
        marginTop: 10,
    },
    mainScrollContent: {
        flexGrow: 1,
    },
    timeline: {
        paddingHorizontal: 20,
        paddingTop: 10
    },
    daySection: {
        marginBottom: 8
    },
    dayCard: {
        flexDirection: 'row'
    },
    dayCardLeft: {
        alignItems: 'center',
        width: 40
    },
    dayBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: colors.primaryBorder,
        alignItems: 'center',
        justifyContent: 'center'
    },
    dayBadgeActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary
    },
    dayBadgeText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: 'bold'
    },
    dayBadgeTextActive: {
        color: colors.bg
    },
    dayConnector: {
        width: 2,
        flex: 1,
        backgroundColor: colors.primaryBorder,
        marginVertical: 4
    },
    dayCardContent: {
        flex: 1,
        marginLeft: 12,
        paddingBottom: 24
    },
    dayCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    dayCardTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold'
    },
    dayCardStats: {
        color: colors.textMuted,
        fontSize: 12,
        marginTop: 2
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primaryMuted,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        alignItems: 'center',
        justifyContent: 'center'
    },
    addButtonIcon: {
        color: colors.primary,
        fontSize: 20,
        fontWeight: 'bold'
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        marginHorizontal: 20,
        marginBottom: 10,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    aiButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15
    },

    // Empty Card state for a place
    emptyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        borderStyle: 'dashed'
    },
    emptyCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    emptyCardText: {
        flex: 1
    },
    emptyCardTitle: {
        color: colors.textMuted,
        fontSize: 13,
        fontWeight: '500'
    },
    emptyCardSubtitle: {
        color: colors.textLight,
        fontSize: 11,
        marginTop: 2
    },

    // Food Items
    itemsList: {
        gap: 8
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    itemCardTried: {
        opacity: 0.7,
        backgroundColor: colors.bg
    },
    checkBox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    checkBoxActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary
    },
    itemName: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        fontWeight: '500'
    },
    itemNameTried: {
        textDecorationLine: 'line-through',
        color: colors.textMuted
    },
    deleteBtn: {
        padding: 6
    },

    // Empty Hero (Global)
    emptyHero: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    emptyHeroGlobe: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyHeroRing: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: colors.primary, opacity: 0.4 },
    emptyHeroTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
    emptyHeroText: { color: colors.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        alignItems: 'stretch'
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center'
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 20
    },
    input: {
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: '#4B5563', // Hardcoded Gray Fix
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: colors.text,
        marginBottom: 20
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        marginBottom: 6,
        marginLeft: 4,
        textTransform: 'uppercase'
    },
    itemDetails: {
        marginTop: 4,
        gap: 2,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 11,
        color: colors.textLight,
        fontWeight: '500',
    },
    typeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.textMuted,
        backgroundColor: colors.bg
    },
    typeBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        marginLeft: 8
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12
    },
    modalBtnCancel: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        alignItems: 'center'
    },
    modalBtnTextCancel: {
        color: colors.text,
        fontWeight: '600'
    },
    modalBtnAdd: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center'
    },
    modalBtnTextAdd: {
        color: colors.bg,
        fontWeight: 'bold'
    }
});
