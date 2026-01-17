import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Animated, Pressable, Modal, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTravelContext } from '../context/TravelContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import DatePickerModal from '../components/DatePickerModal';
import { auth } from '../config/firebase';
import Icon from '../components/Icon';
import Calendar from '../components/Calendar';
import TripMap from '../components/TripMap';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import { generateDestinationInfo } from '../services/aiService';
import BannerAd from '../components/BannerAd';

export default function HomeScreen({ onBackToHome, onSetScreen }) {
  const {
    tripInfo, setTripInfo, budget, setBudget, getTotalExpenses, getRemainingBudget,
    packingItems, itinerary, expenses, clearTrip, endTrip, formatCurrency, currency, isLoading, deleteTrip,
    getAllTravelers, localParticipantId, tripPreferences, checkFeatureAccess
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
  const [showLocationEditModal, setShowLocationEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNameEditModal, setShowNameEditModal] = useState(false);


  // Edit states
  const [newBudget, setNewBudget] = useState(budget.total.toString());
  const [newTravelerName, setNewTravelerName] = useState('');
  const [travelers, setTravelers] = useState([]);
  const [editStartDate, setEditStartDate] = useState(tripInfo.startDate || '');
  const [editEndDate, setEditEndDate] = useState(tripInfo.endDate || '');
  const [editLocations, setEditLocations] = useState({
    origin: null,       // Full place object with coords
    stops: [],          // Array of place objects
    endLocation: null   // Full place object with coords
  });
  const [editTripName, setEditTripName] = useState(tripInfo.name || '');

  // Derived State
  const isAdmin = tripInfo.tripType === 'friends' || tripInfo.tripType === 'family' || true; // Allow all for now or check ownerId

  useEffect(() => {
    // Show all travelers including self
    setTravelers(getAllTravelers());
  }, [tripInfo.participants, localParticipantId]);

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
    checkTripEnded();
  }, [tripInfo.endDate]);

  // AI Destination Info Generation
  useEffect(() => {
    const fetchDestinationInfo = async () => {
      // Only generate if we have a destination and no description yet
      if (tripInfo.destination && !tripInfo.aiDescription && !tripInfo.aiDescriptionLoading) {
        // Mark as loading to prevent duplicate calls (using local approach or optimistic update)
        // For simplicity, we'll rely on the effect dependency and a local ref/flag if needed, 
        // but here we just check if it's already there. 
        // We can't easily check 'loading' state in tripInfo without adding it, so we'll just fire it.
        // To avoid loops, we check if it is explicitly NOT set.

        try {
          const result = await generateDestinationInfo(tripInfo.destination);
          if (result.success && result.info) {
            setTripInfo(prev => ({ ...prev, aiDescription: result.info }));
          }
        } catch (e) {
        }
      }
    };

    fetchDestinationInfo();
  }, [tripInfo.destination]);

  const packedCount = packingItems.filter(item => item.packed).length;
  const totalItems = packingItems.length;
  const packingProgress = totalItems > 0 ? (packedCount / totalItems) * 100 : 0;
  const spentPercentage = budget.total > 0 ? (getTotalExpenses() / budget.total) * 100 : 0;
  const participantCount = tripInfo.participants?.length || 1;
  const remainingBudget = getRemainingBudget();
  const recentExpenses = expenses.slice(-2).reverse();

  const SETTINGS_OPTIONS = [
    { id: 'edit_dates', label: 'Edit Travel Dates', icon: 'calendar', page: 'BudgetScreen' },
    { id: 'edit_locations', label: 'Edit Locations', icon: 'location', page: 'LocationScreen' },
    { id: 'manage_travelers', label: 'Manage Travelers', icon: 'group', page: 'TravelersScreen' },
    { id: 'end_trip', label: 'End Trip', icon: 'close-circle', page: 'EndTrip' },
    { id: 'delete_trip', label: 'Delete Trip', icon: 'delete', page: 'DeleteTrip', danger: true },
  ];

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

  const handleUpdateName = async () => {
    if (!editTripName.trim()) {
      Alert.alert('Required', 'Please enter a trip name');
      return;
    }
    try {
      await setTripInfo({ ...tripInfo, name: editTripName.trim() });
      setShowNameEditModal(false);
    } catch (error) {
      console.error('Error updating trip name:', error);
      Alert.alert('Error', 'Failed to update trip name');
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

  // Main Locations Count (Unique Stops only)
  const mainLocationsCount = useMemo(() => {
    if (!tripInfo.stops || !Array.isArray(tripInfo.stops)) return 0;
    const uniqueStops = new Set();
    tripInfo.stops.forEach(s => {
      if (s.name) uniqueStops.add(s.name.trim());
    });
    return uniqueStops.size;
  }, [tripInfo.stops]);

  // Last Expense Logic
  const lastExpense = useMemo(() => {
    if (!expenses || expenses.length === 0) return null;
    // Sort by date descending
    const sorted = [...expenses].sort((a, b) => {
      const timeA = a.date?.seconds ? a.date.seconds * 1000 : (a.date || 0);
      const timeB = b.date?.seconds ? b.date.seconds * 1000 : (b.date || 0);
      return timeB - timeA;
    });
    return sorted[0];
  }, [expenses]);

  const goToItinerary = () => navigation.navigate('Itinerary');
  const goToExpenses = () => navigation.navigate('Expenses');

  const handleSettingsOptionPress = (option) => {
    setShowSettingsModal(false);
    if (option.id === 'edit_dates') {
      setEditStartDate(tripInfo.startDate || '');
      setEditEndDate(tripInfo.endDate || '');
      setShowDatesModal(true);
    } else if (option.id === 'edit_locations') {
      // Initialize with full place objects from tripInfo
      // Helper to ensure we have a valid place object structure
      const normalizePlace = (place) => {
        if (!place) return null;
        // If it's already an object with keys we expect, return it
        if (typeof place === 'object' && (place.name || place.fullAddress || place.place_id)) return place;
        // If it's a string (legacy data), convert to basic object
        if (typeof place === 'string') return { name: place, fullAddress: place };
        return place;
      };

      const normalizedOrigin = normalizePlace(tripInfo.origin || tripInfo.start);
      const normalizedEnd = normalizePlace(tripInfo.endLocation);
      const normalizedStops = (tripInfo.stops || []).map(normalizePlace).filter(Boolean);

      setEditLocations({
        origin: normalizedOrigin,
        stops: normalizedStops,
        endLocation: normalizedEnd
      });
      setShowLocationEditModal(true);
    } else if (option.id === 'manage_travelers') {
      setTravelers(getAllTravelers());
      setShowTravelersModal(true);
    } else if (option.id === 'end_trip') {
      setShowEndTripModal(true);
    } else if (option.id === 'delete_trip') {
      setShowDeleteModal(true);
    }
  };

  const handleUpdateDatesV2 = (startStr, endStr) => {
    // startStr and endStr come from Calendar "DD MMM YYYY"
    // Update tripInfo directly
    setTripInfo(prev => ({
      ...prev,
      startDate: startStr,
      endDate: endStr || startStr
    }));
    setShowDatesModal(false);
  };

  const handleSaveLocations = async () => {
    // Filter out null/empty stops
    const cleanStops = editLocations.stops.filter(s => s && (s.name || s.fullAddress));

    // Build destination string from stops for legacy compatibility
    const destinationNames = cleanStops.map(s => s.name || s.fullAddress || '').filter(Boolean);
    const destinationString = destinationNames.join(' - ') || tripInfo.destination;

    // Update local state with full place objects (includes lat/lng for map)
    const updatedTrip = {
      ...tripInfo,
      destination: destinationString,
      origin: editLocations.origin,
      start: editLocations.origin, // Legacy support
      stops: cleanStops,
      endLocation: editLocations.endLocation
    };

    setTripInfo(updatedTrip); // Update context
    setShowLocationEditModal(false);
  };


  const handlePersonalizedPlan = () => {
    const access = checkFeatureAccess('ai_planning');
    if (!access.allowed) {
      Alert.alert(
        'Pro Feature',
        access.reason,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }

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
        {/* Header - Now shows Trip Status/Countdown */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary + '15', // Soft background
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.primary + '30',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}>
                <Text style={{
                  color: colors.primary,
                  fontWeight: '700',
                  fontSize: 13,
                  letterSpacing: 0.5
                }}>
                  {daysUntil < 0 ? 'TRIP IN PROGRESS' : daysUntil === 0 ? 'TRIP STARTS TODAY!' : `${daysUntil} DAYS TO GO`}
                </Text>
              </View>
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
        </Animated.View>

        {/* Main Map & Info Section */}
        <Animated.View style={[styles.mainSection, { transform: [{ scale: scaleAnim }] }]}>
          {/* Top: Interactive Map (Read-Only visualization) */}
          <TripMap
            origin={tripInfo.origin || (tripInfo.latitude ? { latitude: tripInfo.latitude, longitude: tripInfo.longitude, name: tripInfo.destination } : null)}
            stops={[...(tripInfo.stops || []), ...itinerary]}
            destination={tripInfo.endLocation}
            style={styles.mapContainer}
            borderRadius={24}
          />

          {/* Nike-style Boxed Info Card */}
          <View style={styles.boxedInfoCard}>
            <View style={styles.cardHeader}>
              <View>
                <Pressable onPress={() => { setEditTripName(tripInfo.name || ''); setShowNameEditModal(true); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 4 }}>
                  <Text style={[styles.cardTripName, { flex: 1 }]} numberOfLines={2}>
                    {tripInfo.name || tripInfo.destination || 'My Adventure'}
                  </Text>
                  <Icon name="pen" size={20} color={colors.primary} style={{ marginLeft: 12, opacity: 0.8 }} />
                </Pressable>
                <View style={styles.tagRow}>
                  <View style={styles.typeTag}>
                    <Text style={styles.typeTagText}>{(tripInfo.tripType || 'Solo').toUpperCase()}</Text>
                  </View>
                  <View style={[styles.typeTag, { backgroundColor: '#3B82F620' }]}>
                    <Text style={[styles.typeTagText, { color: '#3B82F6' }]}>{tripDays} DAYS</Text>
                  </View>
                </View>
              </View>
              {/* Removed Settings Icon Button */}
            </View>

            <Text style={styles.cardDescription}>
              {tripInfo.aiDescription || `Get ready for an unforgettable journey to ${tripInfo.destination || 'your destination'}. You're all set to explore ${mainLocationsCount} amazing places.`}
            </Text>



            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>LOCATIONS</Text>
                <Text style={styles.gridValue}>{mainLocationsCount}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>BUDGET</Text>
                <Text style={styles.gridValue}>{formatCurrency(budget.total)}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>LAST EXPENSE</Text>
                <Text style={[styles.gridValue, { fontSize: 16 }]}>
                  {lastExpense ? formatCurrency(lastExpense.amount) : '-'}
                </Text>
                {lastExpense && <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{lastExpense.title}</Text>}
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>TRAVELERS</Text>
                <Text style={styles.gridValue}>{travelers.length}</Text>
              </View>
            </View>


            {/* Helper Text - Moved to bottom */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'center' }}>
              <Icon name="info" size={12} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
                Click on the settings icons to edit the trip details.
              </Text>
            </View>

          </View>
        </Animated.View>

        {/* Participants - Keep this section */}
        {/* {travelers.length > 0 && ( */}
        <Animated.View style={[styles.participantsSection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="group" size={24} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Travelers</Text>
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
                onPress={() => {
                  setShowSettingsModal(false);
                  setEditLocations({
                    origin: tripInfo.origin || null,
                    destination: tripInfo.destination || '', // Kept as string for secondary ref if needed
                    stops: tripInfo.stops || [],
                    endLocation: tripInfo.endLocation || null
                  });
                  setShowLocationEditModal(true);
                }}
              >
                <View style={[styles.settingsIconBg, { backgroundColor: '#10B98120' }]}>
                  <Icon name="location" size={20} color="#10B981" />
                </View>
                <View style={styles.settingsInfo}>
                  <Text style={styles.settingsLabel}>Edit Locations</Text>
                  <Text style={styles.settingsDesc}>Origin, Destination & Stops</Text>
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
      {/* Edit Dates Modal -> Now using Calendar */}
      <Calendar
        visible={showDatesModal}
        onClose={() => setShowDatesModal(false)}
        onSelect={handleUpdateDatesV2}
        mode="range"
        initialStartDate={tripInfo.startDate ? new Date(tripInfo.startDate) : new Date()}
        initialEndDate={tripInfo.endDate ? new Date(tripInfo.endDate) : null}
        minDate={new Date()}
      />

      {/* Location Edit Modal */}
      <Modal visible={showLocationEditModal} transparent animationType="slide" onRequestClose={() => setShowLocationEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>� Edit Locations</Text>
              <Pressable onPress={() => setShowLocationEditModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Departure City */}
              <View style={{ marginBottom: 20, zIndex: 4000 }}>
                <Text style={styles.locationLabel}>Departure City</Text>
                <PlacesAutocomplete
                  value={editLocations.origin?.name || editLocations.origin?.fullAddress || ''}
                  onPlaceSelect={(place) => setEditLocations(prev => ({ ...prev, origin: place }))}
                  placeholder="Where are you starting?"
                  showMap={false}
                />
              </View>

              {/* Main Locations to Visit */}
              <View style={{ marginBottom: 20, zIndex: 3000 }}>
                <Text style={styles.locationLabel}>Main Locations to Visit</Text>

                {/* Added Stops List */}
                {editLocations.stops.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    {editLocations.stops.map((stop, index) => {
                      // Extract display name from various possible fields
                      const getStopName = (s) => {
                        if (!s) return `Stop ${index + 1}`;
                        if (typeof s === 'string') return s;
                        if (s.name) return s.name;
                        if (s.formatted_address) return s.formatted_address.split(',')[0]; // First part of address
                        if (s.fullAddress) return s.fullAddress.split(',')[0];
                        if (s.description) return s.description.split(',')[0];
                        return `Stop ${index + 1}`;
                      };
                      const displayName = getStopName(stop);
                      return (
                        <View key={index} style={styles.addedLocationItem}>
                          <View style={styles.locationIconBg}>
                            <Icon name="location" size={16} color={colors.primary} />
                          </View>
                          <Text style={styles.addedLocationText} numberOfLines={1}>
                            {displayName}
                          </Text>
                          <Pressable
                            onPress={() => setEditLocations(prev => ({
                              ...prev,
                              stops: prev.stops.filter((_, i) => i !== index)
                            }))}
                            style={styles.removeLocationBtn}
                          >
                            <Icon name="close" size={12} color={colors.text} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Add New Stop */}
                <PlacesAutocomplete
                  placeholder="Search destination..."
                  onPlaceSelect={(place) => {
                    if (place) {
                      setEditLocations(prev => ({
                        ...prev,
                        stops: [...prev.stops, place]
                      }));
                    }
                  }}
                  showMap={false}
                  clearOnSelect={true}
                />
              </View>

              {/* Trip End Location */}
              <View style={{ marginBottom: 24, zIndex: 2000 }}>
                <Text style={styles.locationLabel}>Trip End Location</Text>
                <PlacesAutocomplete
                  value={editLocations.endLocation?.name || editLocations.endLocation?.fullAddress || ''}
                  onPlaceSelect={(place) => setEditLocations(prev => ({ ...prev, endLocation: place }))}
                  placeholder="Where will you end up?"
                  showMap={false}
                />
              </View>

              <Pressable style={styles.saveButton} onPress={handleSaveLocations}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </Pressable>
            </ScrollView>
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

      {/* Name Edit Modal */}
      <Modal visible={showNameEditModal} transparent animationType="slide" onRequestClose={() => setShowNameEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '40%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Rename Trip</Text>
              <Pressable onPress={() => setShowNameEditModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={styles.locationLabel}>Trip Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.text, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryBorder, outlineStyle: 'none' }]}
                value={editTripName}
                onChangeText={setEditTripName}
                placeholder="Enter trip name..."
                placeholderTextColor={colors.textMuted}
                autoFocus={true}
              />
            </View>

            <Pressable
              style={[styles.saveButton, !editTripName.trim() && { opacity: 0.5 }]}
              onPress={handleUpdateName}
              disabled={!editTripName.trim()}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Banner Ad at bottom of screen if free */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <BannerAd />
      </View>
    </SafeAreaView >
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

  // Location Edit styles
  locationEditSection: { gap: 16, paddingBottom: 20 },
  locationInputGroup: { gap: 8 },
  locationLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginLeft: 4 },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    height: 56
  },
  locationIcon: { marginRight: 12 },
  locationInput: { flex: 1, color: colors.text, fontSize: 16, height: '100%' },

  stopsList: { gap: 10, marginTop: 8 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  stopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  stopNumberText: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
  stopName: { flex: 1, color: colors.text, fontSize: 14 },
  removeStopBtn: {
    padding: 8
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12
  },
  addStopText: { color: colors.primary, marginLeft: 8, fontWeight: '600' },

  // New location edit styles
  addedLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  locationIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  addedLocationText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500'
  },
  removeLocationBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF444420',
    alignItems: 'center',
    justifyContent: 'center'
  },

  joinedStatus: { color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  waitingStatus: { color: '#F59E0B', fontSize: 11, fontWeight: '600', marginTop: 2 },
});
