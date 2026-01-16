import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity,
  Dimensions, Modal, Pressable, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTravelContext } from '../context/TravelContext';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { generateBudgetPlan } from '../services/aiService';

const ICON_OPTIONS = ['hotel', 'car', 'food', 'shopping', 'packing', 'airplane', 'train', 'beach', 'nature', 'ticket', 'hospital', 'mobile', 'task', 'like', 'heart', 'budget'];
const COLOR_OPTIONS = ['#8B5CF6', '#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#6B7280', '#EF4444', '#06B6D4', '#84CC16', '#F97316'];

const AI_QUESTIONS = [
  {
    id: 'budget_range',
    question: 'Total budget range allowed?',
    type: 'range'
  },
  {
    id: 'preference',
    question: 'Budget preference',
    type: 'option',
    options: ['Low', 'Mid', 'Luxury', 'Mixed']
  },
  {
    id: 'priority',
    question: 'Major expense priority',
    type: 'option',
    options: ['Stay', 'Food', 'Experiences', 'Shopping']
  },
  {
    id: 'accommodation',
    question: 'Accommodation type',
    type: 'option',
    options: ['Hotel', 'Hostel', 'Homestay', 'Airbnb']
  },
  {
    id: 'hotel_price',
    question: 'Hotel price range (per night)',
    type: 'option',
    options: ['< 2000', '2000 - 5000', '5000 - 10000', '10000+']
  },
  {
    id: 'primary_transport',
    question: 'Primary transport',
    type: 'option',
    options: ['Flight', 'Train', 'Bus', 'Car', 'Bike']
  },
  {
    id: 'local_transport',
    question: 'Local transport preference',
    type: 'option',
    options: ['Public transport', 'Cab', 'Rental bike']
  }
];

