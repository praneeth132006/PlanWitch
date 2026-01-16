import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';

export default function FoodListScreen() {
    const { colors } = useTheme();
    const { tripInfo, destinations } = useTravelContext();
    const styles = useMemo(() => createStyles(colors), [colors]);

    // Get locations from trip
    const locations = destinations?.length > 0
        ? destinations.map(d => d.name || d.destination)
        : [tripInfo?.destination].filter(Boolean);

    // State for food items per location
    const [foodItems, setFoodItems] = useState(() => {
        const initial = {};
        locations.forEach(loc => {
            initial[loc] = [];
        });
        return initial;
    });

    const [newFoodItem, setNewFoodItem] = useState({});
    const [expandedLocation, setExpandedLocation] = useState(locations[0] || null);

    const addFoodItem = (location) => {
        const item = newFoodItem[location]?.trim();
        if (!item) {
            Alert.alert('Enter Food Item', 'Please enter a food item name.');
            return;
        }
        setFoodItems(prev => ({
            ...prev,
            [location]: [...(prev[location] || []), { id: Date.now().toString(), name: item, tried: false }]
        }));
        setNewFoodItem(prev => ({ ...prev, [location]: '' }));
    };

    const toggleTried = (location, itemId) => {
        setFoodItems(prev => ({
            ...prev,
            [location]: prev[location].map(item =>
                item.id === itemId ? { ...item, tried: !item.tried } : item
            )
        }));
    };

    const removeItem = (location, itemId) => {
        setFoodItems(prev => ({
            ...prev,
            [location]: prev[location].filter(item => item.id !== itemId)
        }));
    };

    if (locations.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🍽️</Text>
                    <Text style={styles.emptyTitle}>No Destinations Yet</Text>
                    <Text style={styles.emptySubtitle}>Add destinations to your trip to start building your food list!</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerIcon}>🍽️</Text>
                    <View>
                        <Text style={styles.headerTitle}>Food to Try</Text>
                        <Text style={styles.headerSubtitle}>Local dishes at each destination</Text>
                    </View>
                </View>

                {/* Location Sections */}
                {locations.map(location => {
                    const isExpanded = expandedLocation === location;
                    const items = foodItems[location] || [];
                    const triedCount = items.filter(i => i.tried).length;

                    return (
                        <View key={location} style={styles.locationCard}>
                            {/* Location Header */}
                            <Pressable
                                style={styles.locationHeader}
                                onPress={() => setExpandedLocation(isExpanded ? null : location)}
                            >
                                <View style={styles.locationLeft}>
                                    <Text style={styles.locationIcon}>📍</Text>
                                    <View>
                                        <Text style={styles.locationName}>{location}</Text>
                                        <Text style={styles.locationCount}>
                                            {items.length} items • {triedCount} tried
                                        </Text>
                                    </View>
                                </View>
                                <Icon
                                    name={isExpanded ? "arrow-up" : "arrow-down"}
                                    size={20}
                                    color={colors.textMuted}
                                />
                            </Pressable>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <View style={styles.locationContent}>
                                    {/* Add Food Input */}
                                    <View style={styles.addRow}>
                                        <TextInput
                                            style={styles.addInput}
                                            placeholder="Add a dish to try..."
                                            placeholderTextColor={colors.textMuted}
                                            value={newFoodItem[location] || ''}
                                            onChangeText={(text) => setNewFoodItem(prev => ({ ...prev, [location]: text }))}
                                            onSubmitEditing={() => addFoodItem(location)}
                                        />
                                        <Pressable
                                            style={styles.addBtn}
                                            onPress={() => addFoodItem(location)}
                                        >
                                            <Icon name="plus" size={20} color="#fff" />
                                        </Pressable>
                                    </View>

                                    {/* Food List */}
                                    {items.length === 0 ? (
                                        <View style={styles.noItems}>
                                            <Text style={styles.noItemsText}>No food items yet. Add some local dishes to try!</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.foodList}>
                                            {items.map(item => (
                                                <View key={item.id} style={[styles.foodItem, item.tried && styles.foodItemTried]}>
                                                    <Pressable
                                                        style={[styles.checkCircle, item.tried && styles.checkCircleChecked]}
                                                        onPress={() => toggleTried(location, item.id)}
                                                    >
                                                        {item.tried && <Icon name="check" size={14} color="#fff" />}
                                                    </Pressable>
                                                    <Text style={[styles.foodName, item.tried && styles.foodNameTried]}>
                                                        {item.name}
                                                    </Text>
                                                    <Pressable
                                                        style={styles.removeBtn}
                                                        onPress={() => removeItem(location, item.id)}
                                                    >
                                                        <Icon name="close" size={16} color={colors.error || '#ff4444'} />
                                                    </Pressable>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Suggestions */}
                                    <View style={styles.suggestions}>
                                        <Text style={styles.suggestionsTitle}>💡 Popular in {location}</Text>
                                        <View style={styles.suggestionChips}>
                                            {['Local Street Food', 'Traditional Cuisine', 'Famous Desserts', 'Regional Specialty'].map(sug => (
                                                <Pressable
                                                    key={sug}
                                                    style={styles.suggestionChip}
                                                    onPress={() => setNewFoodItem(prev => ({ ...prev, [location]: sug }))}
                                                >
                                                    <Text style={styles.suggestionText}>{sug}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    headerIcon: {
        fontSize: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 2,
    },
    locationCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        overflow: 'hidden',
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    locationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    locationIcon: {
        fontSize: 24,
    },
    locationName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    locationCount: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    locationContent: {
        padding: 16,
        paddingTop: 0,
        gap: 16,
    },
    addRow: {
        flexDirection: 'row',
        gap: 10,
    },
    addInput: {
        flex: 1,
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
    },
    addBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noItems: {
        padding: 20,
        alignItems: 'center',
    },
    noItemsText: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
    foodList: {
        gap: 8,
    },
    foodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg,
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    foodItemTried: {
        opacity: 0.6,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    foodName: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
    },
    foodNameTried: {
        textDecorationLine: 'line-through',
        color: colors.textMuted,
    },
    removeBtn: {
        padding: 4,
    },
    suggestions: {
        marginTop: 8,
    },
    suggestionsTitle: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: 10,
    },
    suggestionChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    suggestionChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.primary + '20',
        borderWidth: 1,
        borderColor: colors.primary + '40',
    },
    suggestionText: {
        fontSize: 13,
        color: colors.primary,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
