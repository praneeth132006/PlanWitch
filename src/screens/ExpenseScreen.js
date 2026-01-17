import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet, Dimensions, Alert, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTravelContext } from '../context/TravelContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import DatePickerModal from '../components/DatePickerModal';
import Icon from '../components/Icon';

const { width } = Dimensions.get('window');

// Fallback if context fails
const DEFAULT_CATEGORIES = [
  { key: 'food', label: 'Food', icon: 'food', color: '#F59E0B' },
  { key: 'transport', label: 'Transport', icon: 'transport', color: '#3B82F6' },
];

export default function ExpenseScreen() {
  const {
    tripInfo, budget, setBudget, expenses = [], addExpense, updateExpense, deleteExpense,
    getTotalExpenses, formatCurrency, currency, getAllTravelers, localParticipantId, customCategories
  } = useTravelContext();
  const { colors } = useTheme();
  const { user } = useAuth();

  // Use context categories
  const CATEGORIES = customCategories && customCategories.length > 0 ? customCategories : DEFAULT_CATEGORIES;

  const [modalVisible, setModalVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('transactions');
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);


  // New Expense State
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: CATEGORIES[0]?.key || 'food',
    paidBy: localParticipantId || 'owner',
    type: 'expense', // 'expense', 'income', 'transfer'
    splitType: 'equal', // 'equal', 'custom'
    beneficiaries: [], // List of user IDs involved
    splitAmounts: {}, // For custom split: { userId: amount }
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    dateTimestamp: Date.now(),
  });

  const travelers = useMemo(() => {
    return getAllTravelers();
  }, [tripInfo.participants, user?.uid]);

  const getTravelerName = (id) => {
    // Standard ID check
    const traveler = travelers.find(t => t.id === id);
    if (traveler) return traveler.name;

    // Legacy 'main_user' mapping - usually refers to the owner
    if (id === 'main_user') {
      const owner = travelers.find(t => t.id === 'owner' || t.type === 'owner');
      return owner ? owner.name : 'Organizer';
    }

    return 'Unknown';
  };

  const getTravelerAvatar = (id) => {
    const traveler = travelers.find(t => t.id === id);
    if (traveler) return traveler.avatar || '👤';
    return '👤';
  };

  // Grouped travelers for family trips
  const displayGroups = useMemo(() => {
    if (tripInfo.tripType !== 'family') return travelers;

    const groups = {};
    travelers.forEach(t => {
      const gName = t.familyGroup || 'Family 1';
      if (!groups[gName]) {
        groups[gName] = {
          id: gName,
          name: gName,
          avatar: '👨‍👩‍👧‍👦',
          memberIds: []
        };
      }
      groups[gName].memberIds.push(t.id);
    });
    return Object.values(groups);
  }, [travelers, tripInfo.tripType]);

  // Is this a group trip?
  const isMultiUser = travelers.length > 1;

  // Initialize beneficiaries when modal opens or travelers change
  useEffect(() => {
    if (displayGroups.length > 0 && newExpense.beneficiaries.length === 0) {
      setNewExpense(prev => ({
        ...prev,
        beneficiaries: displayGroups.map(t => t.id)
      }));
    }
  }, [displayGroups, modalVisible]);

  // --- Logic for Split Validation ---
  const currentTotalAmount = parseFloat(newExpense.amount) || 0;

  const getSplitValidation = () => {
    if (!isMultiUser) return { isValid: true, message: '' };

    if (newExpense.splitType === 'equal') {
      return { isValid: newExpense.beneficiaries.length > 0, message: '' };
    }

    if (newExpense.splitType === 'custom') {
      let allocated = 0;
      displayGroups.forEach(t => {
        allocated += parseFloat(newExpense.splitAmounts[t.id] || 0);
      });

      const diff = currentTotalAmount - allocated;

      if (Math.abs(diff) < 0.01) return { isValid: true, message: 'Perfectly split! ✅' };
      if (diff > 0) return { isValid: false, message: `Remaining: ${formatCurrency ? formatCurrency(diff) : diff.toFixed(0)}` };
      return { isValid: false, message: `Over allocated: ${formatCurrency ? formatCurrency(Math.abs(diff)) : Math.abs(diff).toFixed(0)}` };
    }

    return { isValid: true };
  };

  const splitStatus = getSplitValidation();

  const handleAddExpense = () => {
    if (!newExpense.title.trim() || !newExpense.amount) {
      Alert.alert('Missing Info', 'Please enter amount and description');
      return;
    }

    // Final validation check
    if (!splitStatus.isValid && isMultiUser) {
      Alert.alert('Invalid Split', splitStatus.message);
      return;
    }

    const expenseData = {
      ...newExpense,
      amount: parseFloat(newExpense.amount),
      // Add tripType info to expense for future grouping stability
      isFamilyExpense: tripInfo.tripType === 'family'
    };

    if (editingExpenseId) {
      updateExpense(editingExpenseId, expenseData);
    } else {
      addExpense({
        ...expenseData,
        id: `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      });
    }

    setModalVisible(false);
    setEditingExpenseId(null);
    // Reset form
    setNewExpense({
      title: '',
      amount: '',
      category: CATEGORIES[0]?.key,
      paidBy: localParticipantId,
      splitType: 'equal',
      // Reset beneficiaries to match current grouping
      beneficiaries: displayGroups.map(t => t.id),
      splitAmounts: {},
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      dateTimestamp: Date.now(),
    });
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setNewExpense({
      ...expense,
      amount: expense.amount.toString(),
      splitAmounts: expense.splitAmounts || {},
      beneficiaries: expense.beneficiaries || [],
    });
    setModalVisible(true);
  };

  const handleDateSelect = (formattedDate) => {
    // Parse formattedDate to get timestamp
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = formattedDate.split(' ');
    const day = parseInt(parts[0]);
    const month = MONTHS.indexOf(parts[1]);
    const year = parseInt(parts[2]);
    const dateObj = new Date(year, month, day);

    setNewExpense(prev => ({
      ...prev,
      date: formattedDate,
      dateTimestamp: dateObj.getTime()
    }));
  };

  // --- Calculations for Balances ---
  // Simplified debt simplification logic
  const balances = useMemo(() => {
    if (!isMultiUser) return {};
    const bal = {};
    const isFamilyTrip = tripInfo.tripType === 'family';

    // Initialize balances for display groups (families or individual travelers)
    displayGroups.forEach(g => bal[g.id] = 0);

    expenses.forEach(e => {
      const amt = parseFloat(e.amount);
      let payer = e.paidBy || 'owner';

      // Resolve legacy IDs
      if (payer === 'main_user') payer = 'owner';

      // If family trip, use the familyGroup of the payer
      if (isFamilyTrip) {
        const traveler = travelers.find(t => t.id === payer);
        payer = traveler?.familyGroup || 'Family 1';
      }

      if (e.type === 'transfer') {
        const receiver = e.beneficiaries[0];
        if (receiver) {
          bal[payer] = (bal[payer] || 0) + amt;
          bal[receiver] = (bal[receiver] || 0) - amt;
        }
      } else if (e.type === 'income') {
        bal[payer] = (bal[payer] || 0) - amt;

        if (e.splitType === 'custom') {
          Object.keys(e.splitAmounts || {}).forEach(gid => {
            bal[gid] = (bal[gid] || 0) + parseFloat(e.splitAmounts[gid]);
          });
        } else {
          const bens = e.beneficiaries || [];
          const splitAmt = amt / (bens.length || 1);
          bens.forEach(gid => {
            bal[gid] = (bal[gid] || 0) + splitAmt;
          });
        }
      } else {
        // Expense
        bal[payer] = (bal[payer] || 0) + amt;

        if (e.splitType === 'custom') {
          Object.keys(e.splitAmounts || {}).forEach(gid => {
            bal[gid] = (bal[gid] || 0) - parseFloat(e.splitAmounts[gid]);
          });
        } else {
          const bens = e.beneficiaries || [];
          const splitAmt = amt / (bens.length || 1);
          bens.forEach(gid => {
            bal[gid] = (bal[gid] || 0) - splitAmt;
          });
        }
      }
    });
    return bal; // Positive means "owed money", Negative means "owes money"
  }, [expenses, displayGroups, travelers, tripInfo.tripType]);

  const groupedExpenses = useMemo(() => {
    const groups = {};
    const sorted = [...expenses].sort((a, b) => (b.dateTimestamp || 0) - (a.dateTimestamp || 0));
    sorted.forEach(exp => {
      const dateKey = exp.date || 'Other';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(exp);
    });
    return groups;
  }, [expenses]);

  // Styles
  const styles = useMemo(() => createStyles(colors), [colors]);

  const safeFormat = (val) => {
    if (formatCurrency) return formatCurrency(val);
    return `${currency.symbol}${parseFloat(val).toFixed(0)}`;
  };

  const totalSpent = getTotalExpenses ? getTotalExpenses() : 0;
  const remainingBudget = (budget.total || 0) - totalSpent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="expenses" size={24} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Expenses</Text>
        </View>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
            <Text style={styles.summaryValue}>{safeFormat(totalSpent)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>REMAINING</Text>
            <Text style={[styles.summaryValue, { color: remainingBudget < 0 ? '#EF4444' : '#10B981' }]}>
              {safeFormat(remainingBudget)}
            </Text>
          </View>
        </View>
        <View style={styles.summaryBar}>
          <View style={[styles.summaryFill, { width: `${Math.min((totalSpent / budget.total) * 100, 100)}%`, backgroundColor: remainingBudget < 0 ? '#EF4444' : colors.primary }]} />
        </View>
      </View>

      {/* Tabs */}
      {isMultiUser && (
        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setActiveTab('transactions')} style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('balances')} style={[styles.tab, activeTab === 'balances' && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}>Balances</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'transactions' ? (
          <>
            {expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💸</Text>
                <Text style={styles.emptyText}>No expenses yet. Tap + to add one!</Text>
              </View>
            ) : (
              Object.entries(groupedExpenses).map(([date, dateExpenses]) => (
                <View key={date} style={styles.dateGroup}>
                  <View style={styles.dateHeader}>
                    <Icon name="calendar" size={14} color={colors.textMuted} />
                    <Text style={styles.dateHeaderText}>{date}</Text>
                    <View style={styles.dateLine} />
                  </View>
                  {dateExpenses.map(expense => {
                    const cat = CATEGORIES.find(c => c.key === expense.category) || CATEGORIES[0];
                    return (
                      <View key={expense.id} style={styles.expenseCard}>
                        <View style={[styles.exIcon, { backgroundColor: cat.color + '20' }]}>
                          <Icon name={cat.icon || cat.key} size={20} color={cat.color} />
                        </View>
                        <View style={styles.exContent}>
                          <View style={styles.exHeaderRow}>
                            <Text style={styles.exTitle}>{expense.title}</Text>
                          </View>
                          <Text style={styles.exSub}>
                            {getTravelerName(expense.paidBy)} {expense.type === 'transfer' ? '→' : (expense.type === 'income' ? 'received' : 'paid')} • {expense.type === 'transfer' ? getTravelerName(expense.beneficiaries[0]) : cat.label}
                          </Text>
                        </View>
                        <View style={styles.exRight}>
                          <Text style={[styles.exAmount, expense.type === 'income' && { color: '#10B981' }]}>
                            {expense.type === 'income' ? '+' : ''}{safeFormat(expense.amount)}
                          </Text>
                          <View style={styles.exActions}>
                            <TouchableOpacity onPress={() => handleEditExpense(expense)} style={styles.exEdit}>
                              <Text style={styles.exEditText}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteExpense && deleteExpense(expense.id)} style={styles.exDelete}>
                              <Icon name="close" size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </>
        ) : (
          <View style={styles.balanceList}>
            {Object.entries(balances).map(([gid, bal]) => {
              // Try to find the group/traveler in displayGroups first
              let group = displayGroups.find(g => g.id === gid);

              // If not found, try to get the name from travelers list
              if (!group) {
                const traveler = travelers.find(t => t.id === gid);
                group = traveler
                  ? { name: traveler.name, avatar: getTravelerAvatar(gid) }
                  : { name: getTravelerName(gid), avatar: '👤' };
              }

              const isOwed = bal > 0;
              return (
                <View key={gid} style={styles.balCard}>
                  <View style={styles.balUser}>
                    <Text style={styles.balAvatar}>{group.avatar || '👤'}</Text>
                    <Text style={styles.balName}>{group.name}</Text>
                  </View>
                  <Text style={[styles.balAmount, { color: isOwed ? '#10B981' : '#EF4444' }]}>
                    {isOwed ? `gets back ${safeFormat(bal)}` : `owes ${safeFormat(Math.abs(bal))}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>Add</Text>
      </TouchableOpacity>

      {/* ADD EXPENSE MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setEditingExpenseId(null); }} style={styles.closeBtn}>
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Amount */}
              <View style={styles.amtContainer}>
                <Text style={styles.amtSymbol}>{currency.symbol}</Text>
                <TextInput
                  style={[styles.amtInput, { outlineStyle: 'none' }]}
                  placeholder="0"
                  value={newExpense.amount}
                  onChangeText={t => setNewExpense({ ...newExpense, amount: t })}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>

              {/* Title */}
              <Text style={styles.inputLabel}>For what?</Text>
              <TextInput
                style={[styles.textInput, { outlineStyle: 'none' }]}
                placeholder="e.g. Dinner, Taxi"
                value={newExpense.title}
                onChangeText={t => setNewExpense({ ...newExpense, title: t })}
                placeholderTextColor={colors.textMuted}
              />

              {/* Type Selector */}
              <View style={styles.typeSelector}>
                {['expense', 'income', 'transfer'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, newExpense.type === t && styles.typeBtnActive]}
                    onPress={() => setNewExpense({ ...newExpense, type: t })}
                  >
                    <Text style={[styles.typeBtnText, newExpense.type === t && styles.typeBtnTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category (Expense only) */}
              {(!newExpense.type || newExpense.type === 'expense') && (
                <>
                  <Text style={styles.inputLabel}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity key={cat.key} onPress={() => setNewExpense({ ...newExpense, category: cat.key })}
                        style={[styles.catChip, newExpense.category === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
                      >
                        <Icon name={cat.icon || cat.key} size={16} color={newExpense.category === cat.key ? 'white' : cat.color} />
                        <Text style={[styles.catLabel, newExpense.category === cat.key && { color: 'white' }]}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Date Selection */}
              <Text style={styles.inputLabel}>When did this happen?</Text>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.dateSelectorLeft}>
                  <Text style={styles.dateIcon}>📅</Text>
                  <Text style={styles.dateValue}>{newExpense.date || "Today"}</Text>
                </View>
                <Text style={styles.dateArrow}>→</Text>
              </TouchableOpacity>

              {/* Split / Paid By Section */}
              {isMultiUser && (
                <View style={styles.splitSection}>

                  {/* Paid By / Received By / From */}
                  <Text style={styles.inputLabel}>
                    {newExpense.type === 'income' ? 'Received By' : (newExpense.type === 'transfer' ? 'From' : 'Paid By')}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {displayGroups.map(t => (
                      <TouchableOpacity key={t.id} onPress={() => setNewExpense({ ...newExpense, paidBy: t.id })}
                        style={[styles.userChip, newExpense.paidBy === t.id && styles.userChipSelected]}
                      >
                        <Text style={[styles.userChipText, newExpense.paidBy === t.id && styles.userChipTextSelected]}>
                          {t.avatar} {t.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Transfer Target (To) */}
                  {newExpense.type === 'transfer' ? (
                    <>
                      <Text style={styles.inputLabel}>To</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {displayGroups.filter(t => t.id !== newExpense.paidBy).map(t => (
                          <TouchableOpacity key={t.id} onPress={() => setNewExpense({ ...newExpense, beneficiaries: [t.id] })}
                            style={[styles.userChip, newExpense.beneficiaries[0] === t.id && styles.userChipSelected]}
                          >
                            <Text style={[styles.userChipText, newExpense.beneficiaries[0] === t.id && styles.userChipTextSelected]}>
                              {t.avatar} {t.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  ) : (
                    <>
                      <View style={styles.splitHeader}>
                        <Text style={styles.inputLabel}>Split</Text>
                        <View style={styles.splitToggle}>
                          <TouchableOpacity onPress={() => setNewExpense({ ...newExpense, splitType: 'equal' })}
                            style={[styles.splitOpt, newExpense.splitType === 'equal' && styles.splitOptActive]}>
                            <Text style={[styles.splitText, newExpense.splitType === 'equal' && styles.splitTextActive]}>Equally</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setNewExpense({ ...newExpense, splitType: 'custom' })}
                            style={[styles.splitOpt, newExpense.splitType === 'custom' && styles.splitOptActive]}>
                            <Text style={[styles.splitText, newExpense.splitType === 'custom' && styles.splitTextActive]}>Custom</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}

                  {newExpense.type !== 'transfer' && newExpense.splitType === 'equal' ? (
                    <View style={styles.checkList}>
                      {displayGroups.map(t => {
                        const isIncluded = newExpense.beneficiaries.includes(t.id);
                        return (
                          <TouchableOpacity key={t.id} style={styles.checkRow} onPress={() => {
                            const current = newExpense.beneficiaries;
                            if (current.includes(t.id)) {
                              setNewExpense({ ...newExpense, beneficiaries: current.filter(id => id !== t.id) });
                            } else {
                              setNewExpense({ ...newExpense, beneficiaries: [...current, t.id] });
                            }
                          }}>
                            <Text style={styles.checkName}>{t.avatar} {t.name}</Text>
                            <View style={[styles.checkBox, isIncluded && styles.checkBoxActive]}>
                              {isIncluded && <Text style={styles.checkIcon}>✓</Text>}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : newExpense.type !== 'transfer' ? (
                    <View style={styles.customSplitList}>
                      {/* Validation Message */}
                      <View style={[styles.valMsg, splitStatus.isValid ? styles.valSuccess : styles.valError]}>
                        <Text style={styles.valText}>{splitStatus.message || 'Adjust amounts below'}</Text>
                      </View>

                      {displayGroups.map(t => (
                        <View key={t.id} style={styles.customRow}>
                          <Text style={styles.customName}>{t.avatar} {t.name}</Text>
                          <View style={styles.customInputWrap}>
                            <Text style={styles.customSymbol}>{currency.symbol}</Text>
                            <TextInput
                              style={styles.customInput}
                              placeholder="0"
                              keyboardType="decimal-pad"
                              value={newExpense.splitAmounts[t.id] || ''}
                              onChangeText={v => setNewExpense({
                                ...newExpense,
                                splitAmounts: { ...newExpense.splitAmounts, [t.id]: v }
                              })}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, (!newExpense.title || !newExpense.amount || (!splitStatus.isValid && isMultiUser)) && { opacity: 0.5 }]}
                disabled={!newExpense.title || !newExpense.amount || (!splitStatus.isValid && isMultiUser)}
                onPress={handleAddExpense}
              >
                <Text style={styles.saveBtnText}>{editingExpenseId ? 'Save Changes' : 'Add Transaction'}</Text>
              </TouchableOpacity>
              <View style={{ height: 50 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDateSelect}
        selectedDate={newExpense.date}
        title="Transaction Date"
        minDate={tripInfo.startDate}
        maxDate={tripInfo.endDate}
        startDate={tripInfo.startDate}
        endDate={tripInfo.endDate}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textMuted },
  // addBtn removed

  summaryCard: { backgroundColor: colors.card, margin: 20, marginTop: 0, padding: 20, borderRadius: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 4 },
  summaryBar: { height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden' },
  summaryFill: { height: '100%', borderRadius: 4 },

  scrollContent: { padding: 20 },

  // Tabs
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, backgroundColor: colors.card, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.bg },
  tabText: { fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.text },

  // Expenses
  expenseCard: { flexDirection: 'row', backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  exIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exEmoji: { fontSize: 20 },
  exContent: { flex: 1 },
  exTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  exSub: { fontSize: 12, color: colors.textMuted },
  exRight: { alignItems: 'flex-end' },
  exAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
  exDelete: { marginTop: 4, padding: 4 },
  exDeleteText: { color: colors.textMuted, fontSize: 12 },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: colors.textMuted },

  // Balances
  balCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.card, padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  balUser: { flexDirection: 'row', alignItems: 'center' },
  balAvatar: { fontSize: 20, marginRight: 8 },
  balName: { fontWeight: '600', color: colors.text },
  balAmount: { fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  closeBtn: { padding: 8, backgroundColor: colors.bg, borderRadius: 20 },
  closeText: { fontSize: 16, color: colors.text },

  amtContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  amtSymbol: { fontSize: 32, fontWeight: '700', color: colors.primary, marginRight: 8 },
  amtInput: { fontSize: 48, fontWeight: '800', color: colors.text, minWidth: 100, textAlign: 'center', padding: 0 },

  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8, marginTop: 16 },
  textInput: { backgroundColor: colors.bg, padding: 16, borderRadius: 16, fontSize: 16, color: colors.text, fontWeight: '600' },

  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.primaryBorder },
  catEmoji: { marginRight: 6 },
  catLabel: { fontWeight: '600', color: colors.text },

  splitSection: { marginTop: 24, padding: 16, backgroundColor: colors.bg, borderRadius: 20 },
  userChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.card, marginRight: 8 },
  userChipSelected: { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary },

  splitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  splitToggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 10, padding: 2 },
  splitOpt: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  splitOptActive: { backgroundColor: colors.primary },
  splitText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  splitTextActive: { color: 'black', fontWeight: '800' },

  checkList: { gap: 8 },
  checkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  checkName: { fontWeight: '600', color: colors.text },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  checkBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkIcon: { color: 'black', fontSize: 14, fontWeight: '800' },

  customSplitList: { gap: 12 },
  customRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customName: { fontWeight: '600', color: colors.text },
  customInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flex: 1, marginLeft: 16, borderWidth: 1, borderColor: colors.primaryBorder },
  customSymbol: { color: colors.text, marginRight: 8, fontSize: 16, fontWeight: '700' },
  customInput: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'right', padding: 0, outlineStyle: 'none' },

  valMsg: { padding: 8, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  valSuccess: { backgroundColor: '#10B98120' },
  valError: { backgroundColor: '#EF444420' },
  valText: { fontWeight: '700', fontSize: 12, color: colors.text },

  saveBtn: { backgroundColor: colors.primary, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: 'black', fontSize: 16, fontWeight: '800' },

  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  fabIcon: { color: 'black', fontSize: 24, fontWeight: 'bold', marginRight: 8 },
  fabText: { color: 'black', fontSize: 16, fontWeight: 'bold' },

  typeSelector: { flexDirection: 'row', backgroundColor: colors.bg, padding: 4, borderRadius: 12, marginVertical: 16 },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  typeBtnActive: { backgroundColor: colors.card },
  typeBtnText: { color: colors.textMuted, fontWeight: '600' },
  typeBtnTextActive: { color: colors.text, fontWeight: '700' },

  userChipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  userChipTextSelected: { color: colors.primary },

  // New Styles
  exHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  exDate: { fontSize: 10, color: colors.textMuted },
  exActions: { flexDirection: 'row', gap: 12, marginTop: 4, alignItems: 'center' },
  exEdit: { padding: 4 },
  exEditText: { fontSize: 12 },

  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg, padding: 16, borderRadius: 16, marginVertical: 8, borderWidth: 1, borderColor: colors.primaryBorder },
  dateSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateIcon: { fontSize: 18 },
  dateValue: { fontSize: 16, color: colors.text, fontWeight: '600' },
  dateArrow: { color: colors.textMuted, fontSize: 16 },

  // Grouping Styles
  dateGroup: { marginBottom: 20 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  dateHeaderText: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.primaryBorder, opacity: 0.5 },
});