export default function BudgetScreen() {
  const {
    budget = { total: 0, categories: {} },
    setBudget,
    getExpensesByCategory,
    formatCurrency,
    currency = { symbol: '₹', code: 'INR' },
    tripInfo = {},
    customCategories,
    setCustomCategories,
    saveTripPreferences
  } = useTravelContext();
  const { colors } = useTheme();

  const CATEGORIES = customCategories || [];

  const [totalBudget, setTotalBudget] = useState((budget.total || 0).toString());
  const [categoryInputs, setCategoryInputs] = useState({});

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ key: '', label: '', icon: 'packing', color: '#6B7280', tip: '5-10%' });

  // AI Modal State
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');

  // Sync totalBudget
  useEffect(() => {
    setTotalBudget((budget.total || 0).toString());
  }, [budget.total]);

  // Sync inputs
  useEffect(() => {
    const inputs = {};
    CATEGORIES.forEach(cat => {
      inputs[cat.key] = (budget.categories?.[cat.key] || 0).toString();
    });
    setCategoryInputs(inputs);
  }, [budget.categories, CATEGORIES]);

  const expensesByCategory = getExpensesByCategory ? getExpensesByCategory() : {};
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ================= AI HANDLERS =================
  const startAiPlan = () => {
    setAnswers({});
    setCurrentQIndex(0);
    setRangeMin('');
    setRangeMax('');
    setAiModalVisible(true);
  };

  const handleAiAnswer = (value) => {
    const currentQ = AI_QUESTIONS[currentQIndex];
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);

    if (currentQIndex < AI_QUESTIONS.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      submitAiPlan(newAnswers);
    }
  };

  const handleRangeSubmit = () => {
    if (!rangeMin || !rangeMax) {
      Alert.alert('Required', 'Please enter both min and max values');
      return;
    }
    const newAnswers = { ...answers, budget_min: rangeMin, budget_max: rangeMax };
    setAnswers(newAnswers);
    setCurrentQIndex(currentQIndex + 1);
  };

  const submitAiPlan = async (finalAnswers) => {
    setIsGenerating(true);
    try {
      const destination = tripInfo.destination || 'Unknown';

      // Calculate duration
      let duration = 3; // Default
      if (tripInfo.startDate && tripInfo.endDate) {
        const start = new Date(tripInfo.startDate);
        const end = new Date(tripInfo.endDate); // This needs parsing if format is dd MMM yyyy
        // Assuming simplistic check or fallback
        duration = 5;
      }

      // Travelers count
      let travelers = 1;
      if (Array.isArray(tripInfo.participants)) travelers = tripInfo.participants.length;
      else if (tripInfo.participants) travelers = Object.keys(tripInfo.participants).length;

      const result = await generateBudgetPlan(destination, duration, travelers, finalAnswers);

      if (result.success && result.categories) {
        // Apply Budget
        setBudget({
          total: result.total || 0,
          categories: result.categories
        });

        // Save preferences if needed
        if (saveTripPreferences) {
          saveTripPreferences(finalAnswers);
        }

        setAiModalVisible(false);
        Alert.alert('Budget Generated!', `AI has allocated ${currency.symbol}${result.total} for your trip based on your preferences.`);
      } else {
        Alert.alert('Error', 'AI could not generate a budget plan. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsGenerating(false);
    }
  };


  // ================= MANUAL HANDLERS =================
  const handleSaveBudget = () => {
    const newTotal = parseFloat(totalBudget) || 0;
    setBudget({ ...budget, total: newTotal });
  };

  const handleCategoryChange = (category, value) => {
    setCategoryInputs(prev => ({ ...prev, [category]: value }));
  };

  const handleCategoryBlur = (category) => {
    const newValue = parseFloat(categoryInputs[category]) || 0;
    setBudget({
      ...budget,
      categories: { ...budget.categories, [category]: newValue }
    });
  };

  const safeFormat = (amount) => {
    if (formatCurrency) return formatCurrency(amount);
    const num = parseFloat(amount) || 0;
    return `${currency.symbol}${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const handleAddCategory = () => {
    if (!newCategory.label.trim()) return;
    const key = newCategory.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
    const categoryToAdd = { ...newCategory, key };
    const updatedCategories = [...CATEGORIES, categoryToAdd];
    if (setCustomCategories) setCustomCategories(updatedCategories);
    setCategoryInputs(prev => ({ ...prev, [key]: '0' }));
    setNewCategory({ key: '', label: '', icon: 'packing', color: '#6B7280', tip: '5-10%' });
    setShowCategoryModal(false);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !newCategory.label.trim()) return;
    const updatedCategories = CATEGORIES.map(cat =>
      cat.key === editingCategory.key ? { ...newCategory, key: editingCategory.key } : cat
    );
    if (setCustomCategories) setCustomCategories(updatedCategories);
    setEditingCategory(null);
    setNewCategory({ key: '', label: '', icon: 'packing', color: '#6B7280', tip: '5-10%' });
    setShowCategoryModal(false);
  };

  const handleDeleteCategory = (categoryKey) => {
    const updatedCategories = CATEGORIES.filter(cat => cat.key !== categoryKey);
    if (setCustomCategories) setCustomCategories(updatedCategories);
    const newBudgetCategories = { ...budget.categories };
    delete newBudgetCategories[categoryKey];
    setBudget({ ...budget, categories: newBudgetCategories });
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategory({ ...category });
    setShowCategoryModal(true);
  };

  const allocatedTotal = Object.values(budget.categories || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const unallocated = (budget.total || 0) - allocatedTotal;
  const totalSpent = Object.values(expensesByCategory).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const remainingBudget = (budget.total || 0) - totalSpent;
  const spentPercentage = budget.total > 0 ? (totalSpent / budget.total) * 100 : 0;

  const getStatusColor = (pct) => {
    if (pct > 90) return '#EF4444';
    if (pct > 75) return '#F59E0B';
    return colors.primary;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="budget" size={28} color={colors.text} style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.headerTitle}>Budget Planner</Text>
            <Text style={styles.headerSubtitle}>
              {tripInfo.destination || 'Your Trip'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.aiBtn} onPress={startAiPlan}>
          <Icon name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.aiBtnText}>AI Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Total Budget Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <Text style={styles.totalLabel}>TOTAL BUDGET</Text>
            {budget.total > 0 && <View style={[styles.statusPill, { backgroundColor: getStatusColor(spentPercentage) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(spentPercentage) }]}>
                {spentPercentage.toFixed(0)}% Spent
              </Text>
            </View>}
          </View>

          <View style={styles.totalInputContainer}>
            <Text style={styles.currencyPrefix}>{currency.symbol}</Text>
            <TextInput
              style={[styles.totalInput, { outlineStyle: 'none' }]}
              keyboardType="decimal-pad"
              value={totalBudget || ''}
              onChangeText={setTotalBudget}
              onBlur={handleSaveBudget}
              placeholder="0"
              placeholderTextColor={colors.textMuted + '80'}
            />
          </View>

          {/* Progress Bar */}
          <View style={styles.mainProgressContainer}>
            <View style={styles.mainTrack}>
              <View style={[styles.mainFill, { width: `${Math.min(spentPercentage, 100)}%`, backgroundColor: getStatusColor(spentPercentage) }]} />
            </View>
            <View style={styles.mainStats}>
              <Text style={styles.mainStatText}>Spent: {safeFormat(totalSpent)}</Text>
              <Text style={[styles.mainStatText, { color: remainingBudget < 0 ? '#EF4444' : colors.textMuted }]}>
                {remainingBudget >= 0 ? `Left: ${safeFormat(remainingBudget)}` : `Over: ${safeFormat(Math.abs(remainingBudget))}`}
              </Text>
            </View>
          </View>

          {/* Allocation Warning */}
          {unallocated !== 0 && Math.abs(unallocated) > 1 && (
            <View style={styles.allocationWarning}>
              <Text style={styles.warningIcon}>{unallocated > 0 ? '⚠️' : '🛑'}</Text>
              <Text style={styles.warningText}>
                {unallocated > 0
                  ? `You have ${safeFormat(unallocated)} unallocated`
                  : `You allocated ${safeFormat(Math.abs(unallocated))} more than budget`}
              </Text>
            </View>
          )}
        </View>

        {/* Categories Section */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>CATEGORIES</Text>

          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.key}
              cat={cat}
              budget={budget}
              expensesByCategory={expensesByCategory}
              currency={currency}
              categoryInputs={categoryInputs}
              handleCategoryChange={handleCategoryChange}
              handleCategoryBlur={handleCategoryBlur}
              handleEditCategory={handleEditCategory}
              safeFormat={safeFormat}
              styles={styles}
              colors={colors}
            />
          ))}

          <TouchableOpacity style={styles.newCatBtn} onPress={() => { setEditingCategory(null); setNewCategory({ key: '', label: '', icon: 'packing', color: '#6B7280', tip: '5-10%' }); setShowCategoryModal(true); }}>
            <Icon name="add" size={24} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.newCatText}>Add New Category</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit/Add Category Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCategory ? 'Edit Category' : 'New Category'}</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.closeBtn}>
                <Icon name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={[styles.modalInput, { outlineStyle: 'none' }]}
                value={newCategory.label}
                onChangeText={t => setNewCategory({ ...newCategory, label: t })}
                placeholder="e.g. Souvenirs"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>Icon</Text>
              <View style={styles.emojiGrid}>
                {ICON_OPTIONS.map(iconKey => (
                  <TouchableOpacity key={iconKey} onPress={() => setNewCategory({ ...newCategory, icon: iconKey })} style={[styles.emojiItem, newCategory.icon === iconKey && styles.emojiSelected]}>
                    <Icon name={iconKey} size={24} color={newCategory.icon === iconKey ? colors.primary : colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map(c => (
                  <TouchableOpacity key={c} onPress={() => setNewCategory({ ...newCategory, color: c })} style={[styles.colorItem, { backgroundColor: c }, newCategory.color === c && styles.colorSelected]}>
                    {newCategory.color === c && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={editingCategory ? handleUpdateCategory : handleAddCategory}>
                <Text style={styles.saveBtnText}>{editingCategory ? 'Update Category' : 'Create Category'}</Text>
              </TouchableOpacity>

              {editingCategory && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => { handleDeleteCategory(editingCategory.key); setShowCategoryModal(false); }}>
                  <Text style={styles.deleteBtnText}>Delete Category</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AI Budget Planner Modal */}
      <Modal visible={aiModalVisible} animationType="fade" transparent>
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            {isGenerating ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 20, color: colors.text, fontSize: 16, fontWeight: 'bold' }}>Creating your budget plan...</Text>
                <Text style={{ marginTop: 8, color: colors.textMuted, fontSize: 14 }}>Analyzing {tripInfo?.destination} costs</Text>
              </View>
            ) : (
              <>
                {/* Progress Bar for AI Questions */}
                <View style={{ height: 4, backgroundColor: colors.cardLight, borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
                  <View style={{ height: '100%', backgroundColor: colors.primary, width: `${((currentQIndex + 1) / AI_QUESTIONS.length) * 100}%` }} />
                </View>

                <Text style={styles.aiQuestionTitle}>{AI_QUESTIONS[currentQIndex]?.question}</Text>

                {/* Q1: Range Input */}
                {AI_QUESTIONS[currentQIndex]?.type === 'range' && (
                  <View style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMuted, marginBottom: 8, fontSize: 12 }}>MIN ({currency.symbol})</Text>
                        <TextInput
                          style={styles.aiRangeInput}
                          keyboardType="numeric"
                          placeholder="10000"
                          placeholderTextColor={colors.textMuted + '50'}
                          value={rangeMin}
                          onChangeText={setRangeMin}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMuted, marginBottom: 8, fontSize: 12 }}>MAX ({currency.symbol})</Text>
                        <TextInput
                          style={styles.aiRangeInput}
                          keyboardType="numeric"
                          placeholder="50000"
                          placeholderTextColor={colors.textMuted + '50'}
                          value={rangeMax}
                          onChangeText={setRangeMax}
                        />
                      </View>
                    </View>
                    <TouchableOpacity style={styles.aiNextBtn} onPress={handleRangeSubmit}>
                      <Text style={styles.aiNextBtnText}>Next Step</Text>
                      <Icon name="arrow-right" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Q2+: Options */}
                {AI_QUESTIONS[currentQIndex]?.type === 'option' && (
                  <View style={{ marginTop: 20, gap: 12 }}>
                    {AI_QUESTIONS[currentQIndex]?.options.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={styles.aiOptionBtn}
                        onPress={() => handleAiAnswer(opt)}
                      >
                        <Text style={styles.aiOptionText}>{opt}</Text>
                        <Icon name="chevron-right" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.aiCloseBtn}
                  onPress={() => setAiModalVisible(false)}
                >
                  <Text style={{ color: colors.textMuted }}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const CategoryCard = ({ cat, budget, expensesByCategory, currency, categoryInputs, handleCategoryChange, handleCategoryBlur, handleEditCategory, safeFormat, styles, colors }) => {
  const [inputWidth, setInputWidth] = useState(20);
  const allocated = parseFloat(budget.categories?.[cat.key]) || 0;
  const spent = parseFloat(expensesByCategory[cat.key]) || 0;
  const percentage = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
  const remaining = allocated - spent;
  const inputValue = categoryInputs[cat.key];

  return (
    <View style={styles.catCard}>
      <Pressable
        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
        onPress={() => handleEditCategory(cat)}
      />

      <View pointerEvents="none" style={styles.catIconContainer}>
        <View style={[styles.catIconBg, { backgroundColor: cat.color + '20' }]}>
          <Icon name={cat.icon || cat.key} size={24} color={cat.color} />
        </View>
      </View>

      <View pointerEvents="box-none" style={styles.catContent}>
        <View pointerEvents="box-none" style={styles.catHeader}>
          <Text pointerEvents="none" style={styles.catName}>{cat.label}</Text>
          <View style={styles.catInputWrapper}>
            <Text style={styles.catCurrency}>{currency.symbol}</Text>
            <Text
              style={[styles.catInput, { position: 'absolute', opacity: 0, zIndex: -1 }]}
              onLayout={(e) => setInputWidth(e.nativeEvent.layout.width)}
            >
              {inputValue || '0'}
            </Text>
            <TextInput
              style={[styles.catInput, { width: Math.max(20, inputWidth + 5), outlineStyle: 'none' }]}
              value={inputValue || ''}
              onChangeText={(t) => handleCategoryChange(cat.key, t)}
              onBlur={() => handleCategoryBlur(cat.key)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted + '50'}
              onPressIn={(e) => e.stopPropagation()}
            />
          </View>
        </View>

        <View pointerEvents="none" style={styles.miniTrack}>
          <View style={[styles.miniFill, { width: `${percentage}%`, backgroundColor: cat.color }]} />
        </View>

        <View pointerEvents="none" style={styles.catFooter}>
          <Text style={styles.catSpent}>Spent: {safeFormat(spent)}</Text>
          <Text style={[styles.catRemaining, { color: remaining < 0 ? '#EF4444' : colors.textMuted }]}>
            {remaining >= 0 ? `${safeFormat(remaining)} left` : `${safeFormat(Math.abs(remaining))} over`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },

  // AI Button
  aiBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  aiBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // AI Modal
  aiModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  aiModalContent: { backgroundColor: colors.card, padding: 24, borderRadius: 24, minHeight: 300 },
  aiQuestionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
  aiRangeInput: { backgroundColor: colors.bg, padding: 14, borderRadius: 12, color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center', borderWidth: 1, borderColor: colors.primaryBorder },
  aiNextBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginTop: 10 },
  aiNextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  aiOptionBtn: { backgroundColor: colors.bg, padding: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.primaryBorder },
  aiOptionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  aiCloseBtn: { alignSelf: 'center', marginTop: 20, padding: 10 },

  // Total Card
  totalCard: { backgroundColor: colors.card, borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  totalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },

  totalInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  currencyPrefix: { fontSize: 32, fontWeight: '700', color: colors.primary, marginRight: 8 },
  totalInput: { fontSize: 42, fontWeight: '800', color: colors.text, flex: 1, padding: 0 },

  mainProgressContainer: { marginTop: 8 },
  mainTrack: { height: 12, backgroundColor: colors.bg, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  mainFill: { height: '100%', borderRadius: 6 },
  mainStats: { flexDirection: 'row', justifyContent: 'space-between' },
  mainStatText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  allocationWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 12, marginTop: 16 },
  warningIcon: { marginRight: 8 },
  warningText: { fontSize: 12, color: '#D97706', fontWeight: '600' },

  categoriesSection: { gap: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, marginLeft: 4 },

  catCard: { flexDirection: 'row', backgroundColor: colors.card, padding: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  catIconContainer: { marginRight: 16 },
  catIconBg: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 24 },

  catContent: { flex: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', rowGap: 8 },
  catName: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: 8, maxWidth: '100%' },
  catInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  catCurrency: { fontSize: 14, color: colors.textMuted, marginRight: 2 },
  catInput: { fontSize: 16, fontWeight: '700', color: colors.text, padding: 0, textAlign: 'right', minWidth: 20 },

  miniTrack: { height: 6, backgroundColor: colors.bg, borderRadius: 3, marginBottom: 6 },
  miniFill: { height: '100%', borderRadius: 3 },
  catFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  catSpent: { fontSize: 11, color: colors.textMuted },
  catRemaining: { fontSize: 11, fontWeight: '600' },

  newCatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 2, borderColor: colors.primary + '30', borderStyle: 'dashed', borderRadius: 20, marginTop: 8 },
  newCatIcon: { fontSize: 18, color: colors.primary, marginRight: 8, fontWeight: '700' },
  newCatText: { fontSize: 14, color: colors.primary, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '80%' },
  modalHandle: { width: 40, height: 5, backgroundColor: colors.textMuted + '40', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  closeBtn: { padding: 8, backgroundColor: colors.bg, borderRadius: 20 },
  closeText: { fontSize: 16, color: colors.text },

  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, marginTop: 16 },
  modalInput: { backgroundColor: colors.bg, padding: 16, borderRadius: 16, fontSize: 16, color: colors.text, fontWeight: '600' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiItem: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  emojiSelected: { backgroundColor: colors.primary + '20', borderWidth: 2, borderColor: colors.primary },
  emojiText: { fontSize: 20 },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorItem: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  colorSelected: { borderWidth: 3, borderColor: colors.text },
  checkMark: { color: 'black', fontSize: 16, fontWeight: 'bold' },

  saveBtn: { backgroundColor: colors.primary, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: 'black', fontSize: 16, fontWeight: '800' },
  deleteBtn: { backgroundColor: '#EF444415', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 16 },
  deleteBtnText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});
