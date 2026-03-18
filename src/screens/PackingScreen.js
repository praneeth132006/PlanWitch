import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Animated, ActivityIndicator, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';
import { CustomAlert } from '../components/CustomAlert';

const PACKING_CATEGORIES = [
  { key: 'essentials', label: 'Essentials', icon: 'passport', color: '#EF4444', emoji: '📋' },
  { key: 'clothing', label: 'Clothing', icon: 'packing', color: '#3B82F6', emoji: '👔' },
  { key: 'toiletries', label: 'Toiletries', icon: 'bathtub', color: '#10B981', emoji: '🧴' },
  { key: 'electronics', label: 'Electronics', icon: 'mobile', color: '#F59E0B', emoji: '📱' },
  { key: 'documents', label: 'Documents', icon: 'passport', color: '#8B5CF6', emoji: '📄' },
  { key: 'health', label: 'Health', icon: 'health', color: '#EC4899', emoji: '💊' },
  { key: 'accessories', label: 'Accessories', icon: 'shopping', color: '#14B8A6', emoji: '🎒' },
  { key: 'other', label: 'Other', icon: 'other', color: '#6B7280', emoji: '📦' },
];

const QUICK_ADD_ITEMS = {
  essentials: ['Passport', 'Wallet', 'Phone', 'Keys', 'Cash', 'ID Card'],
  clothing: ['T-Shirts', 'Pants', 'Underwear', 'Socks', 'Jacket', 'Sleepwear'],
  toiletries: ['Toothbrush', 'Toothpaste', 'Shampoo', 'Deodorant', 'Sunscreen', 'Razor'],
  electronics: ['Charger', 'Power Bank', 'Headphones', 'Camera', 'Adapter', 'Laptop'],
  documents: ['Tickets', 'Insurance', 'Hotel Booking', 'Visa', 'Itinerary'],
  health: ['Medications', 'First Aid Kit', 'Vitamins', 'Hand Sanitizer'],
  accessories: ['Sunglasses', 'Watch', 'Belt', 'Hat', 'Umbrella', 'Bag'],
  other: ['Snacks', 'Books', 'Games', 'Gifts', 'Notebook'],
};

