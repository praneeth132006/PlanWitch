import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Animated, Pressable, Modal, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTravelContext } from '../context/TravelContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import DatePickerModal from '../components/DatePickerModal';
import { auth } from '../config/firebase';
import Icon from '../components/Icon';
import TripMap from '../components/TripMap';

export default function HomeScreen({ onBackToHome, onSetScreen }) {
  const {
    tripInfo, setTripInfo, budget, setBudget, getTotalExpenses, getRemainingBudget,
    packingItems, itinerary, expenses, clearTrip, endTrip, formatCurrency, currency, isLoading, deleteTrip,
    getAllTravelers, localParticipantId, tripPreferences
  } = useTravelContext();
  const { colors } = useTheme();
  const navigation = useNavigation();

  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showTravelersModal, setShowTravelersModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEndTripModal, setShowEndTripModal] = useState(false);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Edit states
  const [newBudget, setNewBudget] = useState(budget.total.toString());
  const [newTravelerName, setNewTravelerName] = useState('');
  const [travelers, setTravelers] = useState([]);

  useEffect(() => {
    // Show all travelers including self
    setTravelers(getAllTravelers());
  }, [tripInfo.participants, localParticipantId]);
  const [editStartDate, setEditStartDate] = useState(tripInfo.startDate || '');
  const [editEndDate, setEditEndDate] = useState(tripInfo.endDate || '');

  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  // Check if trip has ended automatically
  useEffect(() => {
    const checkTripEnded = async () => {
      if (tripInfo.endDate && !tripInfo.isCompleted) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        try {
          const parts = tripInfo.endDate.split(' ');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const endDate = new Date(parseInt(parts[2]), months.indexOf(parts[1]), parseInt(parts[0]));
          endDate.setHours(23, 59, 59, 999);

          if (today > endDate) {
            // Trip has ended, add to history
            await handleAutoEndTrip();
          }
        } catch (e) {
          console.log('Error checking trip end date:', e);
        }
      }
    };

    checkTripEnded();
  }, [tripInfo.endDate]);

  const packedCount = packingItems.filter(item => item.packed).length;
  const totalItems = packingItems.length;
  const packingProgress = totalItems > 0 ? (packedCount / totalItems) * 100 : 0;
  const spentPercentage = budget.total > 0 ? (getTotalExpenses() / budget.total) * 100 : 0;
  const participantCount = tripInfo.participants?.length || 1;
  const remainingBudget = getRemainingBudget();
  const lastExpense = expenses.length > 0 ? expenses[expenses.length - 1] : null;
  const recentExpenses = expenses.slice(-2).reverse();

  const getCategoryInfo = (key) => {
    const categories = {
      accommodation: { icon: 'stay', color: '#8B5CF6' },
      transport: { icon: 'transport', color: '#3B82F6' },
      food: { icon: 'food', color: '#F59E0B' },
      activities: { icon: 'activities', color: '#10B981' },
      shopping: { icon: 'shopping', color: '#EC4899' },
      other: { icon: 'other', color: '#6B7280' },
    };
    return categories[key] || categories.other;
  };

  const getTripDays = () => {
    if (!tripInfo.startDate || !tripInfo.endDate) return 0;
    try {
      const parts1 = tripInfo.startDate.split(' ');
      const parts2 = tripInfo.endDate.split(' ');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startDate = new Date(parseInt(parts1[2]), months.indexOf(parts1[1]), parseInt(parts1[0]));
      const endDate = new Date(parseInt(parts2[2]), months.indexOf(parts2[1]), parseInt(parts2[0]));
      const diffTime = endDate - startDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  };

  const getDaysUntilTrip = () => {
    if (!tripInfo.startDate) return null;
    try {
      const parts = tripInfo.startDate.split(' ');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startDate = new Date(parseInt(parts[2]), months.indexOf(parts[1]), parseInt(parts[0]));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = startDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const tripDays = getTripDays();
  const daysUntil = getDaysUntilTrip();

  const uniquePlacesCount = useMemo(() => {
    const places = new Set();
    // Add setup stops
    if (tripInfo.stops && Array.isArray(tripInfo.stops)) {
      tripInfo.stops.forEach(s => {
        if (s.place_id) places.add(s.place_id);
        else if (s.name) places.add(s.name);
      });
    }
    // Add itinerary items (activities)
    if (itinerary && Array.isArray(itinerary)) {
      itinerary.forEach(i => {
        // Itinerary items might be just activities without location data, but if they have a location/name
        const key = i.place_id || i.location || i.name;
        if (key) places.add(key);
      });
    }
    return places.size;
  }, [tripInfo.stops, itinerary]);

  const goToItinerary = () => navigation.navigate('Itinerary');
  const goToExpenses = () => navigation.navigate('Expenses');



  const handlePersonalizedPlan = () => {
    // Check if we have preferences. If not, go to wizard first.
    // We check for some key field like 'style' to know if wizard was done.
    if (!tripPreferences || !tripPreferences.style) {
      onSetScreen('TripPreferences');
    } else {
      onSetScreen('AIPersonalizedPlan');
    }
  };

  // Trip management functions
  const handleUpdateBudget = () => {
    const amount = parseFloat(newBudget);
    if (amount > 0) {
      setBudget(prev => ({ ...prev, total: amount }));
      setShowBudgetModal(false);
    }
  };

  const handleUpdateDates = () => {
    if (editStartDate && editEndDate) {
      setTripInfo(prev => ({
        ...prev,
        startDate: editStartDate,
        endDate: editEndDate
      }));
      setShowDatesModal(false);
    }
  };

  const handleAddTraveler = () => {
    if (newTravelerName.trim()) {
      const isFamilyTrip = tripInfo.tripType === 'family';
      const newParticipant = {
        id: `p_${Date.now()}`,
        name: newTravelerName.trim(),
        type: 'member',
        familyGroup: isFamilyTrip ? 'Family 1' : null
      };

      setTripInfo(prev => ({
        ...prev,
        participants: [...(prev.participants || []), newParticipant]
      }));
      setNewTravelerName('');
    }
  };

  const handleRemoveTraveler = (id) => {
    if (!id) return;
    setTripInfo(prev => ({
      ...prev,
      participants: (prev.participants || []).filter(p => p.id !== id)
    }));
  };

  const handleAutoEndTrip = async () => {
    if (endTrip) {
      await endTrip();
    }
    onBackToHome();
  };

  const handleEndTrip = async () => {
    console.log('handleEndTrip called, tripInfo:', tripInfo);
    if (endTrip) {
      const result = await endTrip();
      if (result && result.success) {
        setShowEndTripModal(false);
        onBackToHome();
      } else {
        Alert.alert('Error', result.error || 'Failed to end trip');
      }
    }
  };

  const handleDeleteTrip = async () => {
    // Delete from all trips list if ID exists
    if (tripInfo.id && deleteTrip) {
      await deleteTrip(tripInfo.id);
    }

    // Clear current trip data
    if (clearTrip) {
      const result = await clearTrip();
      if (result && result.success) {
        setShowDeleteModal(false);
        onBackToHome();
      } else {
        Alert.alert('Error', result.error || 'Failed to delete trip');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={styles.headerLabel}>YOUR TRIP</Text>
              <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                {tripInfo.destination || 'My Adventure'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.settingsButton}
                onPress={() => setShowSettingsModal(true)}
              >
                <Icon name="settings" size={24} color={colors.text} />
              </Pressable>
              <Pressable style={styles.backButton} onPress={onBackToHome}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Trip Status Badge */}
          {daysUntil !== null && (
            <View style={styles.statusBadge}>
              <Icon
                name={daysUntil < 0 ? 'flight' : daysUntil === 0 ? 'party' : 'calendar'}
                size={16}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.statusText}>
                {daysUntil < 0 ? 'Trip in progress!' : daysUntil === 0 ? 'Trip starts today!' : `${daysUntil} days to go`}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Prominent AI Personalization Prompt if missing preferences */}


        {/* Main Map & Info Section */}
        <Animated.View style={[styles.mainSection, { transform: [{ scale: scaleAnim }] }]}>
          {/* Top: Interactive Map (Read-Only visualization) */}
          <TripMap
            origin={tripInfo.origin || { latitude: tripInfo.latitude, longitude: tripInfo.longitude, name: tripInfo.destination }}
            stops={[...(tripInfo.stops || []), ...itinerary]}
            destination={tripInfo.endLocation}
            style={styles.mapContainer}
            borderRadius={24}
          />

          {/* Nike-style Boxed Info Card */}
          <View style={styles.boxedInfoCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTripName}>{tripInfo.destination || 'My Adventure'}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.typeTag}>
                    <Text style={styles.typeTagText}>{(tripInfo.tripType || 'Solo').toUpperCase()}</Text>
                  </View>
                  <View style={[styles.typeTag, { backgroundColor: '#3B82F620' }]}>
                    <Text style={[styles.typeTagText, { color: '#3B82F6' }]}>{tripDays} DAYS</Text>
                  </View>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.heartButton, pressed && { opacity: 0.7 }]}
                onPress={() => setShowSettingsModal(true)}
              >
                <Icon name="settings" size={20} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.cardDescription} numberOfLines={3}>
              A {tripInfo.tripType || 'solo'} adventure to {tripInfo.destination || 'your next destination'}.
              Discover {uniquePlacesCount} places and manage your {formatCurrency(budget.total)} budget with ease.
            </Text>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>PLACES</Text>
                <Text style={styles.gridValue}>{uniquePlacesCount}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>TRAVELERS</Text>
                <Text style={styles.gridValue}>{travelers.length}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>STOPS</Text>
                <Text style={styles.gridValue}>{tripInfo.stops ? tripInfo.stops.length : 0}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>DAYS</Text>
                <Text style={styles.gridValue}>{tripDays}</Text>
              </View>
            </View>


          </View>
        </Animated.View>


        {/* Participants - Keep this section */}
        {/* {travelers.length > 0 && ( */}
        <Animated.View style={[styles.participantsSection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="group" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Travelers</Text>
            </View>
            <TouchableOpacity onPress={() => setShowTravelersModal(true)}>
              <Text style={styles.viewMoreText}>Edit →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.participantsCard}>
            <View style={styles.participantsList}>
              {tripInfo.tripType === 'family' ? (
                // Grouped View for Family
                (() => {
                  const groups = {};
                  const allParticipants = getAllTravelers();

                  allParticipants.forEach(t => {
                    const gName = t.familyGroup || 'Family 1';
                    if (!groups[gName]) groups[gName] = [];
                    groups[gName].push(t);
                  });

                  return Object.entries(groups).map(([groupName, members], gIndex) => (
                    <View key={groupName} style={[styles.familyGroupItem, gIndex > 0 && styles.familyGroupDivider]}>
                      <Text style={styles.familyGroupName}>{groupName}</Text>
                      <View style={styles.familyMembersList}>
                        {members.map((p, idx) => (
                          <View key={idx} style={styles.participantItem}>
                            <View style={[styles.participantAvatar, p.isMe && { backgroundColor: colors.primary }]}>
                              {p.userId ? (
                                <Icon
                                  name={p.photoURL || 'profile_avatar'}
                                  size={32}
                                  style={{ borderRadius: 16 }}
                                />
                              ) : (
                                <Icon
                                  name="tour_guide"
                                  size={32}
                                  style={{ borderRadius: 16 }}
                                />
                              )}
                            </View>
                            <View style={styles.participantInfo}>
                              <Text style={styles.participantName}>{p.name}{p.type === 'owner' ? ' (Organizer)' : ''}</Text>
                              {p.userId ? (
                                <Text style={styles.joinedStatus}>Joined</Text>
                              ) : (
                                <Text style={styles.waitingStatus}>Pending</Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ));
                })()
              ) : (
                // Original View for Friends/Others - NOW LIST FORMAT
                getAllTravelers().map((p, index) => (
                  <View key={index} style={styles.participantItem}>
                    <View style={[styles.participantAvatar, p.isMe && { backgroundColor: colors.primary }]}>
                      {p.userId ? (
                        <Icon
                          name={p.photoURL || 'profile_avatar'}
                          size={32}
                          style={{ borderRadius: 16 }}
                        />
                      ) : (
                        <Icon
                          name="tour_guide"
                          size={32}
                          style={{ borderRadius: 16 }}
                        />
                      )}
                    </View>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{p.name}{p.type === 'owner' ? ' (Organizer)' : ''}</Text>
                      {p.userId ? (
                        <Text style={styles.joinedStatus}>Joined</Text>
                      ) : (
                        <Text style={styles.waitingStatus}>Pending</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </Animated.View>
        {/* )} */}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="settings" size={24} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Trip Settings</Text>
              </View>
              <Pressable onPress={() => setShowSettingsModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.settingsList}>
              <Pressable
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  setEditStartDate(tripInfo.startDate);
                  setEditEndDate(tripInfo.endDate);
                  setShowDatesModal(true);
                }}
              >
                <View style={[styles.settingsIconBg, { backgroundColor: '#8B5CF620' }]}>
                  <Icon name="calendar" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.settingsInfo}>
                  <Text style={styles.settingsLabel}>Edit Travel Dates</Text>
                  <Text style={styles.settingsDesc}>{tripInfo.startDate} → {tripInfo.endDate}</Text>
                </View>
                <Text style={styles.settingsArrow}>→</Text>
              </Pressable>

              <Pressable
                style={styles.settingsItem}
                onPress={() => { setShowSettingsModal(false); setShowBudgetModal(true); }}
              >
                <View style={[styles.settingsIconBg, { backgroundColor: '#10B98120' }]}>
                  <Icon name="budget" size={20} color="#10B981" />
                </View>
                <View style={styles.settingsInfo}>
                  <Text style={styles.settingsLabel}>Edit Budget</Text>
                  <Text style={styles.settingsDesc}>Current: {formatCurrency(budget.total)}</Text>
                </View>
                <Text style={styles.settingsArrow}>→</Text>
              </Pressable>

              <Pressable
                style={styles.settingsItem}
                onPress={() => { setShowSettingsModal(false); setShowTravelersModal(true); }}
              >
                <View style={[styles.settingsIconBg, { backgroundColor: '#3B82F620' }]}>
                  <Icon name="group" size={20} color="#3B82F6" />
                </View>
                <View style={styles.settingsInfo}>
                  <Text style={styles.settingsLabel}>Manage Travelers</Text>
                  <Text style={styles.settingsDesc}>{participantCount} travelers</Text>
                </View>
                <Text style={styles.settingsArrow}>→</Text>
              </Pressable>

              <Pressable
                style={styles.settingsItem}
                onPress={() => { setShowSettingsModal(false); setShowEndTripModal(true); }}
              >
                <View style={[styles.settingsIconBg, { backgroundColor: '#F59E0B20' }]}>
                  <Icon name="close" size={20} color="#F59E0B" />
                </View>
                <View style={styles.settingsInfo}>
                  <Text style={styles.settingsLabel}>End Trip</Text>
                  <Text style={styles.settingsDesc}>Mark trip as completed</Text>
                </View>
                <Text style={styles.settingsArrow}>→</Text>
              </Pressable>

              <Pressable
                style={[styles.settingsItem, styles.settingsItemDanger]}
                onPress={() => { setShowSettingsModal(false); setShowDeleteModal(true); }}
              >
                <View style={[styles.settingsIconBg, { backgroundColor: '#EF444420' }]}>
                  <Icon name="delete" size={20} color="#EF4444" />
                </View>
                <View style={styles.settingsInfo}>
                  <Text style={[styles.settingsLabel, { color: '#EF4444' }]}>Delete Trip</Text>
                  <Text style={styles.settingsDesc}>Remove trip permanently</Text>
                </View>
                <Text style={[styles.settingsArrow, { color: '#EF4444' }]}>→</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Dates Modal */}
      <Modal visible={showDatesModal} transparent animationType="slide" onRequestClose={() => setShowDatesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Edit Travel Dates</Text>
              <Pressable onPress={() => setShowDatesModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.datesEditSection}>
              <Pressable
                style={styles.dateEditCard}
                onPress={() => setShowStartDatePicker(true)}
              >
                <View style={styles.dateEditIcon}>
                  <Text style={styles.dateEditEmoji}>🛫</Text>
                </View>
                <View style={styles.dateEditContent}>
                  <Text style={styles.dateEditLabel}>Start Date</Text>
                  <Text style={styles.dateEditValue}>{editStartDate || 'Select date'}</Text>
                </View>
                <Text style={styles.dateEditArrow}>→</Text>
              </Pressable>

              <Pressable
                style={styles.dateEditCard}
                onPress={() => setShowEndDatePicker(true)}
              >
                <View style={styles.dateEditIcon}>
                  <Text style={styles.dateEditEmoji}>🛬</Text>
                </View>
                <View style={styles.dateEditContent}>
                  <Text style={styles.dateEditLabel}>End Date</Text>
                  <Text style={styles.dateEditValue}>{editEndDate || 'Select date'}</Text>
                </View>
                <Text style={styles.dateEditArrow}>→</Text>
              </Pressable>

              {editStartDate && editEndDate && (
                <View style={styles.durationPreview}>
                  <Text style={styles.durationPreviewEmoji}>📆</Text>
                  <Text style={styles.durationPreviewText}>
                    Trip duration will be updated
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              style={[styles.saveButton, (!editStartDate || !editEndDate) && { opacity: 0.5 }]}
              onPress={handleUpdateDates}
              disabled={!editStartDate || !editEndDate}
            >
              <Text style={styles.saveButtonText}>Save Dates</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Budget Modal */}
      <Modal visible={showBudgetModal} transparent animationType="slide" onRequestClose={() => setShowBudgetModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Edit Budget</Text>
              <Pressable onPress={() => setShowBudgetModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.budgetEditSection}>
              <Text style={styles.budgetEditLabel}>Total Trip Budget</Text>
              <View style={styles.budgetInputRow}>
                <Text style={styles.budgetCurrency}>{currency.symbol}</Text>
                <TextInput
                  style={[styles.budgetInputField, { outlineStyle: 'none' }]}
                  value={newBudget}
                  onChangeText={(text) => setNewBudget(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.budgetInfo}>
                <Text style={styles.budgetInfoText}>💳 Spent: {formatCurrency(getTotalExpenses())}</Text>
                <Text style={styles.budgetInfoText}>📊 Remaining: {formatCurrency(parseFloat(newBudget || 0) - getTotalExpenses())}</Text>
              </View>
            </View>

            <Pressable style={styles.saveButton} onPress={handleUpdateBudget}>
              <Text style={styles.saveButtonText}>Save Budget</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Travelers Modal */}
      <Modal visible={showTravelersModal} transparent animationType="slide" onRequestClose={() => setShowTravelersModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👥 Manage Travelers</Text>
              <Pressable onPress={() => setShowTravelersModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Add Traveler */}
            <View style={styles.addTravelerSection}>
              <View style={styles.addTravelerInput}>
                <TextInput
                  style={[styles.travelerInput, { outlineStyle: 'none' }]}
                  placeholder="Add traveler name..."
                  placeholderTextColor={colors.textMuted}
                  value={newTravelerName}
                  onChangeText={setNewTravelerName}
                />
                <Pressable
                  style={[styles.addTravelerBtn, !newTravelerName.trim() && { opacity: 0.5 }]}
                  onPress={handleAddTraveler}
                  disabled={!newTravelerName.trim()}
                >
                  <Text style={styles.addTravelerBtnText}>Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Travelers List */}
            <ScrollView style={styles.travelersList}>
              {getAllTravelers().map((traveler, index) => (
                <View key={index} style={styles.travelerCard}>
                  <View style={[styles.travelerAvatar, traveler.isMe && { backgroundColor: colors.primary }]}>
                    {traveler.userId ? (
                      <Icon
                        name={traveler.photoURL || 'profile_avatar'}
                        size={32}
                        style={{ borderRadius: 16 }}
                      />
                    ) : (
                      <Icon
                        name="tour_guide"
                        size={32}
                        style={{ borderRadius: 16 }}
                      />
                    )}
                  </View>
                  <View style={styles.travelerInfo}>
                    <Text style={styles.travelerName}>{traveler.name}</Text>
                    <Text style={styles.travelerRole}>{traveler.type === 'owner' ? 'Organizer' : (traveler.relation || traveler.type || 'Member')}</Text>
                  </View>
                  {!traveler.isMe && (
                    <Pressable style={styles.removeTravelerBtn} onPress={() => handleRemoveTraveler(traveler.id)}>
                      <Icon name="close" size={14} color="#EF4444" />
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>

            <Pressable style={styles.saveButton} onPress={() => setShowTravelersModal(false)}>
              <Text style={styles.saveButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* End Trip Modal */}
      <Modal visible={showEndTripModal} transparent animationType="fade" onRequestClose={() => setShowEndTripModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconBg}>
              <Text style={styles.confirmIcon}>🏁</Text>
            </View>
            <Text style={styles.confirmTitle}>End Trip?</Text>
            <Text style={styles.confirmText}>
              This will mark your trip as completed. You can view it in your trip history.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable style={[styles.confirmCancelBtn, isLoading && { opacity: 0.5 }]} onPress={() => setShowEndTripModal(false)} disabled={isLoading}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.confirmActionBtn, isLoading && { opacity: 0.5 }]} onPress={handleEndTrip} disabled={isLoading}>
                {isLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.confirmActionText}>End Trip</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Trip Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={[styles.confirmIconBg, { backgroundColor: '#EF444420' }]}>
              <Text style={styles.confirmIcon}>🗑️</Text>
            </View>
            <Text style={styles.confirmTitle}>Delete Trip?</Text>
            <Text style={styles.confirmText}>
              This action cannot be undone. All trip data including expenses, itinerary, and packing lists will be permanently deleted.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable style={[styles.confirmCancelBtn, isLoading && { opacity: 0.5 }]} onPress={() => setShowDeleteModal(false)} disabled={isLoading}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.confirmActionBtn, { backgroundColor: '#EF4444' }, isLoading && { opacity: 0.5 }]} onPress={handleDeleteTrip} disabled={isLoading}>
                {isLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.confirmActionText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onSelect={(date) => setEditStartDate(date)}
        selectedDate={editStartDate}
        title="Select Start Date"
      />
      <DatePickerModal
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onSelect={(date) => setEditEndDate(date)}
        selectedDate={editEndDate}
        title="Select End Date"
        minDate={editStartDate}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 10 },
  settingsButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primaryBorder },
  settingsButtonText: { fontSize: 18 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primaryBorder },
  backButtonText: { color: colors.textMuted, fontSize: 18 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryMuted, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginTop: 12, borderWidth: 1, borderColor: colors.primaryBorder },

  // AI Prompt Card
  aiPromptCard: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  aiPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  aiPromptTextContainer: {
    flex: 1,
  },
  aiPromptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  aiPromptSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  aiPromptAction: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  aiPromptActionText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  statusEmoji: { fontSize: 16, marginRight: 8 },
  statusText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  // Main Section (Map + Boxed Info)
  mainSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 24,
    backgroundColor: colors.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  mapContainer: {
    height: 250,
  },
  boxedInfoCard: {
    padding: 24,
    backgroundColor: colors.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTripName: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  typeTag: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  heartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  cardDescription: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.bg,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  gridValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.primaryBorder,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: colors.text,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '800',
  },


  // Participants
  participantsSection: { paddingHorizontal: 20, marginBottom: 20 },
  participantsCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primaryBorder },
  participantsList: {
    padding: 8,
    padding: 8,
    gap: 12,
  },
  familyGroupItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  familyGroupName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  familyGroupMembers: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  familyGroupDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.primaryBorder,
    marginTop: 8,
  },
  participantItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.primaryBorder },
  participantAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.cardLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  participantInitial: { color: colors.text, fontSize: 14, fontWeight: '600' },
  participantName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  participantInfo: { flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.textMuted, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.cardLight, alignItems: 'center', justifyContent: 'center' },
  modalCloseBtnText: { color: colors.textMuted, fontSize: 22 },

  // Settings List
  settingsList: { gap: 12 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, borderRadius: 14, padding: 14 },
  settingsItemDanger: { backgroundColor: '#EF444410' },
  settingsIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 20 },
  settingsInfo: { flex: 1, marginLeft: 12 },
  settingsLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  settingsDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  settingsArrow: { color: colors.textMuted, fontSize: 18 },

  // Budget Edit
  budgetEditSection: { backgroundColor: colors.cardLight, borderRadius: 16, padding: 20, marginBottom: 20 },
  budgetEditLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  budgetInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  budgetCurrency: { color: colors.text, fontSize: 36, fontWeight: 'bold' },
  budgetInputField: { color: colors.text, fontSize: 48, fontWeight: 'bold', minWidth: 120, textAlign: 'center' },
  budgetInfo: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.primaryBorder },
  budgetInfoText: { color: colors.textMuted, fontSize: 13 },

  // Travelers
  addTravelerSection: { marginBottom: 16 },
  addTravelerInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, borderRadius: 12, padding: 4 },
  travelerInput: { flex: 1, color: colors.text, fontSize: 15, padding: 12 },
  addTravelerBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  addTravelerBtnText: { color: colors.bg, fontSize: 14, fontWeight: 'bold' },
  travelersList: { maxHeight: 300 },
  travelerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, borderRadius: 12, padding: 12, marginBottom: 10 },
  travelerAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  travelerAvatarText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  travelerInfo: { flex: 1, marginLeft: 12 },
  travelerName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  travelerRole: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  removeTravelerBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  removeTravelerBtnText: { color: colors.textMuted, fontSize: 14 },

  // Save Button
  saveButton: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveButtonText: { color: colors.bg, fontSize: 16, fontWeight: 'bold' },

  // Confirm Modal
  confirmModal: { backgroundColor: colors.card, borderRadius: 24, padding: 24, marginHorizontal: 20, alignItems: 'center' },
  confirmIconBg: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmIcon: { fontSize: 36 },
  confirmTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  confirmText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancelBtn: { flex: 1, backgroundColor: colors.cardLight, borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmCancelText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  confirmActionBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmActionText: { color: colors.bg, fontSize: 15, fontWeight: 'bold' },

  // Add Date Edit styles
  datesEditSection: { gap: 12, marginBottom: 20 },
  dateEditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  dateEditIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dateEditEmoji: { fontSize: 22 },
  dateEditContent: { flex: 1, marginLeft: 14 },
  dateEditLabel: { color: colors.textMuted, fontSize: 12 },
  dateEditValue: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
  dateEditArrow: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
  durationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  durationPreviewEmoji: { fontSize: 18 },
  durationPreviewText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  joinedStatus: { color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  waitingStatus: { color: '#F59E0B', fontSize: 11, fontWeight: '600', marginTop: 2 },
});
