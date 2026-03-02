import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Animated, TextInput, Modal, ScrollView, Pressable, Alert, Image, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import { useAlert } from '../context/AlertContext';
import { isValidTripCode } from '../utils/tripCodeGenerator';
import Icon from '../components/Icon';
import * as Clipboard from 'expo-clipboard';
import Popover15 from '../components/ui/Popover15';
import Button06 from '../components/ui/Button06';
import PremiumButton from '../components/PremiumButton';
import BannerAd from '../components/BannerAd';


const { width } = Dimensions.get('window');

const TRIP_TYPES = [
  { key: 'solo', label: 'Solo Trip', icon: 'solo', description: 'Just me, exploring the world', color: '#3B82F6' },
  { key: 'friends', label: 'Friends Trip', icon: 'friends', description: 'Adventure with my buddies', color: '#10B981' },
  { key: 'family', label: 'Family Trip', icon: 'family', description: 'Quality time with family', color: '#F59E0B' },
  { key: 'couple', label: 'Couple Trip', icon: 'couple', description: 'Romantic getaway for two', color: '#EC4899' },
  { key: 'business', label: 'Business Trip', icon: 'business', description: 'Work travel with leisure', color: '#8B5CF6' },
];

export default function WelcomeScreen({ onPlanTrip, onJoinTrip, onMyTrip, onProfile, onSetScreen, hasActiveTrip }) {
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const {
    tripInfo,
    getTotalExpenses,
    packingItems,
    expenses,
    currency,
    allTrips = [],
    tripHistory = [],
    saveCurrentTripToList,
    startNewTrip, // Import the new reset function
    switchToTrip,
    checkFeatureAccess,
    isPremium,
  } = useTravelContext();

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinStep, setJoinStep] = useState(1); // 1: Code, 2: Identity selection
  const [foundTrip, setFoundTrip] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [joiningAsNew, setJoiningAsNew] = useState(false);
  const [newTravelerName, setNewTravelerName] = useState('');

  const [showTripTypeModal, setShowTripTypeModal] = useState(false);
  const [tripCode, setTripCode] = useState('');
  const [showAllTrips, setShowAllTrips] = useState(false); // Default to closed as requested
  const [centerIconIndex, setCenterIconIndex] = useState(0);
  const rotationIcons = ['logo', 'compass', 'nature', 'beach', 'packing', 'airplane', 'map'];

  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim1 = useState(new Animated.Value(0.8))[0];
  const scaleAnim2 = useState(new Animated.Value(0.8))[0];
  const scaleAnim3 = useState(new Animated.Value(0.8))[0];
  const floatAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  const styles = useMemo(() => createStyles(colors), [colors]);

  const packedCount = packingItems.filter(i => i.packed).length;
  const totalItems = packingItems.length;
  const totalExpenses = getTotalExpenses();
  const lastExpense = expenses.length > 0 ? expenses[expenses.length - 1] : null;

  // Get trip type info - make it accept a tripType parameter
  const getTripTypeInfo = (tripType) => {
    // Standardize trip keys for icons
    const sanitizedType = tripType === 'profile' ? 'solo' : (tripType === 'group' ? 'friends' : tripType);
    const type = TRIP_TYPES.find(t => t.key === sanitizedType);
    return type || { key: 'solo', label: 'Solo Trip', icon: 'solo', color: '#3B82F6' };
  };

  // Calculate trip days - make it accept trip dates as parameters
  const calculateTripDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    try {
      let start, end;

      if (startDate instanceof Date) start = startDate;
      else {
        const parts1 = startDate.split(' ');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        start = new Date(parseInt(parts1[2]), months.indexOf(parts1[1]), parseInt(parts1[0]));
      }

      if (endDate instanceof Date) end = endDate;
      else {
        const parts2 = endDate.split(' ');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        end = new Date(parseInt(parts2[2]), months.indexOf(parts2[1]), parseInt(parts2[0]));
      }

      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  };

  // Helper function to parse date string to Date object
  const parseDate = (dateString) => {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;

    try {
      // 1. Try "DD MMM YYYY" format (e.g., "24 Dec 2025")
      const parts = dateString.split(' ');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = months.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
        if (monthIndex !== -1) {
          const day = parseInt(parts[0]);
          const year = parseInt(parts[2]);
          const date = new Date(year, monthIndex, day);
          if (!isNaN(date.getTime())) return date;
        }
      }

      // 2. Try standard Date parsing (e.g., ISO or "Dec 24, 2025")
      const stdDate = new Date(dateString);
      if (!isNaN(stdDate.getTime())) return stdDate;

      return null;
    } catch {
      return null;
    }
  };

  // Helper function to get days until trip starts (negative if trip has started/passed)
  const getDaysUntilStart = (startDateString) => {
    const startDate = parseDate(startDateString);
    if (!startDate) return Infinity; // Put trips without dates at the end

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get current total expenses for memoization
  const currentTotalExpenses = getTotalExpenses();

  // 1. Determine the Featured Trip (Dashboard)
  // Priority: 1. Ongoing trip, 2. Nearest upcoming trip, 3. Current context tripInfo
  const featuredTrip = useMemo(() => {
    if (!allTrips || allTrips.length === 0) {
      // No trips at all, fallback to tripInfo if available
      if (tripInfo && tripInfo.destination) {
        return { ...tripInfo, id: tripInfo.id || 'current', totalExpenses: getTotalExpenses() };
      }
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeTrips = allTrips.filter(t => !t.isCompleted);

    // Sort by start date (soonest first)
    const sortedByDate = [...activeTrips].sort((a, b) => {
      const startA = parseDate(a.startDate);
      const startB = parseDate(b.startDate);
      if (startA && startB) return startA - startB;
      if (startA && !startB) return -1; // Trips with dates come first
      if (!startA && startB) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    // A. First priority: Find any ONGOING trip (started and not ended yet)
    const ongoingTrip = sortedByDate.find(t => {
      const start = parseDate(t.startDate);
      const end = parseDate(t.endDate);
      if (!start) return false;
      const startNorm = new Date(start);
      startNorm.setHours(0, 0, 0, 0);
      const endNorm = end ? new Date(end) : null;
      if (endNorm) endNorm.setHours(23, 59, 59, 999);

      return startNorm <= today && (!endNorm || endNorm >= today);
    });

    if (ongoingTrip) {
      // Merge with tripInfo if it's the same trip (for latest edits)
      if (tripInfo && (tripInfo.id === ongoingTrip.id || tripInfo.destination === ongoingTrip.destination)) {
        return { ...ongoingTrip, ...tripInfo, totalExpenses: getTotalExpenses() };
      }
      return ongoingTrip;
    }

    // B. Second priority: Nearest UPCOMING trip (starts in the future)
    const upcomingTrip = sortedByDate.find(t => {
      const start = parseDate(t.startDate);
      if (!start) return false;
      const startNorm = new Date(start);
      startNorm.setHours(0, 0, 0, 0);
      return startNorm >= today;
    });

    if (upcomingTrip) {
      // Merge with tripInfo if it's the same trip
      if (tripInfo && (tripInfo.id === upcomingTrip.id || tripInfo.destination === upcomingTrip.destination)) {
        return { ...upcomingTrip, ...tripInfo, totalExpenses: getTotalExpenses() };
      }
      return upcomingTrip;
    }

    // C. If no ongoing or upcoming, return the first sorted trip (could be past)
    if (sortedByDate.length > 0) {
      const firstTrip = sortedByDate[0];
      if (tripInfo && (tripInfo.id === firstTrip.id || tripInfo.destination === firstTrip.destination)) {
        return { ...firstTrip, ...tripInfo, totalExpenses: getTotalExpenses() };
      }
      return firstTrip;
    }

    // D. Last fallback: tripInfo from context
    if (tripInfo && tripInfo.destination) {
      return { ...tripInfo, id: tripInfo.id || 'current', totalExpenses: getTotalExpenses() };
    }

    return null;
  }, [allTrips, tripInfo, getTotalExpenses]);

  // 2. Upcoming Trips List (Excluding featured)
  const upcomingTrips = useMemo(() => {
    if (!allTrips) return [];

    const list = allTrips
      .filter(t => !t.isCompleted && (!featuredTrip || t.id !== featuredTrip.id))
      .sort((a, b) => {
        const startA = parseDate(a.startDate);
        const startB = parseDate(b.startDate);
        if (startA && startB) return startA - startB;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

    // console.log(`[WelcomeScreen] Total: ${allTrips.length}, Active: ${list.length}`);
    return list;
  }, [allTrips, featuredTrip]);

  const tripTypeInfo = getTripTypeInfo(tripInfo?.tripType || '');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(scaleAnim1, { toValue: 1, tension: 50, friction: 7, delay: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim2, { toValue: 1, tension: 50, friction: 7, delay: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim3, { toValue: 1, tension: 50, friction: 7, delay: 700, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Rotate center icons every 6 seconds
    const interval = setInterval(() => {
      setCenterIconIndex((prev) => (prev + 1) % rotationIcons.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

  // Add missing handleProfilePress function
  const handleProfilePress = () => {
    if (onProfile) {
      onProfile();
    }
  };

  // Add missing handleTripTypeSelect function
  const handleTripTypeSelect = (tripType) => {
    setShowTripTypeModal(false);
    startNewTrip(); // Ensure fresh state even if selected via modal
    onPlanTrip(tripType);
  };

  const { findTripByCode, joinTripByCode, joinAsNewTraveler } = useTravelContext();

  const handleJoinTripNext = async () => {
    if (tripCode.trim()) {
      if (!isValidTripCode(tripCode)) {
        Alert.alert('Invalid Code', 'Please enter a valid 6-digit trip code');
        return;
      }

      const trip = await findTripByCode(tripCode.toUpperCase());
      if (trip) {
        resetJoinModal();
        if (onJoinTrip) {
          onJoinTrip(trip);
        }
      } else {
        Alert.alert('Error', 'Invalid trip code or trip not found');
      }
    }
  };

  const handleConfirmJoin = () => {
    // This is now handled in JoinSelectionScreen
  };

  const resetJoinModal = () => {
    setShowJoinModal(false);
    setJoinStep(1);
    setFoundTrip(null);
    setSelectedParticipantId(null);
    setJoiningAsNew(false);
    setNewTravelerName('');
    setTripCode('');
  };

  const handleJoinTrip = () => {
    handleJoinTripNext();
  };

  // Share trip code function
  const handleShareTripCode = async (code) => {
    try {
      if (!code) return;
      await Clipboard.setStringAsync(code);
      showAlert('Trip code copied to clipboard!', 'success');
    } catch (error) {
      console.error('Error sharing trip code:', error);
      Alert.alert('Trip Code', code);
    }
  };

  // Copy trip code to clipboard
  const handleCopyTripCode = async (code) => {
    handleShareTripCode(code);
  };

  // Handle trip card press - switch to that trip first
  const handleTripPress = async (trip, index) => {
    try {
      // console.log('Trip pressed:', trip.id, trip.destination);

      // Switch to the selected trip's data
      if (switchToTrip) {
        // If we are switching to a different trip, ensure data is loaded
        await switchToTrip(trip);
      }

      // Then navigate to the trip
      if (onMyTrip) {
        onMyTrip(trip, index);
      }
    } catch (error) {
      console.error('Error switching trip:', error);
      Alert.alert('Error', 'Could not open trip. Please try again.');
    }
  };

  // Render Current Trip Card - Updated with trip code
  const renderCurrentTripCard = (trip) => {
    const tripTypeData = getTripTypeInfo(trip.tripType);
    const tripDays = calculateTripDays(trip.startDate, trip.endDate);
    const tripExpenses = trip.totalExpenses || getTotalExpenses();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = parseDate(trip.startDate);
    const end = parseDate(trip.endDate);
    const isOngoing = start && start <= today && (!end || end >= today);
    const isActive = trip.id === (tripInfo.id || 'current');

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim3 }] }}>
        <Pressable
          style={({ pressed }) => [
            styles.currentTripCard,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
          ]}
          onPress={() => handleTripPress(trip, 0)}
        >
          <View style={styles.currentTripGlow} />

          {/* Header Row */}
          <View style={styles.currentTripHeader}>
            <View style={styles.currentTripIconBg}>
              <Icon name="packing" size={28} color="#FFF" />
            </View>
            <View style={styles.currentTripInfo}>
              <View style={[styles.currentTripBadge, !(isActive || isOngoing) && { backgroundColor: '#3B82F630' }]}>
                <Text style={[styles.currentTripBadgeText, !(isActive || isOngoing) && { color: '#3B82F6' }]}>
                  {isActive || isOngoing ? 'CURRENT TRIP' : 'UPCOMING TRIP'}
                </Text>
              </View>
              <Text style={styles.currentTripName}>{trip.name || trip.destination || 'My Trip'}</Text>
            </View>
            <View style={styles.currentTripArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </View>

          {/* Trip Code Section */}
          {trip.tripCode && (
            <Pressable
              style={({ pressed }) => [styles.tripCodeSection, pressed && { opacity: 0.8 }]}
              onPress={() => handleShareTripCode(trip.tripCode, trip.destination)}
            >
              <View style={styles.tripCodeLeft}>
                <Text style={styles.tripCodeLabel}>Trip Code</Text>
                <Text style={styles.tripCodeValue}>{trip.tripCode}</Text>
              </View>
              <View style={styles.tripCodeActions}>
                <Pressable
                  style={styles.shareBtn}
                  onPress={() => handleShareTripCode(trip.tripCode, trip.destination)}
                >
                  <Text style={styles.shareBtnText}>📤 Share</Text>
                </Pressable>
              </View>
            </Pressable>
          )}

          {/* Dates */}
          {trip.startDate && trip.endDate && (
            <View style={styles.currentTripDates}>
              <View style={styles.dateChip}>
                <Icon name="calendar" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.dateChipText}>{typeof trip.startDate === 'string' ? trip.startDate : trip.startDate?.toLocaleDateString()}</Text>
              </View>
              <Text style={styles.dateArrow}>→</Text>
              <View style={styles.dateChip}>
                <Icon name="calendar" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.dateChipText}>{typeof trip.endDate === 'string' ? trip.endDate : trip.endDate?.toLocaleDateString()}</Text>
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={styles.currentTripStats}>
            <View style={styles.tripStatItem}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.tripStatValue}>{Array.isArray(trip.participants) ? trip.participants.length : 1}</Text>
                <Text style={styles.tripStatLabel}>Travellers</Text>
              </View>
            </View>
            <View style={styles.tripStatDivider} />
            <View style={styles.tripStatItem}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.tripStatValue}>{tripDays}</Text>
                <Text style={styles.tripStatLabel}>Days</Text>
              </View>
            </View>
            <View style={styles.tripStatDivider} />
            <View style={styles.tripStatItem}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.tripStatValue}>{currency.symbol}{tripExpenses}</Text>
                <Text style={styles.tripStatLabel}>Total Spent</Text>
              </View>
            </View>
          </View>

          {/* Continue Button */}
          <View style={styles.continueBtn}>
            <Text style={styles.continueBtnText}>Continue Planning</Text>
            <Text style={styles.continueBtnArrow}>→</Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  // Render Upcoming Trip Card - Updated with trip code
  const renderUpcomingTripCard = (trip, index) => {
    const tripTypeData = getTripTypeInfo(trip.tripType);
    const tripDays = calculateTripDays(trip.startDate, trip.endDate);

    return (
      <Pressable
        key={trip.id || index}
        style={({ pressed }) => [
          styles.upcomingTripCard,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
        ]}
        onPress={() => handleTripPress(trip, index + 1)}
      >
        <View style={styles.upcomingTripLeft}>
          <View style={[styles.upcomingTripIconBg, { backgroundColor: tripTypeData.color + '20' }]}>
            <Icon name={tripTypeData.icon} size={24} color={tripTypeData.color} />
          </View>
          <View style={styles.upcomingTripInfo}>
            <Text style={styles.upcomingTripName}>{trip.name || trip.destination || 'My Trip'}</Text>
            <Text style={styles.upcomingTripDates}>
              {typeof trip.startDate === 'string' ? trip.startDate : trip.startDate?.toLocaleDateString()} • {tripDays} days
            </Text>
            {trip.tripCode && (
              <Text style={styles.upcomingTripCode}>
                <Text style={{ fontWeight: 'bold', color: isDark ? '#FFF' : '#000', opacity: 0.6 }}>Code:</Text> {trip.tripCode}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.upcomingTripRight}>
          {trip.tripCode && (
            <Pressable
              style={styles.miniShareBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleShareTripCode(trip.tripCode, trip.destination);
              }}
            >
              <Icon name="message" size={14} color={colors.primary} />
            </Pressable>
          )}
          <Text style={styles.upcomingTripArrow}>→</Text>
        </View>
      </Pressable>
    );
  };

  // DEBUG: Log what data we have
  useEffect(() => {
    // console.log('=== WelcomeScreen Debug ===');
    // console.log('hasActiveTrip:', hasActiveTrip);
    // console.log('tripInfo:', JSON.stringify(tripInfo, null, 2));
    // console.log('allTrips:', JSON.stringify(allTrips, null, 2));
    // console.log('allTrips length:', allTrips?.length || 0);
  }, [hasActiveTrip, tripInfo, allTrips]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Profile */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Icon name="logo" size={28} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.logoText}>PlanWitch</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.profileButton, pressed && { opacity: 0.7 }]} onPress={handleProfilePress}>
          <View style={styles.profileAvatar}>
            <Icon name="profile" size={24} color={colors.primary} />
          </View>
        </Pressable>
      </View>

      {/* Background Elements */}
      <View style={styles.bgElements} pointerEvents="none">
        <View style={[styles.bgCircle, styles.bgCircle1]} />
        <View style={[styles.bgCircle, styles.bgCircle2]} />
        <View style={[styles.bgCircle, styles.bgCircle3]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        alwaysBounceVertical={false}
        scrollEventThrottle={16}
      >
        {/* Illustration */}
        <Animated.View style={[styles.illustrationSection, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.illustrationContainer, { transform: [{ translateY: floatTranslate }] }]}>
            <Animated.View style={[styles.outerRing, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.middleRing} />
            <View style={styles.travelerCircle}>
              <Icon name={rotationIcons[centerIconIndex]} size={60} color={colors.primary} />
            </View>
            <View style={[styles.floatingElement, styles.floatingElement1]}><Icon name="nature" size={24} color="#10B981" /></View>
            <View style={[styles.floatingElement, styles.floatingElement2]}><Icon name="route" size={24} color="#3B82F6" /></View>
            <View style={[styles.floatingElement, styles.floatingElement3]}><Icon name="beach" size={24} color="#F59E0B" /></View>
            <View style={[styles.floatingElement, styles.floatingElement4]}><Icon name="packing" size={24} color="#EC4899" /></View>
          </Animated.View>
        </Animated.View>

        <BannerAd onPress={() => onSetScreen('Subscription')} />

        {/* Action Cards */}
        <View style={styles.actionsContainer}>
          {/* Plan a Trip and Join a Trip - Side by Side */}
          <View style={styles.optionCardsRow}>
            <Animated.View style={[styles.optionCardHalf, { transform: [{ scale: scaleAnim1 }] }]}>
              <Pressable
                style={({ pressed }) => [styles.optionCardSmall, pressed && styles.cardPressed]}
                onPress={() => {
                  const access = checkFeatureAccess('new_trip');
                  if (!access.allowed) {
                    Alert.alert(
                      'Free Limit Reached',
                      access.reason,
                      [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Go Pro', onPress: () => onSetScreen('Subscription') }
                      ]
                    );
                    return;
                  }

                  if (!hasActiveTrip) {
                    // If no active trip, we are definitely starting fresh
                    startNewTrip();
                  } else {
                    // Check if we should prompt? For now, we assume "Plan New Trip" means FRESH.
                    // If the user wants to EDIT the current trip, they would tap the "Continue" card.
                    // So, "Plan New Trip" button should ALWAYS reset.
                    startNewTrip();
                  }
                  onPlanTrip();
                }}
              >
                <View style={styles.optionGlowSmall} />
                <View style={styles.optionIconBgSmall}><Icon name="add" size={24} color="#FFF" /></View>
                <Text style={styles.optionTitleSmall}>{hasActiveTrip ? 'Plan New Trip' : 'Plan a Trip'}</Text>
                <Text style={styles.optionDescriptionSmall}>Create your journey</Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.optionCardHalf, { transform: [{ scale: scaleAnim2 }] }]}>
              <Pressable
                style={({ pressed }) => [styles.optionCardSmall, pressed && styles.cardPressed]}
                onPress={() => setShowJoinModal(true)}
              >
                <View style={styles.optionIconBgSmall}><Icon name="helping_hand" size={24} color="#FFF" /></View>
                <Text style={styles.optionTitleSmall}>Join a Trip</Text>
                <Text style={styles.optionDescriptionSmall}>Enter code to join</Text>
              </Pressable>
            </Animated.View>
          </View>

          {/* CURRENT TRIP DASHBOARD - Only show if exists */}
          {featuredTrip && renderCurrentTripCard(featuredTrip)}

          {/* UPCOMING TRIPS SECTION - Always show header, but list is empty until user adds trips */}
          <View style={styles.upcomingTripsSection}>
            {/* Section Header - Always visible */}
            <Pressable
              style={({ pressed }) => [styles.upcomingTripsHeader, pressed && { opacity: 0.8 }]}
              onPress={() => setShowAllTrips(!showAllTrips)}
            >
              <View style={styles.upcomingTripsLeft}>
                <View style={styles.upcomingTripsIconBg}>
                  <Icon name="task" size={24} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.upcomingTripsTitle}>Upcoming Trips</Text>
                  <Text style={styles.upcomingTripsSubtitle}>
                    {/* Logic: Show total active trips count from allTrips to avoid confusion if only one trip exists (and is featured) */}
                    {allTrips && allTrips.length > 0
                      ? `${allTrips.length} trip${allTrips.length > 1 ? 's' : ''} in your journey`
                      : 'No upcoming trips yet'
                    }
                  </Text>
                </View>
              </View>
              <View style={styles.upcomingTripsRight}>
                <View style={styles.upcomingTripsBadge}>
                  <Text style={styles.upcomingTripsBadgeText}>{upcomingTrips.length}</Text>
                </View>
                {upcomingTrips.length > 0 && (
                  <View style={[styles.expandIconBg, showAllTrips && styles.expandIconBgActive]}>
                    <Text style={[styles.expandIcon, showAllTrips && styles.expandIconActive]}>
                      {showAllTrips ? '▲' : '▼'}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>

            {/* Upcoming Trip Cards List - Only show if there are trips */}
            {showAllTrips && upcomingTrips.length > 0 && (
              <View style={styles.upcomingTripsList}>
                {upcomingTrips.map((trip, index) => renderUpcomingTripCard(trip, index))}
              </View>
            )}

            {/* Empty state message when expanded but no trips */}
            {showAllTrips && upcomingTrips.length === 0 && (
              <View style={styles.emptyUpcomingContainer}>
                <Icon name="route" size={40} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyUpcomingText}>No upcoming trips</Text>
                <Text style={styles.emptyUpcomingHint}>Plan a new trip to see it here</Text>
              </View>
            )}
          </View>

          {/* No Trips Message - Only show when no featured trip at all */}
          {!featuredTrip && (
            <View style={styles.noTripsContainer}>
              <View style={styles.noTripsIconBg}>
                <Icon name="search" size={40} color={colors.textMuted} />
              </View>
              <Text style={styles.noTripsTitle}>No trips yet</Text>
              <Text style={styles.noTripsSubtitle}>Start planning your next adventure!</Text>
            </View>
          )}
        </View>

        {/* Features */}
        <Animated.View style={[styles.featuresSection, { opacity: fadeAnim }]}>
          <Text style={styles.featuresTitle}>Everything you need</Text>
          <Text style={styles.featuresSubtitle}>All-in-one travel companion</Text>
          <View style={styles.featuresGrid}>
            {[
              { key: 'budget', label: 'Budget', desc: 'Track spending' },
              { key: 'expenses', label: 'Expenses', desc: 'Log costs' },
              { key: 'packing', label: 'Packing', desc: 'Checklist' },
              { key: 'itinerary', label: 'Itinerary', desc: 'Plan days' },
            ].map((f, i) => (
              <View key={i} style={styles.featureCard}>
                <View style={styles.featureIconBg}><Icon name={f.key} size={24} color={colors.primary} /></View>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Why Section */}
        <Animated.View style={[styles.whySection, { opacity: fadeAnim }]}>
          <Text style={styles.whyTitle}>Why PlanWitch?</Text>
          <View style={styles.whyList}>
            {[
              { icon: 'like', text: 'Easy trip planning', color: '#EF4444' },
              { icon: 'clock', text: 'Real-time sync with friends', color: '#3B82F6' },
              { icon: 'chart', text: 'Smart budget tracking', color: '#10B981' },
              { icon: 'airplane', text: 'Works offline too', color: '#F59E0B' },
            ].map((item, index) => (
              <View key={index} style={[styles.whyItem, index === 3 && { borderBottomWidth: 0 }]}>
                <Icon name={item.icon} size={20} color={item.color} style={{ marginRight: 12 }} />
                <Text style={styles.whyItemText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>


        {/* Footer */}
        <View style={styles.footer}>
          <Icon name="logo" size={20} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.footerText}>PlanWitch</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Trip Type Selection Modal */}
      <Modal animationType="slide" transparent visible={showTripTypeModal} onRequestClose={() => setShowTripTypeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.tripTypeModalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.tripTypeHeader}>
              <View>
                <Text style={styles.tripTypeTitle}>Choose Trip Type</Text>
                <Text style={styles.tripTypeSubtitle}>Select who's traveling with you</Text>
              </View>
              <Pressable onPress={() => setShowTripTypeModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.tripTypeList}>
                {TRIP_TYPES.map((type, index) => (
                  <Pressable
                    key={type.key}
                    style={({ pressed }) => [
                      styles.tripTypeCard,
                      { borderLeftColor: type.color },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={() => handleTripTypeSelect(type.key)}
                  >
                    <View style={[styles.tripTypeIconBg, { backgroundColor: type.color + '20' }]}>
                      <Icon name={type.icon} size={28} color={type.color} />
                    </View>
                    <View style={styles.tripTypeInfo}>
                      <Text style={styles.tripTypeLabel}>{type.label}</Text>
                      <Text style={styles.tripTypeDesc}>{type.description}</Text>
                    </View>
                    <View style={[styles.tripTypeArrow, { backgroundColor: type.color + '20' }]}>
                      <Text style={[styles.tripTypeArrowText, { color: type.color }]}>→</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Join Modal - Replaced with Popover15 */}
      <Popover15
        visible={showJoinModal}
        onClose={resetJoinModal}
        title="Join a Trip"
        description="Enter the trip code shared by your travel buddy"
      >
        <TextInput
          style={[styles.codeInput, { outlineStyle: 'none' }]}
          placeholder="Enter trip code"
          placeholderTextColor={colors.textMuted}
          value={tripCode}
          onChangeText={setTripCode}
          autoCapitalize="characters"
          maxLength={6}
        />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <Button06
            title="Cancel"
            variant="secondary"
            onPress={resetJoinModal}
            style={{ flex: 1 }}
          />
          <PremiumButton
            title="Find Trip"
            variant="white"
            onPress={handleJoinTripNext}
            disabled={!tripCode.trim()}
            style={{ flex: 1 }}
          />
        </View>
      </Popover15>
    </SafeAreaView >
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.bg,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoEmoji: { fontSize: 28, marginRight: 8 },
  logoText: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  profileButton: { padding: 4 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  profileEmoji: { fontSize: 22 },

  // ScrollView
  scrollView: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'web' ? 20 : 60, // Reduced on web to avoid black bar
    backgroundColor: colors.bg,
  },

  bgElements: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, overflow: 'hidden' },
  bgCircle: { position: 'absolute', borderRadius: 999, backgroundColor: colors.primary, opacity: 0.04 },
  bgCircle1: { width: 400, height: 400, top: -100, right: -150 },
  bgCircle2: { width: 300, height: 300, top: 400, left: -150 },
  bgCircle3: { width: 200, height: 200, top: 700, right: -50 },

  // Illustration Section
  illustrationSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: colors.bg,
  },
  illustrationContainer: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  outerRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: colors.primary, opacity: 0.3, borderStyle: 'dashed' },
  middleRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: colors.primaryBorder, opacity: 0.5 },
  travelerCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primaryBorder },
  travelerEmoji: { fontSize: 60 },
  floatingElement: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primaryBorder },
  floatingElement1: { top: 0, left: 20 },
  floatingElement2: { top: 30, right: 10 },
  floatingElement3: { bottom: 20, left: 10 },
  floatingElement4: { bottom: 0, right: 30 },
  floatingEmoji: { fontSize: 22 },

  // Actions Container
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: colors.bg,
  },

  // Card Press State
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonPressed: { opacity: 0.8 },

  // Current Trip Card - SOFTER COLORS
  currentTripCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primaryBorder,
  },
  currentTripGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    backgroundColor: colors.primary,
    opacity: 0.06,
    borderRadius: 90,
  },
  currentTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTripIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  currentTripIcon: { fontSize: 26 },
  currentTripInfo: { flex: 1, marginLeft: 14 },
  currentTripBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  currentTripBadgeText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  currentTripName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  currentTripArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  arrowText: { fontSize: 18, color: colors.primary, fontWeight: 'bold' },

  // Dates
  currentTripDates: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.primaryBorder,
    gap: 10,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  dateChipEmoji: { fontSize: 14, marginRight: 6 },
  dateChipText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  dateArrow: { color: colors.textMuted, fontSize: 14 },

  // Stats
  currentTripStats: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: colors.cardLight,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tripStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 8,
  },
  tripStatIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripStatEmoji: { fontSize: 16 },
  tripStatValue: { fontSize: 17, fontWeight: 'bold', color: colors.text },
  tripStatLabel: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  tripStatDivider: { width: 1, height: 36, backgroundColor: colors.primaryBorder },

  // Continue Button
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  continueBtnText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: 'bold',
  },
  continueBtnArrow: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Option Cards
  optionCard: { backgroundColor: colors.card, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primaryBorder, overflow: 'hidden' },
  optionGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, backgroundColor: colors.primary, opacity: 0.08, borderRadius: 75 },
  optionIconBg: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primaryBorder },
  optionIcon: { fontSize: 24 },
  optionContent: { flex: 1, marginLeft: 14 },
  optionTitle: { fontSize: 17, fontWeight: 'bold', color: colors.text },
  optionDescription: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  optionArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  arrowTextSecondary: { fontSize: 18, color: colors.primary, fontWeight: 'bold' },

  // Option Cards Row (Side by Side)
  optionCardsRow: { flexDirection: 'row', gap: 12 },
  optionCardHalf: { flex: 1 },
  optionCardSmall: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    overflow: 'hidden',
    minHeight: 140,
  },
  optionGlowSmall: { position: 'absolute', top: -30, right: -30, width: 80, height: 80, backgroundColor: colors.primary, opacity: 0.08, borderRadius: 40 },
  optionIconBgSmall: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primaryBorder, marginBottom: 12 },
  optionIconSmall: { fontSize: 24 },
  optionTitleSmall: { fontSize: 15, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
  optionDescriptionSmall: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' },

  // Features Section
  featuresSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.bg,
  },
  featuresTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
  featuresSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  featureCard: { width: '48%', backgroundColor: colors.card, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: colors.primaryBorder },
  featureIconBg: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featureIcon: { fontSize: 28 },
  featureLabel: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  featureDesc: { fontSize: 12, color: colors.textMuted, marginTop: 4 },

  // Why Section
  whySection: {
    marginTop: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.bg,
  },
  whyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  whyList: { backgroundColor: colors.card, borderRadius: 20, padding: 6, borderWidth: 1, borderColor: colors.primaryBorder },
  whyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.primaryBorder },
  whyItemIcon: { fontSize: 22, marginRight: 14 },
  whyItemText: { fontSize: 15, color: colors.text, flex: 1 },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 20,
    paddingBottom: 20,
    backgroundColor: colors.bg,
  },
  footerLogo: { fontSize: 32 },
  footerText: { fontSize: 16, fontWeight: 'bold', color: colors.textMuted, marginTop: 8 },
  footerVersion: { fontSize: 12, color: colors.textLight, marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, alignItems: 'center', width: '100%' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.textMuted, borderRadius: 2, marginBottom: 24 },
  modalIconContainer: { marginBottom: 20 },
  modalIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primaryBorder },
  modalIcon: { fontSize: 40 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
  modalDescription: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 24 },
  codeInput: {
    width: '100%',
    backgroundColor: colors.cardLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
    marginBottom: 20
  },

  participantsList: { width: '100%', maxHeight: 300, marginBottom: 20 },
  participantItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: colors.cardLight, marginBottom: 10, borderWidth: 1, borderColor: colors.primaryBorder },
  participantItemSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  participantItemDisabled: { opacity: 0.5, backgroundColor: colors.bg },
  participantEmoji: { fontSize: 20, marginRight: 12 },
  participantName: { fontSize: 16, fontWeight: 'bold', color: colors.text, flex: 1 },
  participantStatus: { fontSize: 12, color: colors.textMuted },

  newTravelerInput: { width: '100%', backgroundColor: colors.cardLight, borderRadius: 16, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.primaryBorder, marginBottom: 20 },

  joinButton: { width: '100%', backgroundColor: colors.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12 },
  joinButtonDisabled: { backgroundColor: colors.textLight, opacity: 0.6 },
  joinButtonText: { fontSize: 18, fontWeight: 'bold', color: colors.bg },
  cancelButton: { padding: 12 },
  cancelButtonText: { fontSize: 16, color: colors.textMuted },

  // Trip Type Modal
  tripTypeModalContent: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
  tripTypeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  tripTypeTitle: { fontSize: 26, fontWeight: 'bold', color: colors.text },
  tripTypeSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.cardLight, alignItems: 'center', justifyContent: 'center' },
  modalCloseBtnText: { color: colors.textMuted, fontSize: 22 },
  tripTypeList: { gap: 12 },
  tripTypeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, borderRadius: 16, padding: 16, borderLeftWidth: 4 },
  tripTypeIconBg: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tripTypeEmoji: { fontSize: 28 },
  tripTypeInfo: { flex: 1, marginLeft: 14 },
  tripTypeLabel: { fontSize: 17, fontWeight: 'bold', color: colors.text },
  tripTypeDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  tripTypeArrow: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tripTypeArrowText: { fontSize: 18, fontWeight: 'bold' },

  // Trips List Container
  tripsListContainer: {
    gap: 14,
  },
  tripsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  tripsListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  tripsListCount: {
    fontSize: 14,
    color: colors.textMuted,
    backgroundColor: colors.cardLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  // Secondary Trip Card Styles
  secondaryTripCard: {
    borderColor: colors.border || colors.primaryBorder,
    opacity: 0.95,
  },
  secondaryTripIconBg: {
    backgroundColor: colors.cardLight,
  },
  secondaryTripBadge: {
    backgroundColor: colors.textMuted + '20',
  },
  secondaryTripBadgeText: {
    color: colors.textMuted,
  },
  secondaryContinueBtn: {
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  secondaryContinueBtnText: {
    color: colors.text,
  },

  // Upcoming Trips Section
  upcomingTripsSection: {
    marginTop: 8,
  },
  upcomingTripsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  upcomingTripsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upcomingTripsIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingTripsIcon: {
    fontSize: 20,
  },
  upcomingTripsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  upcomingTripsSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  upcomingTripsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upcomingTripsBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  upcomingTripsBadgeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  expandIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIconBgActive: {
    backgroundColor: colors.primary + '20',
  },
  expandIcon: {
    fontSize: 10,
    color: colors.textMuted,
  },
  expandIconActive: {
    color: colors.primary,
  },

  // Upcoming Trips List
  upcomingTripsList: {
    marginTop: 12,
    gap: 10,
  },
  upcomingTripCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  upcomingTripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  upcomingTripIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingTripEmoji: {
    fontSize: 22,
  },
  upcomingTripInfo: {
    flex: 1,
  },
  upcomingTripName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  upcomingTripDates: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  upcomingTripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upcomingTripExpense: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  upcomingTripArrow: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },

  // Trips Section Styles - NEW
  tripsSection: {
    marginTop: 6,
  },
  tripsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  tripsSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripsSectionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripsSectionIcon: {
    fontSize: 22,
  },
  tripsSectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
  },
  tripsSectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  tripsSectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tripCountBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tripCountText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: 'bold',
  },
  expandIcon: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // No Trips State
  noTripsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
  },
  noTripsIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noTripsIcon: {
    fontSize: 40,
  },
  noTripsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  noTripsSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // Trip Code Section Styles - NEW
  tripCodeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.primaryBorder,
    backgroundColor: colors.primary + '08',
    marginHorizontal: -20,
    marginBottom: -4,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tripCodeLeft: {
    flex: 1,
  },
  tripCodeLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tripCodeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 3,
  },
  tripCodeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareBtnText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '600',
  },

  // Upcoming trip code style
  upcomingTripCode: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
  },

  // Mini share button for upcoming trips
  miniShareBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  miniShareBtnText: {
    fontSize: 14,
  },

  // Add empty upcoming trips state styles
  emptyUpcomingContainer: {
    alignItems: 'center',
    padding: 24,
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
  },
  emptyUpcomingEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyUpcomingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptyUpcomingHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