export default function PackingScreen({ onBackToHome, onSetScreen }) {
  const {
    packingItems = [],
    addPackingItem,
    togglePackingItem,
    deletePackingItem,
    setPackingItems,
    tripInfo = {},
    checkFeatureAccess
  } = useTravelContext();
  const { colors } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [newItem, setNewItem] = useState({ name: '', category: 'essentials', quantity: '1', notes: '' });

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null,
    onNeutral: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    neutralText: ''
  });

  const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null, onNeutral = null, confirmText = 'OK', cancelText = 'Cancel', neutralText = '') => {
    setAlertConfig({ visible: true, title, message, type, onConfirm, onCancel, onNeutral, confirmText, cancelText, neutralText });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleAddItem = () => {
    if (newItem.name.trim()) {
      addPackingItem({
        ...newItem,
        quantity: parseInt(newItem.quantity) || 1,
      });
      setNewItem({ name: '', category: 'essentials', quantity: '1', notes: '' });
      setModalVisible(false);
    }
  };

  const handleQuickAdd = (itemName, category) => {
    addPackingItem({
      name: itemName,
      category,
      quantity: 1,
      notes: '',
    });
  };

  const handleDeleteItem = (id) => {
    deletePackingItem(id);
  };

  const getCategoryInfo = (key) => PACKING_CATEGORIES.find(c => c.key === key) || PACKING_CATEGORIES[7];

  // Filter and group items (removed showPacked filter)
  const filteredItems = packingItems.filter(item => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesCategory;
  });

  // Get unpacked essentials for "Don't Forget" section
  const unpackedEssentials = useMemo(() => {
    return packingItems.filter(item =>
      !item.packed && (item.category === 'essentials' || item.category === 'documents')
    );
  }, [packingItems]);

  // Premium: Smart Weather Tip based on trip context
  const smartTip = useMemo(() => {
    if (!tripInfo.startDate) return { icon: '⛅', title: 'Preparation Path', text: 'Success in travel starts with a smart pack. Check the local forecast before you head out!' };

    try {
      const date = new Date(tripInfo.startDate);
      const month = date.getMonth(); // 0-11
      const destination = (tripInfo.destination || '').toLowerCase();
      const duration = parseInt(tripInfo.duration) || 3;

      // 1. Duration-based tips
      if (duration > 7) {
        return {
          icon: '🧺',
          title: 'Extended Stay Hack',
          text: `For a ${duration}-day trip, pack 4-5 days of clothes and carry travel-size laundry detergent. It saves massive space!`
        };
      }

      // 2. Destination/Weather-based logic
      if (destination.includes('bangalore') || destination.includes('bengaluru')) {
        return {
          icon: '🧥',
          title: 'Garden City Vibe',
          text: 'Bangalore mornings are pleasant but evenings can get chilly. A high-quality light windbreaker is a must.'
        };
      }

      if (destination.includes('beach') || destination.includes('goa') || destination.includes('maldives')) {
        return {
          icon: '🏖️',
          title: 'Ocean Essentials',
          text: 'The sun is stronger near water. Pack mineral-safe sunscreen and a quick-dry microfiber towel.'
        };
      }

      // 3. Seasonal logic
      if (month >= 2 && month <= 5) { // Spring
        return { icon: '🌱', title: 'Spring Strategy', text: 'Spring weather is unpredictable. Pack a light windbreaker and breathable walking shoes.' };
      } else if (month >= 6 && month <= 8) { // Summer
        return { icon: '☀️', title: 'Summer Comfort', text: 'It\'s likely to be warm. Prioritize moisture-wicking fabrics and a wide-brimmed hat.' };
      } else if (month >= 9 && month <= 10) { // Autumn
        return { icon: '🍂', title: 'Autumn Layers', text: 'Cooler breeze ahead. The secret is layering: a base, a light sweater, and a shell.' };
      } else { // Winter
        return { icon: '❄️', title: 'Winter Warmth', text: 'Cold weather expected. Thermal base layers and wool-blend socks are non-negotiable.' };
      }
    } catch (e) {
      return { icon: '⛅', title: 'Expert Tip', text: 'Always pack an extra high-quality layer for unexpected air conditioning or weather changes!' };
    }
  }, [tripInfo.startDate, tripInfo.destination, tripInfo.duration]);

  // Premium: Rotating Pro Tips
  const proTips = [
    "Roll your clothes instead of folding them to save up to 30% more space!",
    "Pack a reusable water bottle to stay hydrated and save money on the go.",
    "Use packing cubes to keep your suitcase organized and find items easily.",
    "Place heavier items at the bottom of your bag near the wheels for better balance.",
    "Scan your important documents and email them to yourself as a backup.",
    "Place a dryer sheet in your suitcase to keep your clothes smelling fresh throughout the trip.",
    "Wear your heaviest shoes (boots/sneakers) and jacket during travel to free up bag space.",
    "Pack a small extension cord; hotel outlets are often in inconvenient spots.",
    "Stuff your socks inside your shoes to maximize every inch of space and maintain shoe shape."
  ];
  const currentProTip = useMemo(() => proTips[Math.floor(Math.random() * proTips.length)], []);


  const groupedItems = PACKING_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = filteredItems.filter(item => {
      const itemCat = (item.category || 'other').toLowerCase();
      // If it's a direct match or if it's 'other' and we're on the other category
      if (itemCat === cat.key) return true;
      // Also put unknown categories into 'other'
      if (cat.key === 'other' && !PACKING_CATEGORIES.some(pc => pc.key === itemCat)) return true;
      return false;
    });
    return acc;
  }, {});

  // Stats
  const totalItems = packingItems.length;
  const packedItems = packingItems.filter(item => item.packed).length;
  const packedPercentage = totalItems > 0 ? (packedItems / totalItems) * 100 : 0;
  const categoryStats = PACKING_CATEGORIES.map(cat => {
    const items = packingItems.filter(item => {
      const itemCat = (item.category || 'other').toLowerCase();
      if (itemCat === cat.key) return true;
      if (cat.key === 'other' && !PACKING_CATEGORIES.some(pc => pc.key === itemCat)) return true;
      return false;
    });
    return {
      ...cat,
      total: items.length,
      packed: items.filter(i => i.packed).length,
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={onBackToHome} style={{ marginRight: 15 }}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Icon name="packing" size={24} color={colors.text} style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.headerTitle}>Packing List</Text>
            <Text style={styles.headerSubtitle}>Ready for {tripInfo.destination || 'your trip'}</Text>
          </View>
        </View>
        {packingItems.length > 0 && !tripInfo.isCompleted && (
          <TouchableOpacity
            onPress={() => {
              showAlert(
                'Clear All Items?',
                'This will permanently remove all items from your packing list. This cannot be undone.',
                'warning',
                async () => {
                  try {
                    hideAlert();
                    await setPackingItems([]);
                    setTimeout(() => {
                      showAlert('Cleared!', 'All packing items have been removed.', 'success', () => hideAlert());
                    }, 500);
                  } catch (error) {
                    console.error('Error clearing packing items:', error);
                    showAlert('Error', 'Failed to clear items. Please check your connection or permissions.', 'error', () => hideAlert());
                  }
                },
                () => hideAlert(),
                null,
                'Clear All',
                'Cancel'
              );
            }}
            style={styles.clearAllButton}
          >
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Weather Tip Banner (Premium) */}
        <View style={styles.weatherBanner}>
          <View style={styles.weatherIconContainer}>
            <Text style={{ fontSize: 24 }}>{smartTip.icon}</Text>
          </View>
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherTitle}>Smart Packing Tip</Text>
            <Text style={styles.weatherText}>{smartTip.text}</Text>
          </View>
        </View>

        {/* Don't Forget / Essentials Section (Premium) */}
        {unpackedEssentials.length > 0 && (
          <View style={styles.essentialsSection}>
            <View style={styles.essentialsHeader}>
              <Text style={styles.essentialsTitle}>🚨 Don't Forget</Text>
              <Text style={styles.essentialsCount}>{unpackedEssentials.length} critical items</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.essentialsScroll}>
              {unpackedEssentials.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.essentialItem}
                  onPress={() => togglePackingItem(item.id)}
                >
                  <Icon name={getCategoryInfo(item.category).icon} size={16} color="#EF4444" />
                  <Text style={styles.essentialText} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Progress Card */}
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Packing Progress</Text>
              <Text style={styles.progressCount}>
                <Text style={styles.progressPacked}>{packedItems}</Text>
                <Text style={styles.progressTotal}> / {totalItems} items</Text>
              </Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercent}>{packedPercentage.toFixed(0)}%</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {
              width: `${packedPercentage}%`,
              backgroundColor: packedPercentage === 100 ? '#10B981' : colors.primary
            }]} />
          </View>

          {packedPercentage === 100 && totalItems > 0 && (
            <View style={styles.completeBadge}>
              <Text style={styles.completeBadgeText}>✅ All packed and ready!</Text>
            </View>
          )}
        </View>

        {/* Category Overview */}
        <View style={styles.categoryOverview}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categoryStats.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryPill,
                  filterCategory === cat.key && { backgroundColor: cat.color, borderColor: cat.color }
                ]}
                onPress={() => setFilterCategory(filterCategory === cat.key ? 'all' : cat.key)}
              >
                <Icon name={cat.icon} size={20} color={filterCategory === cat.key ? '#FFF' : cat.color} style={{ marginRight: 8 }} />
                <View style={styles.categoryPillInfo}>
                  <Text style={[styles.categoryPillLabel, filterCategory === cat.key && { color: '#FFF' }]}>{cat.label}</Text>
                  <Text style={[styles.categoryPillCount, filterCategory === cat.key && { color: 'rgba(255,255,255,0.8)' }]}>
                    {cat.total > 0 ? `${cat.packed}/${cat.total}` : 'Empty'}
                  </Text>
                </View>
                {cat.packed === cat.total && cat.total > 0 && (
                  <Text style={styles.categoryCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Packing Pro-Tip (Premium) */}
        {!tripInfo.isCompleted && (
          <View style={styles.proTipCard}>
            <View style={styles.proTipHeader}>
              <Icon name="info" size={16} color={colors.primary} />
              <Text style={styles.proTipTitle}>Expert Packing Advice</Text>
            </View>
            <Text style={styles.proTipText}>{currentProTip}</Text>
          </View>
        )}

        {/* Quick Add Section */}
        {totalItems === 0 && !tripInfo.isCompleted && (
          <View style={styles.quickAddSection}>

            <View style={{ height: 20 }} />

            <Text style={styles.sectionTitle}>⚡ Quick Add</Text>
            <Text style={styles.quickAddHint}>Tap items to add them to your list</Text>
            {PACKING_CATEGORIES.slice(0, 4).map((cat) => (
              <View key={cat.key} style={styles.quickAddCategory}>
                <View style={styles.quickAddHeader}>
                  <View style={{ marginRight: 8 }}><Icon name={cat.icon} size={18} color={cat.color} /></View>
                  <Text style={styles.quickAddLabel}>{cat.label}</Text>
                </View>
                <View style={styles.quickAddItems}>
                  {QUICK_ADD_ITEMS[cat.key].map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.quickAddItem, { borderColor: cat.color + '40' }]}
                      onPress={() => handleQuickAdd(item, cat.key)}
                    >
                      <Text style={styles.quickAddItemText}>+ {item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Packing List by Category */}
        {totalItems > 0 && (
          <View style={styles.listSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📋 Your Items</Text>
              <Text style={styles.sectionCount}>{filteredItems.length} items</Text>
            </View>

            {filteredItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="search" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No items found</Text>
                <Text style={styles.emptyText}>Try adjusting your filters</Text>
              </View>
            ) : (
              PACKING_CATEGORIES.map((cat) => {
                const items = groupedItems[cat.key];
                if (items.length === 0) return null;

                return (
                  <View key={cat.key} style={styles.categoryGroup}>
                    <View style={[styles.categoryHeader, { borderLeftColor: cat.color }]}>
                      <View style={{ marginRight: 8 }}><Icon name={cat.icon} size={18} color={cat.color} /></View>
                      <Text style={styles.categoryTitle}>{cat.label}</Text>
                      <View style={[styles.categoryBadge, { backgroundColor: cat.color + '20' }]}>
                        <Text style={[styles.categoryBadgeText, { color: cat.color }]}>
                          {items.filter(i => i.packed).length}/{items.length}
                        </Text>
                      </View>
                    </View>

                    {items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.itemCard, item.packed && styles.itemCardPacked]}
                        onPress={() => !tripInfo.isCompleted && togglePackingItem(item.id)}
                        onLongPress={() => !tripInfo.isCompleted && handleDeleteItem(item.id, item.name)}
                        delayLongPress={500}
                        activeOpacity={tripInfo.isCompleted ? 1 : 0.7}
                      >
                        <View style={[styles.checkbox, item.packed && { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
                          {item.packed && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <View style={styles.itemInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                <Text style={[styles.itemName, item.packed && styles.itemNamePacked]}>{item.name}</Text>
                                {item.luggageType && (
                                  <View style={styles.luggageBadge}>
                                    <Text style={styles.luggageIcon}>{item.luggageType === 'carry' ? '🎒' : '🧳'}</Text>
                                    <Text style={styles.luggageText}>{item.luggageType === 'carry' ? 'Carry-on' : 'Checked'}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            {item.quantity > 1 && (
                              <View style={styles.quantityBadge}>
                                <Text style={styles.quantityBadgeText}>{item.quantity}</Text>
                              </View>
                            )}
                          </View>
                          {item.notes && (
                            <Text style={styles.itemNotes}>{item.notes}</Text>
                          )}
                        </View>
                        {!tripInfo.isCompleted && (
                          <TouchableOpacity
                            style={styles.itemDelete}
                            onPress={(e) => {
                              e?.stopPropagation();
                              handleDeleteItem(item.id, item.name);
                            }}
                          >
                            <Icon name="close" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Suggestions */}
        {totalItems > 0 && totalItems < 10 && !tripInfo.isCompleted && (
          <View style={styles.suggestSection}>
            <Text style={styles.sectionTitle}>💡 Suggested Items</Text>
            <View style={styles.suggestItems}>
              {PACKING_CATEGORIES.slice(0, 3).flatMap(cat =>
                QUICK_ADD_ITEMS[cat.key]
                  .filter(item => !packingItems.some(p => (p.name || '').toLowerCase() === item.toLowerCase()))
                  .slice(0, 2)
                  .map(item => (
                    <TouchableOpacity
                      key={`${cat.key}-${item}`}
                      style={styles.suggestItem}
                      onPress={() => handleQuickAdd(item, cat.key)}
                    >
                      <Text style={styles.suggestEmoji}>{cat.emoji}</Text>
                      <Text style={styles.suggestText}>{item}</Text>
                      <Text style={styles.suggestAdd}>+</Text>
                    </TouchableOpacity>
                  ))
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      {!tripInfo.isCompleted && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabText}>Add Item</Text>
        </TouchableOpacity>
      )}

      {/* Add Item Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Icon name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Passport, Charger, Jacket"
                  placeholderTextColor={colors.textMuted}
                  value={newItem.name}
                  onChangeText={(t) => setNewItem({ ...newItem, name: t })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {PACKING_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.categoryOption,
                        newItem.category === cat.key && { backgroundColor: cat.color, borderColor: cat.color }
                      ]}
                      onPress={() => setNewItem({ ...newItem, category: cat.key })}
                    >
                      <Icon name={cat.icon} size={16} color={newItem.category === cat.key ? '#FFF' : cat.color} style={{ marginRight: 6 }} />
                      <Text style={[styles.categoryOptionText, newItem.category === cat.key && { color: '#FFF' }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => setNewItem({ ...newItem, quantity: Math.max(1, parseInt(newItem.quantity) - 1).toString() })}
                  >
                    <Text style={[styles.quantityBtnText, { fontSize: 24, paddingBottom: 4 }]}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    keyboardType="number-pad"
                    value={newItem.quantity}
                    onChangeText={(t) => setNewItem({ ...newItem, quantity: t.replace(/[^0-9]/g, '') || '1' })}
                  />
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => setNewItem({ ...newItem, quantity: (parseInt(newItem.quantity) + 1).toString() })}
                  >
                    <Icon name="add" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Any specific details..."
                  placeholderTextColor={colors.textMuted}
                  value={newItem.notes}
                  onChangeText={(t) => setNewItem({ ...newItem, notes: t })}
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quick Add</Text>
                <View style={styles.quickAddModalItems}>
                  {QUICK_ADD_ITEMS[newItem.category]?.slice(0, 6).map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.quickAddModalItem}
                      onPress={() => setNewItem({ ...newItem, name: item })}
                    >
                      <Text style={styles.quickAddModalText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, !newItem.name.trim() && { opacity: 0.5 }]}
                onPress={handleAddItem}
                disabled={!newItem.name.trim()}
              >
                <Text style={styles.submitBtnText}>+ Add to Packing List</Text>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
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
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  headerSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  clearAllButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  clearAllText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },

  // Weather Banner
  weatherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '08',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary + '15',
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
  },
  weatherIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  weatherInfo: { flex: 1 },
  weatherTitle: { color: colors.primary, fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  weatherText: { color: colors.text, fontSize: 12, lineHeight: 18 },

  // Pro-Tip Card
  proTipCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  proTipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  proTipTitle: { color: colors.primary, fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
  proTipText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },

  // Luggage Badge
  luggageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  luggageIcon: { fontSize: 10, marginRight: 4 },
  luggageText: { fontSize: 9, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },

  // Progress Card
  progressCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.primaryBorder },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressInfo: {},
  progressLabel: { color: colors.textMuted, fontSize: 12 },
  progressCount: { marginTop: 4 },
  progressPacked: { color: colors.primary, fontSize: 28, fontWeight: 'bold' },
  progressTotal: { color: colors.textMuted, fontSize: 16 },
  progressCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardLight },
  progressPercent: { color: colors.primary, fontSize: 14, fontWeight: 'bold' },
  progressBar: { height: 8, backgroundColor: colors.cardLight, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  completeBadge: { backgroundColor: '#10B98120', borderRadius: 10, padding: 10, marginTop: 12, alignItems: 'center' },
  completeBadgeText: { color: '#10B981', fontSize: 13, fontWeight: '600' },

  // Category Overview
  categoryOverview: { marginBottom: 16 },
  categoryScroll: { paddingHorizontal: 20, gap: 10 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.primaryBorder },
  categoryPillEmoji: { fontSize: 18, marginRight: 8 },
  categoryPillInfo: {},
  categoryPillLabel: { color: colors.text, fontSize: 12, fontWeight: '600' },
  categoryPillCount: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  categoryCheck: { color: '#10B981', fontSize: 14, marginLeft: 8 },

  // Quick Add Section
  quickAddSection: { paddingHorizontal: 20, marginBottom: 20 },
  quickAddHint: { color: colors.textMuted, fontSize: 12, marginBottom: 16 },
  quickAddCategory: { marginBottom: 16 },
  quickAddHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  quickAddEmoji: { fontSize: 18, marginRight: 8 },
  quickAddLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  quickAddItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAddItem: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  quickAddItemText: { color: colors.text, fontSize: 13 },

  // List Section
  listSection: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  sectionCount: { color: colors.textMuted, fontSize: 13 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 4 },

  // Category Group
  categoryGroup: { marginBottom: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, borderLeftWidth: 3, marginBottom: 10 },
  categoryEmoji: { fontSize: 18, marginRight: 8 },
  categoryTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600' },

  // Item Card
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.primaryBorder },
  itemCardPacked: { opacity: 0.7, backgroundColor: colors.cardLight },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.primaryBorder, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  itemNamePacked: { textDecorationLine: 'line-through', color: colors.textMuted },
  itemQuantity: { color: colors.primary, fontSize: 12, marginTop: 2 },
  itemNotes: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  itemDelete: { padding: 6 },
  itemDeleteText: { fontSize: 14 },

  // Suggestions
  suggestSection: { paddingHorizontal: 20, marginTop: 10 },
  suggestItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryBorder },
  suggestEmoji: { fontSize: 14, marginRight: 6 },
  suggestText: { color: colors.text, fontSize: 13 },
  suggestAdd: { color: colors.primary, fontSize: 16, marginLeft: 8, fontWeight: 'bold' },

  // FAB
  fab: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, elevation: 5 },
  fabIcon: { color: colors.bg, fontSize: 20, fontWeight: 'bold', marginRight: 6 },
  fabText: { color: colors.bg, fontSize: 15, fontWeight: 'bold' },

  // Essentials (Don't Forget) Section
  essentialsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  essentialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  essentialsTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  essentialsCount: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  essentialsScroll: {
    paddingRight: 20,
    gap: 10,
  },
  essentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    maxWidth: 150,
  },
  essentialText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Premium AI Button
  premiumAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumAiBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Inputs
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  input: { backgroundColor: colors.cardLight, color: colors.text, padding: 14, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: colors.primaryBorder, outlineStyle: 'none' },

  // Category Grid
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.primaryBorder },
  categoryOptionEmoji: { fontSize: 16, marginRight: 6 },
  categoryOptionText: { color: colors.text, fontSize: 12, fontWeight: '500' },

  // Quantity
  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  quantityBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.cardLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primaryBorder },
  quantityBtnText: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  quantityInput: { flex: 1, backgroundColor: colors.cardLight, color: colors.text, textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginHorizontal: 10, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryBorder, outlineStyle: 'none' },

  // Quick Add in Modal
  quickAddModalItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAddModalItem: { backgroundColor: colors.cardLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.primaryBorder },
  quickAddModalText: { color: colors.text, fontSize: 13 },

  // Submit
  submitBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: colors.bg, fontSize: 16, fontWeight: 'bold' },

  // AI Buttons & Suggestions
  aiSuggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  aiBtnIcon: { fontSize: 14, marginRight: 6 },
  aiBtnText: { color: '#8B5CF6', fontSize: 13, fontWeight: 'bold' },

  modalSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  aiCatGroup: { marginBottom: 20 },
  aiCatTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  aiSuggestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aiItemPill: { backgroundColor: colors.cardLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.primaryBorder },
  aiItemPillDisabled: { opacity: 0.6, borderColor: 'transparent' },
  aiItemText: { color: colors.text, fontSize: 13 },
  aiItemTextDisabled: { color: colors.textMuted },

  addAllBtn: { backgroundColor: colors.text, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  addAllText: { color: colors.bg, fontSize: 16, fontWeight: 'bold' },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 12,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
