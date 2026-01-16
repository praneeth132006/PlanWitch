import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    Modal, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';

export default function FoodChecklistScreen() {
    const { colors } = useTheme();
    const { tripInfo } = useTravelContext();
    const styles = useMemo(() => createStyles(colors), [colors]);

    // Animation refs
    const pulseAnim = useRef(new Animated.Value(1)).current;

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

    // Get places from trip info safely
    const places = useMemo(() => {
        try {
            if (!tripInfo?.destination) return [];

            if (Array.isArray(tripInfo.destination)) {
                return tripInfo.destination.map(d =>
                    typeof d === 'string' ? d : (d?.name || 'Unknown Place')
                );
            }

            if (typeof tripInfo.destination === 'string') {
                return tripInfo.destination.split(',').map(p => p.trim()).filter(Boolean);
            }

            // Fallback for object/unexpected type
            return ['My Trip'];
        } catch (e) {
            console.warn('Error parsing destinations', e);
            return [];
        }
    }, [tripInfo?.destination]);

    // Local state for food items
    const [foodItems, setFoodItems] = useState({});

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [newItemName, setNewItemName] = useState('');

    const openAddModal = (place) => {
        setSelectedPlace(place);
        setNewItemName('');
        setModalVisible(true);
    };

    const handleAddItem = () => {
        if (!newItemName.trim() || !selectedPlace) return;

        setFoodItems(prev => ({
            ...prev,
            [selectedPlace]: [
                ...(prev[selectedPlace] || []),
                { id: Date.now().toString(), name: newItemName.trim(), tried: false }
            ]
        }));
        setModalVisible(false);
    };

    const toggleTried = (place, itemId) => {
        setFoodItems(prev => ({
            ...prev,
            [place]: prev[place].map(item =>
                item.id === itemId ? { ...item, tried: !item.tried } : item
            )
        }));
    };

    const deleteItem = (place, itemId) => {
        setFoodItems(prev => ({
            ...prev,
            [place]: prev[place].filter(item => item.id !== itemId)
        }));
    };

    const getPlaceStats = (place) => {
        const items = foodItems[place] || [];
        return {
            total: items.length,
            tried: items.filter(i => i.tried).length
        };
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Food Checklist</Text>
                <Text style={styles.headerSubtitle}>
                    {typeof tripInfo?.destination === 'string' ? tripInfo.destination : 'Your Trip'} • {places.length} Places
                </Text>
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
                            {/* Use emoji text instead of Icon for 'food' to be safe against asset crashes */}
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
                        const items = foodItems[place] || [];
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
                                            <TouchableOpacity
                                                style={styles.addButton}
                                                onPress={() => openAddModal(place)}
                                            >
                                                <Text style={styles.addButtonIcon}>+</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Food Items List */}
                                        {!hasItems ? (
                                            <TouchableOpacity
                                                style={styles.emptyCard}
                                                onPress={() => openAddModal(place)}
                                            >
                                                <View style={styles.emptyCardIcon}>
                                                    <Text style={{ fontSize: 18 }}>🍽️</Text>
                                                </View>
                                                <View style={styles.emptyCardText}>
                                                    <Text style={styles.emptyCardTitle}>No food items yet</Text>
                                                    <Text style={styles.emptyCardSubtitle}>Tap + to add dishes to try in {place}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.itemsList}>
                                                {items.map((item) => (
                                                    <View key={item.id} style={[styles.itemCard, item.tried && styles.itemCardTried]}>
                                                        <TouchableOpacity
                                                            style={[styles.checkBox, item.tried && styles.checkBoxActive]}
                                                            onPress={() => toggleTried(place, item.id)}
                                                        >
                                                            {item.tried && <Icon name="check" size={12} color="#fff" />}
                                                        </TouchableOpacity>

                                                        <Text style={[styles.itemName, item.tried && styles.itemNameTried]}>
                                                            {item.name}
                                                        </Text>

                                                        <TouchableOpacity
                                                            style={styles.deleteBtn}
                                                            onPress={() => deleteItem(place, item.id)}
                                                        >
                                                            <Icon name="close" size={16} color={colors.textMuted} />
                                                        </TouchableOpacity>
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
                        />

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
        paddingTop: 16,
        paddingBottom: 8
    },
    headerTitle: {
        color: colors.text,
        fontSize: 28,
        fontWeight: 'bold'
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
        borderColor: colors.primaryBorder,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: colors.text,
        marginBottom: 20
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
        color: '#fff',
        fontWeight: 'bold'
    }
});
