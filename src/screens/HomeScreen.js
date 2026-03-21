import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Animated, Pressable, Modal, Alert, ActivityIndicator, Image, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTravelContext } from '../context/TravelContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import DatePickerModal from '../components/DatePickerModal';
import { auth } from '../config/firebase';
import Icon from '../components/Icon';
import Calendar from '../components/Calendar';
import TripMap from '../components/TripMap';
import PremiumBackButton from '../components/PremiumBackButton';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import { generateDestinationInfo, generateTripItinerary, generateFoodRecommendations, generatePackingList, generateBudgetPlan } from '../services/aiService';
import { CalendarService } from '../services/calendarService';
import BannerAd from '../components/BannerAd';
import { CustomAlert } from '../components/CustomAlert';
import DatePicker12 from '../components/ui/DatePicker12';
import PremiumButton from '../components/PremiumButton';

const INTEREST_TAGS = ['Nature', 'History', 'Food', 'Adventure', 'Shopping', 'Culture', 'Relaxation', 'Nightlife'];
const PACE_OPTIONS = ['Relaxed', 'Moderate', 'Packed'];
const BUDGET_PREFERENCES = ['Low', 'Mid', 'Luxury', 'Mixed'];
const BUDGET_PRIORITIES = ['Stay', 'Food', 'Experiences', 'Shopping'];
const ACCOMMODATION_TYPES = ['Hotel', 'Hostel', 'Homestay', 'Airbnb'];
const HOTEL_PRICE_RANGES = ['< 2000', '2000 - 5000', '5000 - 10000', '10000+'];
const TRANSPORT_MODES = ['Flight', 'Train', 'Bus', 'Car', 'Bike'];
const LOCAL_TRANSPORT_OPTIONS = ['Public transport', 'Cab', 'Rental bike'];

const STOP_TYPES = [
  { key: 'flight', label: 'Flight', icon: 'flight', color: '#87CEEB', category: 'transport' },
  { key: 'train', label: 'Train', icon: 'train', color: '#4682B4', category: 'transport' },
  { key: 'bus', label: 'Bus', icon: 'bus', color: '#32CD32', category: 'transport' },
  { key: 'car', label: 'Car/Taxi', icon: 'car', color: '#FFA500', category: 'transport' },
  { key: 'hotel', label: 'Hotel', icon: 'hotel', color: '#DDA0DD', category: 'accommodation' },
  { key: 'checkin', label: 'Check-in', icon: 'checkin', color: '#9370DB', category: 'accommodation' },
  { key: 'checkout', label: 'Check-out', icon: 'checkout', color: '#8A2BE2', category: 'accommodation' },
  { key: 'breakfast', label: 'Breakfast', icon: 'breakfast', color: '#FFA07A', category: 'meal' },
  { key: 'lunch', label: 'Lunch', icon: 'lunch', color: '#98FB98', category: 'meal' },
  { key: 'dinner', label: 'Dinner', icon: 'dinner', color: '#FF6347', category: 'meal' },
  { key: 'cafe', label: 'Cafe/Snack', icon: 'cafe', color: '#D2691E', category: 'meal' },
  { key: 'attraction', label: 'Attraction', icon: 'attraction', color: '#00FF7F', category: 'activity' },
  { key: 'tour', label: 'Tour', icon: 'tour', color: '#FF6B6B', category: 'activity' },
  { key: 'shopping', label: 'Shopping', icon: 'shopping', color: '#FF69B4', category: 'activity' },
  { key: 'nature', label: 'Nature', icon: 'nature', color: '#228B22', category: 'activity' },
  { key: 'beach', label: 'Beach', icon: 'beach', color: '#00CED1', category: 'activity' },
  { key: 'museum', label: 'Museum', icon: 'museum', color: '#8B4513', category: 'activity' },
  { key: 'nightlife', label: 'Nightlife', icon: 'nightlife', color: '#9932CC', category: 'activity' },
];

// Helper to convert time to 24hr format for sorting
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 9999;
  const match = timeStr.toString().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 9999;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

export default function HomeScreen({ onBackToHome, onSetScreen }) {
  const {
    tripInfo, setTripInfo, budget, setBudget, getTotalExpenses, getRemainingBudget,
    packingItems, itinerary, foodItems, expenses, clearTrip, endTrip, formatCurrency, currency, isLoading, deleteTrip,
    getAllTravelers, localParticipantId, tripPreferences, checkFeatureAccess,
    setFoodItems, addFoodItem, addPackingItem, addItineraryItem, setPackingItems, setItinerary
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

  // AI State
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false); // AI Flow State
  const [aiPreferences, setAiPreferences] = useState({
    interests: [],
    pace: null,
    transport_modes: [],
    budget_preference: null,
    routeOptimization: 'optimize',
    startLocation: '',
    placesEnabled: true,
    startTime: '09:00 AM',
    endTime: '09:00 PM',
    locationDurations: {},
    budget_min: '',
    budget_max: '',
    budget_priority: ['Experiences'],
    accommodation_type: 'Hotel',
    hotel_price: '2000 - 5000',
    local_transport: ['Cab']
  });
  const [regenOptions, setRegenOptions] = useState({
    itinerary: true,
    packing: true,
    food: true,
    budget: true
  });
  const [useTimings, setUseTimings] = useState(false); // New state for optional timings
  const [hasExistingContent, setHasExistingContent] = useState(false);
  const [showAllTimelineDays, setShowAllTimelineDays] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: '', message: '', type: 'info',
    onConfirm: () => { }, onCancel: null, onNeutral: null,
    confirmText: 'OK', cancelText: 'Cancel', neutralText: ''
  });

  const showAlert = (title, message, type = 'info', onConfirm = () => hideAlert(), onCancel = null, onNeutral = null, confirmText = 'OK', cancelText = 'Cancel', neutralText = '') => {
    setAlertConfig({ visible: true, title, message, type, onConfirm, onCancel, onNeutral, confirmText, cancelText, neutralText });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const handleTogglePriority = (priority) => {
    setAiPreferences(prev => ({
      ...prev,
      budget_priority: prev.budget_priority.includes(priority)
        ? prev.budget_priority.filter(p => p !== priority)
        : [...prev.budget_priority, priority]
    }));
  };

  const handleCalendarSync = async () => {
    const access = checkFeatureAccess('calendar_sync');
    if (!access.allowed) {
      showAlert(
        'Premium Feature',
        access.reason,
        'premium',
        () => navigation.navigate('Subscription'),
        () => hideAlert(),
        null,
        'Go Pro',
        'Later'
      );
      return;
    }

    try {
      setIsSyncing(true);
      await CalendarService.syncTripToCalendar(tripInfo, itinerary);
      showAlert('Sync Complete', 'Your trip and itinerary have been synced to your calendar! 📅', 'info');
    } catch (error) {
      showAlert('Sync Failed', error.message || 'Make sure you have granted calendar permissions.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleInterest = (interest) => {
    setAiPreferences(prev => {
      const exists = prev.interests.includes(interest);
      if (exists) return { ...prev, interests: prev.interests.filter(i => i !== interest) };
      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  useEffect(() => {
    setHasExistingContent(itinerary.length > 0 || foodItems.length > 0 || packingItems.length > 0);
  }, [itinerary, foodItems, packingItems]);

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
          const parts = tripInfo.endDate.trim().split(/\s+/);
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = months.findIndex(m => m.toLowerCase().startsWith(parts[1].toLowerCase()));
          const endDate = new Date(parseInt(parts[2]), monthIndex, parseInt(parts[0]));
          endDate.setHours(23, 59, 59, 999);

          if (today > endDate) {
            // Trip has ended, add to history
            await handleAutoEndTrip();
          }
        } catch (e) {
          // console.log('Error checking trip end date:', e);
        }
      }
    };

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
    { id: 'end_trip', label: 'End Trip', icon: 'finish', page: 'EndTrip' },
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

  const totalTripDaysCount = getTripDays();
  const daysUntil = getDaysUntilTrip();

  const getTimelineData = () => {
    if (!itinerary || itinerary.length === 0) return [];
    const days = totalTripDaysCount;
    if (days <= 0) return [];

    const timeline = [];
    for (let i = 1; i <= days; i++) {
      const dayStops = itinerary.filter(s => s.dayNumber === i)
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

      let highlight = "Daily Exploration";
      if (dayStops.length > 0) {
        if (i === 1) {
          const firstArrive = dayStops.find(s => ['flight', 'train', 'bus', 'car'].includes(s.type));
          highlight = firstArrive ? `Arrival & ${dayStops[0].name}` : `Exploring ${dayStops[0].name}`;
        } else if (i === days) {
          highlight = `Departure & ${dayStops[dayStops.length - 1].name}`;
        } else {
          const attractions = dayStops.filter(s => ['attraction', 'tour', 'nature', 'beach', 'museum'].includes(s.type));
          if (attractions.length > 0) {
            highlight = attractions.slice(0, 2).map(a => a.name).join(' & ');
          } else {
            highlight = dayStops[0].name;
          }
        }
      }

      timeline.push({
        day: i,
        title: `Day ${i}`,
        highlight: highlight
      });
    }
    return timeline;
  };

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

  // Clean route points for map visualization
  const mapData = useMemo(() => {
    const sorted = itinerary && itinerary.length > 0 
      ? [...itinerary].sort((a, b) => {
          if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
          return timeToMinutes(a.time) - timeToMinutes(b.time);
        })
      : [];
    
    const start = tripInfo.origin || (sorted.length > 0 ? sorted[0] : null);
    const end = tripInfo.endLocation || (sorted.length > 1 ? sorted[sorted.length - 1] : null);
    const visit = tripInfo.latitude ? { 
      latitude: tripInfo.latitude, 
      longitude: tripInfo.longitude, 
      name: tripInfo.destination 
    } : null;

    return { start, visit, end, stops: tripInfo.stops || [] };
  }, [tripInfo, itinerary]);

  // Main locations count for display
  const mainLocationsCount = useMemo(() => {
    if (!tripInfo.stops || !Array.isArray(tripInfo.stops)) return 1;
    const uniqueStops = new Set();
    tripInfo.stops.forEach(s => {
      if (s.name) uniqueStops.add(s.name.trim());
    });
    return Math.max(1, uniqueStops.size);
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


  const generateDaysForAi = (startDate, endDate) => {
    const days = [];
    if (!startDate || !endDate) {
      for (let i = 1; i <= 5; i++) days.push({ dayNumber: i, dateString: `Day ${i}`, date: null });
      return days;
    }
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date();
      if (dateStr instanceof Date) return dateStr;
      try {
        const parts = dateStr.split(' ');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return new Date(parseInt(parts[2]), months.indexOf(parts[1]), parseInt(parts[0]));
      } catch (e) {
        return new Date(dateStr);
      }
    };
    try {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      let currentDate = new Date(start);
      let dayNumber = 1;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      while (currentDate <= end) {
        days.push({
          dayNumber, dateString: `${currentDate.getDate()} ${months[currentDate.getMonth()]}`,
          dayName: dayNames[currentDate.getDay()], shortDay: dayNames[currentDate.getDay()].slice(0, 3),
          date: new Date(currentDate), fullDate: `${currentDate.getDate()} ${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`,
        });
        currentDate.setDate(currentDate.getDate() + 1);
        dayNumber++;
      }
    } catch (e) {
      for (let i = 1; i <= 5; i++) days.push({ dayNumber: i, dateString: `Day ${i}`, date: null });
    }
    return days;
  };

  const finalizeAiGeneration = async (itineraryCount, foodCount, isReplace) => {
    try {
      let packingAddedCount = 0;
      if (regenOptions.packing) {
        const daysArray = generateDaysForAi(tripInfo.startDate, tripInfo.endDate);
        const duration = daysArray.length || 3;
        const res = await generatePackingList(
          tripInfo.destination || 'Selected Destination',
          tripInfo.startDate || 'Upcoming Trip',
          duration,
          tripInfo.tripType || 'solo'
        );

        if (res.success && res.recommendations) {
          const newPackingItems = [];
          const addedPackingSignatures = new Set();

          for (const categoryData of res.recommendations) {
            const lowerCat = (categoryData.category || 'Other').toLowerCase();
            let normalizedCategory = 'other';
            if (lowerCat.includes('essential')) normalizedCategory = 'essentials';
            else if (lowerCat.includes('cloth')) normalizedCategory = 'clothing';
            else if (lowerCat.includes('toilet')) normalizedCategory = 'toiletries';
            else if (lowerCat.includes('elect')) normalizedCategory = 'electronics';
            else if (lowerCat.includes('document')) normalizedCategory = 'documents';
            else if (lowerCat.includes('health')) normalizedCategory = 'health';
            else if (lowerCat.includes('accessor')) normalizedCategory = 'accessories';

            for (const itemData of (categoryData.items || [])) {
              // Handle both legacy string items and new structured objects
              const itemName = typeof itemData === 'object' ? itemData.name : itemData;
              const itemQty = typeof itemData === 'object' ? (itemData.qty || 1) : 1;
              const itemLuggage = typeof itemData === 'object' ? (itemData.luggage || 'checked') : 'checked';
              const itemNotes = typeof itemData === 'object' ? (itemData.notes || 'AI Suggested') : 'AI Suggested';

              if (!itemName) continue;

              const cleanName = itemName.trim().toLowerCase();
              const exists = !isReplace && packingItems.some(existing => existing.name.toLowerCase() === cleanName);
              if (!exists && !addedPackingSignatures.has(cleanName)) {
                addedPackingSignatures.add(cleanName);
                newPackingItems.push({
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  name: itemName.trim(),
                  category: normalizedCategory,
                  packed: false,
                  quantity: itemQty,
                  luggageType: itemLuggage,
                  notes: itemNotes
                });
                packingAddedCount++;
              }
            }
          }

          if (newPackingItems.length > 0) {
            if (isReplace) {
              await setPackingItems(newPackingItems);
            } else {
              await setPackingItems(prev => [...prev, ...newPackingItems]);
            }
          }
        }
      }

      // Budget
      if (regenOptions.budget) {
        showAlert('Generating Budget Plan', 'AI is calculating a realistic budget based on your preferences...', 'loading');
        try {
          const daysArray = generateDaysForAi(tripInfo.startDate, tripInfo.endDate);
          const duration = daysArray.length || 3;
          const travelersCount = parseInt(aiPreferences.travelers) || (tripInfo.participants ? (Array.isArray(tripInfo.participants) ? tripInfo.participants.length : Object.keys(tripInfo.participants).length) : 1);
          const budgetResult = await generateBudgetPlan({
            destination: tripInfo.destination,
            duration: duration,
            travelers: travelersCount,
            budget_min: aiPreferences.budget_min,
            budget_max: aiPreferences.budget_max,
            preference: aiPreferences.budget_preference,
            priority: aiPreferences.budget_priority?.join(', '),
            accommodation: aiPreferences.accommodation_type,
            hotel_price: aiPreferences.hotel_price,
            primary_transport: aiPreferences.transport_modes?.join(', '),
            local_transport: aiPreferences.local_transport?.join(', ')
          });

          if (budgetResult.success && budgetResult.categories) {
            setBudget({ total: budgetResult.total, categories: budgetResult.categories });
          }
        } catch (e) {
          console.warn("Budget generation failed", e);
        }
      }

      hideAlert();
      // eslint-disable-next-line no-undef
      setTimeout(() => {
        const parts = [];
        if (regenOptions.itinerary && itineraryCount > 0) parts.push(`${itineraryCount} stops`);
        if (regenOptions.food && foodCount > 0) parts.push(`${foodCount} food items`);
        if (regenOptions.packing && packingAddedCount > 0) parts.push(`${packingAddedCount} packing items`);
        if (regenOptions.budget) parts.push('a complete budget plan');

        if (parts.length === 0) {
          showAlert('Generation Complete', 'AI scan complete. No new unique items were found to add to your lists.', 'info');
        } else {
          const message = `AI has added ${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' and ' : ''}${parts.slice(-1)} to your trip!`;
          showAlert('Generation Complete', message, 'success');
        }
      }, 500);
    } catch (error) {
      hideAlert();
      // eslint-disable-next-line no-undef
      setTimeout(() => {
        const failed = [];
        if (regenOptions.packing) failed.push('packing');
        if (regenOptions.budget) failed.push('budget');
        const failedText = failed.length > 0 ? ` but failed on ${failed.join('/')}` : '';
        showAlert('Partial Success', `AI added ${itineraryCount} stops${failedText}.`, 'success');
      }, 500);
    }
  };

  const executeAiGeneration = async (isReplace, currentItinerary) => {
    setAiModalVisible(false);
    setIsAiGenerating(true);

    let addedCount = 0;
    let foodAddedCount = 0;

    try {
      // Only show initial alert if itinerary generation is requested
      if (regenOptions.itinerary) {
        showAlert('Generating Itinerary', 'AI is crafting your perfect trip plan... This may take a moment.', 'loading');
        const daysArray = generateDaysForAi(tripInfo.startDate, tripInfo.endDate);
        const daysCount = daysArray.length || 3;
        const result = await generateTripItinerary(
          tripInfo.destination,
          daysCount,
          aiPreferences.budget_preference || 'Mid',
          travelers.length.toString(),
          aiPreferences.interests.join(', '),
          {
            ...aiPreferences,
            startTime: useTimings ? aiPreferences.startTime : undefined,
            endTime: useTimings ? aiPreferences.endTime : undefined,
            startLocation: aiPreferences.startLocation,
            placesEnabled: aiPreferences.placesEnabled,
            transitModes: aiPreferences.transport_modes,
            routeOptimization: aiPreferences.routeOptimization
          }
        );

        if (result.success && result.itinerary) {
          if (isReplace) setItinerary([]);
          const addedSignatures = new Set();
          for (const day of result.itinerary) {
            const dayNum = parseInt(day.day);
            for (const activity of day.activities) {
              let type = activity.type?.toLowerCase() || 'attraction';
              if (!STOP_TYPES.some(t => t.key === type)) {
                if (type.includes('meal')) type = 'lunch';
                else if (type.includes('visit')) type = 'attraction';
                else type = 'attraction';
              }

              const cleanTitle = activity.title.toLowerCase().trim();
              const signature = `${dayNum}-${cleanTitle}`;
              if (addedSignatures.has(signature)) continue;

              const isDuplicate = !isReplace && currentItinerary.some(item => {
                if (parseInt(item.dayNumber) !== dayNum) return false;
                const existingName = (item.name || '').toLowerCase().trim();
                return existingName === cleanTitle || existingName.includes(cleanTitle) || cleanTitle.includes(existingName);
              });

              if (!isDuplicate) {
                addedSignatures.add(signature);
                await addItineraryItem({
                  name: activity.title,
                  type: type,
                  dayNumber: dayNum,
                  time: activity.time,
                  notes: activity.description,
                  location: activity.location,
                  duration: activity.duration,
                  cost: activity.cost || '',
                  latitude: 0,
                  longitude: 0
                });
                addedCount++;
              }
            }
          }
        } else {
          // If itinerary generation failed, show an error specific to itinerary
          hideAlert();
          showAlert('AI Error', result.error || 'Could not generate itinerary.', 'error');
          setIsAiGenerating(false);
          return; // Stop further generation if itinerary failed
        }
      }

      // Food
      if (regenOptions.food) {
        if (isReplace) setFoodItems([]);
        // If itinerary was generated, hide its alert before showing food alert
        if (regenOptions.itinerary) hideAlert();
        showAlert('Generating Food Suggestions', 'Now finding the best local dishes for your trip locations...', 'loading');
        try {
          if (isReplace) setFoodItems([]);
          const stops = tripInfo.stops || [];
          const stopNames = stops.map(s => typeof s === 'object' ? (s.name || s.formatted_address || 'Stop') : s);

          // Filter out the combined destination string if it's just a concatenation of stops
          const mainDest = tripInfo.destination || '';
          const isCombined = mainDest.includes(' - ');

          const uniqueLocations = [...new Set([
            ...(isCombined ? [] : [mainDest]),
            ...stopNames
          ])].filter(Boolean);

          const foodResult = await generateFoodRecommendations(uniqueLocations, 'Any');
          if (foodResult.success && foodResult.recommendations) {
            const addedFoodSignatures = new Set();
            for (const placeData of foodResult.recommendations) {
              // Improved matching: Find the location that is a substring of the result place, 
              // prioritizing the longest match to avoid "Mumba" matching "Mumbai" incorrectly,
              // but here we want the SPECIFIC stop to match the AI's "place" field.
              const resultPlaceLower = (placeData.place || '').toLowerCase();

              // Sort uniqueLocations by length descending to match most specific first
              const sortedLocations = [...uniqueLocations].sort((a, b) => b.length - a.length);
              const targetPlace = sortedLocations.find(p =>
                resultPlaceLower.includes(p.toLowerCase()) ||
                p.toLowerCase().includes(resultPlaceLower)
              ) || uniqueLocations[0];
              for (const item of (placeData.items || [])) {
                const signature = `${targetPlace}:${item.name.trim().toLowerCase()}`;
                const exists = !isReplace && foodItems.some(f => f.place === targetPlace && f.name.toLowerCase() === item.name.trim().toLowerCase());
                if (!exists && !addedFoodSignatures.has(signature)) {
                  addedFoodSignatures.add(signature);
                  await addFoodItem(
                    targetPlace,
                    item.name,
                    item.type?.toLowerCase().includes('non') ? 'Non-Veg' : 'Veg',
                    item.bestTime,
                    item.bestLocations || item.bestLocation,
                    {
                      localSecret: item.localSecret,
                      perfectPairing: item.perfectPairing,
                      vibe: item.vibe,
                      priceRange: item.priceRange,
                      variation: item.variation
                    }
                  );
                  foodAddedCount++;
                }
              }
            }
          }
        } catch (e) {
          console.warn("Food generation failed", e);
        }
      }
      await finalizeAiGeneration(addedCount, foodAddedCount, isReplace);
    } catch (e) {
      hideAlert();
      showAlert('Error', e.message, 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleGenerateAiPlan = async () => {
    if (!tripInfo.destination) {
      showAlert('Enter Destination', 'Please select a destination first to generate an itinerary.', 'error');
      return;
    }

    if (hasExistingContent) {
      setRegenOptions({
        itinerary: false,
        packing: false,
        food: false,
        budget: false
      });
    }

    // Always open modal to let user choose options and what to regenerate
    setAiModalVisible(true);
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
    // console.log('handleEndTrip called, tripInfo:', tripInfo);
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
                  {tripInfo.isCompleted
                    ? 'TRIP COMPLETED'
                    : (daysUntil < 0 ? 'TRIP IN PROGRESS' : daysUntil === 0 ? 'TRIP STARTS TODAY!' : `${daysUntil} DAYS TO GO`)
                  }
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <PremiumBackButton
                onPress={onBackToHome}
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                <Icon name="close" size={24} color="#EF4444" />
              </PremiumBackButton>
            </View>
          </View>
        </Animated.View>

        {/* Main Map & Info Section */}
        <Animated.View style={[styles.mainSection, { transform: [{ scale: scaleAnim }] }]}>
          {/* Top: Interactive Map (Read-Only visualization) */}
          <TripMap
            origin={mapData.start}
            visit={mapData.visit}
            stops={mapData.stops}
            destination={mapData.end}
            style={styles.mapContainer}
            borderRadius={24}
            showDetailedMarkers={false}
          />

          {/* Nike-style Boxed Info Card */}
          <View style={styles.boxedInfoCard}>
            <View style={styles.cardHeader}>
              <View>
                <Pressable
                  disabled={tripInfo.isCompleted}
                  onPress={() => { setEditTripName(tripInfo.name || ''); setShowNameEditModal(true); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 4 }}
                >
                  <Text style={[styles.cardTripName, { flex: 1 }]} numberOfLines={2}>
                    {tripInfo.name || tripInfo.destination || 'My Adventure'}
                  </Text>
                  {!tripInfo.isCompleted && (
                    <Icon name="pen" size={20} color={colors.primary} style={{ marginLeft: 12, opacity: 0.8 }} />
                  )}
                </Pressable>
                <View style={styles.tagRow}>
                  <View style={styles.typeTag}>
                    <Text style={styles.typeTagText}>{(tripInfo.tripType || 'Solo').toUpperCase()}</Text>
                  </View>
                  <View style={[styles.typeTag, { backgroundColor: tripInfo.isCompleted ? colors.textMuted + '20' : '#3B82F620' }]}>
                    <Text style={[styles.typeTagText, { color: tripInfo.isCompleted ? colors.textMuted : '#3B82F6' }]}>
                      {tripInfo.isCompleted ? 'COMPLETED' : `${totalTripDaysCount} DAYS`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.cardDescription}>
              {tripInfo.aiDescription || `Get ready for an unforgettable journey to ${tripInfo.destination || 'your destination'}. You're all set to explore ${mainLocationsCount} amazing places.`}
            </Text>

            {/* Quick Access Icons */}
            <View style={styles.quickAccessRow}>
              <TouchableOpacity style={styles.quickAccessBtn} onPress={() => onSetScreen('Itinerary')}>
                <View style={[styles.quickAccessIconBg, { backgroundColor: '#4682B420' }]}>
                  <Icon name="itinerary" size={22} color="#4682B4" />
                </View>
                <Text style={styles.quickAccessText}>Itinerary</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.quickAccessBtn} onPress={() => onSetScreen('Expenses')}>
                <View style={[styles.quickAccessIconBg, { backgroundColor: '#EF444420' }]}>
                  <Icon name="expenses" size={22} color="#EF4444" />
                </View>
                <Text style={styles.quickAccessText}>Expenses</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickAccessBtn} onPress={() => onSetScreen('Budget')}>
                <View style={[styles.quickAccessIconBg, { backgroundColor: '#10B98120' }]}>
                  <Icon name="budget" size={22} color="#10B981" />
                </View>
                <Text style={styles.quickAccessText}>Budget</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickAccessBtn} onPress={() => onSetScreen('Packing')}>
                <View style={[styles.quickAccessIconBg, { backgroundColor: '#F59E0B20' }]}>
                  <Icon name="packing" size={22} color="#F59E0B" />
                </View>
                <Text style={styles.quickAccessText}>Packing</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickAccessBtn} onPress={() => onSetScreen('Food')}>
                <View style={[styles.quickAccessIconBg, { backgroundColor: '#8B5CF620' }]}>
                  <Icon name="food" size={22} color="#8B5CF6" />
                </View>
                <Text style={styles.quickAccessText}>Food</Text>
              </TouchableOpacity>


              <TouchableOpacity style={styles.quickAccessBtn} onPress={() => setShowSettingsModal(true)}>
                <View style={[styles.quickAccessIconBg, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                  <Icon name="settings" size={22} color={colors.text} />
                </View>
                <Text style={styles.quickAccessText}>Settings</Text>
              </TouchableOpacity>
            </View>
            
            {/* AI Action Button - Moved below icons */}
            {!tripInfo.isCompleted && (
              <TouchableOpacity
                style={{
                  marginTop: 10,
                  marginBottom: 10,
                  backgroundColor: colors.primary + '15',
                  paddingVertical: 14,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.primary + '30',
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 2
                }}
                onPress={() => {
                  const access = checkFeatureAccess('ai_planning');
                  if (!access.allowed) {
                    showAlert(
                      'Premium Feature',
                      access.reason,
                      'premium',
                      () => navigation.navigate('Subscription'),
                      () => hideAlert(),
                      null,
                      'Go Pro',
                      'Later'
                    );
                    return;
                  }
                  setAiModalVisible(true);
                }}
                disabled={isAiGenerating}
              >
                {isAiGenerating ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <Icon name="sparkles" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
                      Let AI plan your trip
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}



            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => {
                  const normalizePlace = (place) => {
                    if (!place) return null;
                    if (typeof place === 'object' && (place.name || place.fullAddress || place.place_id)) return place;
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
                }}
              >
                <Text style={styles.gridLabel}>LOCATIONS</Text>
                <Text style={styles.gridValue}>{mainLocationsCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('Budget')}
              >
                <Text style={styles.gridLabel}>BUDGET</Text>
                <Text style={styles.gridValue}>{formatCurrency(budget.total)}</Text>
              </TouchableOpacity>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>LAST EXPENSE</Text>
                <Text style={[styles.gridValue, { fontSize: 16 }]}>
                  {lastExpense ? formatCurrency(lastExpense.amount) : '-'}
                </Text>
                {lastExpense && <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{lastExpense.title}</Text>}
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>TRAVELERS</Text>
                <Text style={styles.gridValue}>{getAllTravelers().length}</Text>
              </View>
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('Packing')}
              >
                <Text style={styles.gridLabel}>PACKING</Text>
                {packingItems?.length > 0 ? (
                  <View>
                    <Text style={styles.gridValue}>
                      {packingItems.filter(item => item.packed).length}/{packingItems.length}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>Packed</Text>
                  </View>
                ) : (
                  <Text style={styles.gridValue}>0</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => navigation.navigate('Food')}
              >
                <Text style={styles.gridLabel}>FOOD</Text>
                {foodItems?.length > 0 ? (
                  <View>
                    <Text style={styles.gridValue}>
                      {foodItems.filter(item => item.tried).length}/{foodItems.length}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>Tried</Text>
                  </View>
                ) : (
                  <Text style={styles.gridValue}>0</Text>
                )}
              </TouchableOpacity>
            </View>


            {/* Helper Text - Moved to bottom */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, justifyContent: 'center' }}>
              <Icon name="info" size={12} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
                Click on the settings icons to edit the trip details.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, justifyContent: 'center' }}>
              <Icon name="location" size={12} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 10, color: colors.textMuted, fontStyle: 'italic' }}>
                Locations count does not include the starting and ending points.
              </Text>
            </View>

            {/* AI Action Button - Repositioned */}


          </View>
        </Animated.View>

        {/* Banner Ad */}
        <BannerAd />

        {/* Participants - Keep this section */}
        {/* {travelers.length > 0 && ( */}
        <Animated.View style={[styles.participantsSection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="group" size={24} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Travelers</Text>
            </View>
            {!tripInfo.isCompleted && (
              <TouchableOpacity onPress={() => setShowTravelersModal(true)}>
                <Text style={styles.viewMoreText}>Edit →</Text>
              </TouchableOpacity>
            )}
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

        {/* Interactive Trip Timeline */}
        {itinerary.length > 0 && (
          <Animated.View style={[styles.timelineSection, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="calendar" size={24} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Interactive Timeline</Text>
              </View>
              <TouchableOpacity onPress={() => onSetScreen('Itinerary')}>
                <Text style={styles.viewMoreText}>View Map →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timelineVerticalScroll}>
              {getTimelineData()
                .slice(0, showAllTimelineDays ? undefined : 3)
                .map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.timelineVerticalCard}
                    onPress={() => {
                      onSetScreen('Itinerary');
                    }}
                  >
                    <View style={styles.timelineVerticalBadge}>
                      <Text style={styles.timelineDayLabel}>DAY</Text>
                      <Text style={styles.timelineDayNumber}>{day.day}</Text>
                    </View>
                    <View style={styles.timelineVerticalContent}>
                      <Text style={styles.timelineHighlight} numberOfLines={2}>
                        {day.highlight}
                      </Text>
                    </View>
                    <Icon name="arrow_right" size={20} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              {getTimelineData().length > 3 && (
                <TouchableOpacity
                  style={styles.timelineSeeMoreBtn}
                  onPress={() => setShowAllTimelineDays(!showAllTimelineDays)}
                >
                  <Text style={styles.timelineSeeMoreText}>
                    {showAllTimelineDays ? 'See Less' : `See All ${getTimelineData().length} Days`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}
        {/* )} */}



        {/* Only add bottom spacer on native, not needed on web */}
        {Platform.OS !== 'web' && <View style={{ height: 20 }} />}
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

            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={styles.settingsList}
              showsVerticalScrollIndicator={false}
            >
              {SETTINGS_OPTIONS.filter(option => {
                if (!tripInfo.isCompleted) return true;
                // If completed, only show Delete Trip or maybe a "View" option if we had one.
                // We definitely want to hide edit/manage stuff.
                return option.id === 'delete_trip';
              }).map((option) => (
                <Pressable
                  key={option.id}
                  style={[styles.settingsItem, option.danger && styles.settingsItemDanger]}
                  onPress={() => handleSettingsOptionPress(option)}
                >
                  <View style={[styles.settingsIconBg, {
                    backgroundColor: option.danger ? '#EF444420' : (option.icon === 'calendar' ? '#8B5CF620' : (option.id === 'end_trip' || option.icon === 'location' || option.icon === 'flag') ? '#10B98120' : option.icon === 'group' ? '#3B82F620' : '#F59E0B20')
                  }]}>
                    <Icon name={option.id === 'end_trip' ? 'flag' : option.icon} size={20} color={option.danger ? '#EF4444' : (option.icon === 'calendar' ? '#8B5CF6' : (option.id === 'end_trip' || option.icon === 'location' || option.icon === 'flag') ? '#10B981' : option.icon === 'group' ? '#3B82F6' : '#F59E0B')} />
                  </View>
                  <View style={styles.settingsInfo}>
                    <Text style={[styles.settingsLabel, option.danger && { color: '#EF4444' }]}>{option.label}</Text>
                    <Text style={styles.settingsDesc}>{option.id === 'manage_travelers' ? `${participantCount} travelers` : (option.id === 'edit_dates' ? `${tripInfo.startDate}  ${tripInfo.endDate}` : (option.id === 'edit_locations' ? 'Origin, Destination & Stops' : (option.danger ? 'Remove trip permanently' : 'Mark trip as completed')))}</Text>
                  </View>
                  <Text style={[styles.settingsArrow, option.danger && { color: '#EF4444' }]}>→</Text>
                </Pressable>
              ))}
            </ScrollView>
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

      <Modal visible={aiModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '90%', maxHeight: '90%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>✨ AI Trip Planner</Text>
              <TouchableOpacity onPress={() => setAiModalVisible(false)} style={{ padding: 4 }}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {hasExistingContent && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 16 }}>What would you like to update?</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
                    {[
                      { key: 'itinerary', label: 'Itinerary', icon: 'map', color: '#3B82F6' },
                      { key: 'packing', label: 'Packing List', icon: 'packing', color: '#10B981' },
                      { key: 'food', label: 'Food Spots', icon: 'food', color: '#F59E0B' },
                      { key: 'budget', label: 'Money Plan', icon: 'budget', color: '#EF4444' }
                    ].map((item) => {
                      const selected = regenOptions[item.key];
                      return (
                        <TouchableOpacity
                          key={item.key}
                          activeOpacity={0.7}
                          style={{
                            width: '48%',
                            aspectRatio: 1,
                            backgroundColor: selected ? item.color + '15' : colors.card,
                            borderRadius: 24,
                            padding: 20,
                            borderWidth: 2,
                            borderColor: selected ? item.color : 'transparent',
                            justifyContent: 'space-between',
                            // Glassmorphism effect
                            shadowColor: item.color,
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: selected ? 0.3 : 0,
                            shadowRadius: 12,
                            elevation: selected ? 8 : 0,
                          }}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              // eslint-disable-next-line no-undef
                              LayoutAnimation.configureNext({
                                duration: 400,
                                create: { type: 'spring', springDamping: 0.7, property: 'scaleXY' },
                                update: { type: 'spring', springDamping: 0.7 },
                                delete: { type: 'fade', property: 'opacity' }
                              });
                            }
                            setRegenOptions(prev => ({ ...prev, [item.key]: !prev[item.key] }));
                          }}
                        >
                          <View style={{
                            width: 52,
                            height: 52,
                            borderRadius: 16,
                            backgroundColor: selected ? item.color : colors.bg,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 12
                          }}>
                            <Icon name={item.icon} size={28} color={selected ? '#FFFFFF' : colors.textMuted} />
                          </View>
                          <View>
                            <Text style={{
                              color: colors.text,
                              fontSize: 16,
                              fontWeight: '800',
                              marginBottom: 4
                            }}>{item.label}</Text>
                            <Text style={{
                              color: colors.textMuted,
                              fontSize: 12,
                              fontWeight: '500'
                            }}>{selected ? 'Selected' : 'Tap to select'}</Text>
                          </View>

                          {selected && (
                            <View style={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              backgroundColor: item.color,
                              padding: 4,
                              borderRadius: 10
                            }}>
                              <Icon name="check" size={14} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {(!hasExistingContent || regenOptions.itinerary) && (
                <>
                  {/* 1. Trip Timings */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Trip Timings</Text>
                    <TouchableOpacity
                      onPress={() => setUseTimings(!useTimings)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: useTimings ? colors.primary + '20' : colors.cardLight,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: useTimings ? colors.primary : colors.border
                      }}
                    >
                      <View style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: useTimings ? colors.primary : colors.textMuted,
                        marginRight: 8
                      }} />
                      <Text style={{ color: useTimings ? colors.primary : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                        {useTimings ? 'Enabled' : 'Disabled'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{
                    marginBottom: 20,
                    backgroundColor: colors.cardLight,
                    padding: 16,
                    borderRadius: 16,
                    opacity: useTimings ? 1 : 0.5,
                    pointerEvents: useTimings ? 'auto' : 'none'
                  }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Starts At</Text>
                        <DatePicker12
                          mode="time"
                          disabled={!useTimings}
                          value={(() => {
                            const d = new Date();
                            const [time, period] = (aiPreferences.startTime || '09:00 AM').split(' ');
                            const [hours, minutes] = time.split(':');
                            let h = parseInt(hours);
                            if (period === 'PM' && h !== 12) h += 12;
                            if (period === 'AM' && h === 12) h = 0;
                            d.setHours(h, parseInt(minutes), 0, 0);
                            return d;
                          })()}
                          onChange={(date) => setAiPreferences(prev => ({
                            ...prev,
                            startTime: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }))}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Ends At</Text>
                        <DatePicker12
                          mode="time"
                          disabled={!useTimings}
                          value={(() => {
                            const d = new Date();
                            const [time, period] = (aiPreferences.endTime || '09:00 PM').split(' ');
                            const [hours, minutes] = time.split(':');
                            let h = parseInt(hours);
                            if (period === 'PM' && h !== 12) h += 12;
                            if (period === 'AM' && h === 12) h = 0;
                            d.setHours(h, parseInt(minutes), 0, 0);
                            return d;
                          })()}
                          onChange={(date) => setAiPreferences(prev => ({
                            ...prev,
                            endTime: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }))}
                        />
                      </View>
                    </View>
                  </View>

                  {/* 2. Detailed Places Duration */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Places & Duration</Text>
                      <Switch
                        value={aiPreferences.placesEnabled !== false}
                        onValueChange={(val) => setAiPreferences(prev => ({ ...prev, placesEnabled: val }))}
                        style={{ transform: [{ scale: 0.8 }], marginLeft: 8 }}
                        trackColor={{ false: colors.border, true: colors.primary }}
                      />
                    </View>
                    {aiPreferences.placesEnabled !== false && (() => {
                      const totalDays = generateDaysForAi(tripInfo.startDate, tripInfo.endDate).length || 1;
                      const plannedDays = Object.values(aiPreferences.locationDurations || {}).reduce((sum, d) => sum + (parseInt(d) || 0), 0);
                      const remaining = totalDays - plannedDays;
                      return (
                        <View style={{
                          backgroundColor: remaining < 0 ? '#EF444420' : colors.primary + '20',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: remaining < 0 ? '#EF4444' : colors.primary
                        }}>
                          <Text style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: remaining < 0 ? '#EF4444' : colors.primary
                          }}>
                            {plannedDays}/{totalDays} Days {remaining < 0 ? '(Exceeded!)' : `(${remaining} left)`}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  {aiPreferences.placesEnabled !== false && (
                    <View style={{ marginBottom: 24, gap: 10 }}>
                      {tripInfo.stops && tripInfo.stops.length > 0 ? (
                        tripInfo.stops.map((stop, index) => {
                          const stopName = typeof stop === 'object' ? (stop.name || `Stop ${index + 1}`) : stop;
                          const durationKey = `stop_${index}`;
                          const totalDays = generateDaysForAi(tripInfo.startDate, tripInfo.endDate).length || 1;

                          return (
                            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, padding: 12, borderRadius: 12 }}>
                              <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' }}>{stopName}</Text>
                              <TextInput
                                style={[styles.aiInputSmall, { outlineStyle: 'none' }]}
                                placeholder="Days"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                                value={aiPreferences.locationDurations?.[durationKey] || ''}
                                onChangeText={(t) => {
                                  const val = parseInt(t) || 0;
                                  // Basic validation: can't be more than total trip days by itself
                                  if (val > totalDays) {
                                    showAlert('Invalid Duration', `Duration for one stop cannot exceed total trip days (${totalDays}).`, 'warning', () => hideAlert());
                                    return;
                                  }

                                  setAiPreferences(prev => ({
                                    ...prev,
                                    locationDurations: { ...prev.locationDurations, [durationKey]: t }
                                  }));
                                }}
                              />
                            </View>
                          );
                        })
                      ) : (
                        <Text style={{ color: colors.textMuted, fontSize: 14 }}>No main stops added yet. Add stops in settings to plan per location.</Text>
                      )}
                    </View>
                  )}

                  {/* 3. Pace */}
                  <Text style={styles.aiSectionHeader}>Trip Pace</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                    {PACE_OPTIONS.map(pace => (
                      <TouchableOpacity
                        key={pace}
                        style={[
                          styles.aiSelectionPill,
                          {
                            flex: 1,
                            backgroundColor: aiPreferences.pace === pace ? colors.primary : colors.bg,
                            borderColor: aiPreferences.pace === pace ? colors.primary : colors.border
                          }
                        ]}
                        onPress={() => setAiPreferences(prev => ({ ...prev, pace }))}
                      >
                        <Text style={[
                          styles.aiSelectionText,
                          { color: aiPreferences.pace === pace ? '#000000' : colors.textMuted }
                        ]}>{pace}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 4. Routing Strategy */}
                  <Text style={styles.aiSectionHeader}>Routing Strategy</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                    <TouchableOpacity
                      style={[
                        styles.aiSelectionPill,
                        {
                          flex: 1,
                          backgroundColor: aiPreferences.routeOptimization === 'optimize' ? colors.primary : colors.bg,
                          borderColor: aiPreferences.routeOptimization === 'optimize' ? colors.primary : colors.border
                        }
                      ]}
                      onPress={() => setAiPreferences(prev => ({ ...prev, routeOptimization: 'optimize' }))}
                    >
                      <Text style={[
                        styles.aiSelectionText,
                        { color: aiPreferences.routeOptimization === 'optimize' ? '#000000' : colors.textMuted }
                      ]}>AI Best Route</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.aiSelectionPill,
                        {
                          flex: 1,
                          backgroundColor: aiPreferences.routeOptimization === 'follow-order' ? colors.primary : colors.bg,
                          borderColor: aiPreferences.routeOptimization === 'follow-order' ? colors.primary : colors.border
                        }
                      ]}
                      onPress={() => setAiPreferences(prev => ({ ...prev, routeOptimization: 'follow-order' }))}
                    >
                      <Text style={[
                        styles.aiSelectionText,
                        { color: aiPreferences.routeOptimization === 'follow-order' ? '#000000' : colors.textMuted }
                      ]}>Follow My Order</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 4. Interests */}
                  <Text style={styles.aiSectionHeader}>Interests</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 30 }}>
                    {INTEREST_TAGS.map(tag => {
                      const selected = aiPreferences.interests.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            styles.aiSelectionPill,
                            {
                              paddingHorizontal: 16,
                              backgroundColor: selected ? colors.primary + '20' : colors.bg,
                              borderColor: selected ? colors.primary : colors.border
                            }
                          ]}
                          onPress={() => handleToggleInterest(tag)}
                        >
                          <Text style={[
                            styles.aiSelectionText,
                            {
                              color: selected ? colors.primary : colors.textMuted,
                              fontSize: 14 // Consistent with other pills
                            }
                          ]}>{tag}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {(!hasExistingContent || regenOptions.budget) && (
                <>
                  {/* 5. Budget Range */}
                  <Text style={styles.aiSectionHeader}>Budget Range</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 6 }}>Minimum Budget</Text>
                      <TextInput
                        style={[styles.aiInput, { outlineStyle: 'none' }]}
                        placeholder="e.g. 10000"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={aiPreferences.budget_min}
                        onChangeText={(t) => setAiPreferences(prev => ({ ...prev, budget_min: t }))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 6 }}>Maximum Budget</Text>
                      <TextInput
                        style={[styles.aiInput, { outlineStyle: 'none' }]}
                        placeholder="e.g. 50000"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={aiPreferences.budget_max}
                        onChangeText={(t) => setAiPreferences(prev => ({ ...prev, budget_max: t }))}
                      />
                    </View>
                  </View>

                  {/* 6. Budget Preference */}
                  <Text style={styles.aiSectionHeader}>Budget Preference</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                    {BUDGET_PREFERENCES.map(pref => (
                      <TouchableOpacity
                        key={pref}
                        style={[
                          styles.aiSelectionPill,
                          {
                            paddingHorizontal: 18,
                            backgroundColor: aiPreferences.budget_preference === pref ? colors.primary + '20' : colors.bg,
                            borderColor: aiPreferences.budget_preference === pref ? colors.primary : colors.border
                          }
                        ]}
                        onPress={() => setAiPreferences(prev => ({ ...prev, budget_preference: pref }))}
                      >
                        <Text style={[
                          styles.aiSelectionText,
                          { color: aiPreferences.budget_preference === pref ? colors.primary : colors.textMuted }
                        ]}>{pref}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.aiSectionHeader}>Major Expense Priority</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                    {BUDGET_PRIORITIES.map(priority => {
                      const selected = aiPreferences.budget_priority.includes(priority);
                      return (
                        <TouchableOpacity
                          key={priority}
                          style={[
                            styles.aiSelectionPill,
                            {
                              paddingHorizontal: 18,
                              backgroundColor: selected ? colors.primary + '20' : colors.bg,
                              borderColor: selected ? colors.primary : colors.border
                            }
                          ]}
                          onPress={() => handleTogglePriority(priority)}
                        >
                          <Text style={[
                            styles.aiSelectionText,
                            { color: selected ? colors.primary : colors.textMuted }
                          ]}>{priority}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.aiSectionHeader}>Accommodation</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {ACCOMMODATION_TYPES.map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.aiSelectionPill,
                          {
                            paddingHorizontal: 18,
                            backgroundColor: aiPreferences.accommodation_type === type ? colors.primary + '20' : colors.bg,
                            borderColor: aiPreferences.accommodation_type === type ? colors.primary : colors.border
                          }
                        ]}
                        onPress={() => setAiPreferences(prev => ({ ...prev, accommodation_type: type }))}
                      >
                        <Text style={[
                          styles.aiSelectionText,
                          { color: aiPreferences.accommodation_type === type ? colors.primary : colors.textMuted }
                        ]}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 8 }}>Price Range per Night</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {HOTEL_PRICE_RANGES.map(range => (
                        <TouchableOpacity
                          key={range}
                          style={[
                            styles.aiSelectionPill,
                            {
                              backgroundColor: aiPreferences.hotel_price === range ? colors.primary + '20' : colors.bg,
                              borderColor: aiPreferences.hotel_price === range ? colors.primary : colors.border
                            }
                          ]}
                          onPress={() => setAiPreferences(prev => ({ ...prev, hotel_price: range }))}
                        >
                          <Text style={[
                            styles.aiSelectionText,
                            {
                              color: aiPreferences.hotel_price === range ? colors.primary : colors.textMuted
                            }
                          ]}>{range}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Text style={styles.aiSectionHeader}>Transport</Text>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 8 }}>Primary Transport (Long distance)</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {TRANSPORT_MODES.map(mode => {
                        const selected = aiPreferences.transport_modes.includes(mode);
                        return (
                          <TouchableOpacity
                            key={mode}
                            style={[
                              styles.aiSelectionPill,
                              {
                                paddingHorizontal: 16,
                                backgroundColor: selected ? colors.primary + '20' : colors.bg,
                                borderColor: selected ? colors.primary : colors.border
                              }
                            ]}
                            onPress={() => setAiPreferences(prev => ({
                              ...prev,
                              transport_modes: selected ? prev.transport_modes.filter(m => m !== mode) : [...prev.transport_modes, mode]
                            }))}
                          >
                            <Text style={[
                              styles.aiSelectionText,
                              {
                                color: selected ? colors.primary : colors.textMuted
                              }
                            ]}>{mode}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ marginBottom: 30 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 8 }}>Local Transport Preference</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {LOCAL_TRANSPORT_OPTIONS.map(opt => {
                        const selected = aiPreferences.local_transport.includes(opt);
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.aiSelectionPill,
                              {
                                paddingHorizontal: 16,
                                backgroundColor: selected ? colors.primary + '20' : colors.bg,
                                borderColor: selected ? colors.primary : colors.border
                              }
                            ]}
                            onPress={() => setAiPreferences(prev => ({
                              ...prev,
                              local_transport: selected ? prev.local_transport.filter(o => o !== opt) : [...prev.local_transport, opt]
                            }))}
                          >
                            <Text style={[
                              styles.aiSelectionText,
                              {
                                color: selected ? colors.primary : colors.textMuted
                              }
                            ]}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}
              {(!hasExistingContent || Object.values(regenOptions).some(v => v)) && (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    padding: 16,
                    borderRadius: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    marginBottom: 30
                  }}
                  onPress={() => executeAiGeneration(true, itinerary)}
                  disabled={isAiGenerating}
                >
                  {isAiGenerating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Icon name="sparkles" size={20} color="#000000" />
                      <Text style={{ color: '#000000', fontSize: 16, fontWeight: '900', marginLeft: 8 }}>
                        {hasExistingContent ? 'Regenerate Selected' : 'Generate Timed Itinerary'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
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
    </SafeAreaView >
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: Platform.OS === 'web' ? 0 : 20 },

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
  timelineSection: { paddingHorizontal: 20, marginBottom: 30 },
  timelineScroll: { paddingRight: 20, paddingVertical: 10 },
  timelineVerticalScroll: { paddingVertical: 10, gap: 12 },
  timelineVerticalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timelineVerticalBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 16,
  },
  timelineVerticalContent: {
    flex: 1,
  },
  timelineSeeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  timelineSeeMoreText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  timelineDayCard: {
    width: 140,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginRight: 15,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  timelineDayBadge: {
    backgroundColor: colors.primary + '15',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  timelineDayLabel: { fontSize: 10, fontWeight: '700', color: colors.primary, opacity: 0.8 },
  timelineDayNumber: { fontSize: 18, fontWeight: '800', color: colors.primary },
  timelineDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  timelineHighlight: { fontSize: 13, color: colors.text, fontWeight: '600', lineHeight: 18, minHeight: 40 },
  timelineStepIndicator: { position: 'absolute', bottom: 10, left: 16, right: 16, height: 10, justifyContent: 'center' },
  timelineStepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  timelineStepLine: { height: 1, backgroundColor: colors.primary + '30', position: 'absolute', left: 6, right: 0 },
  participantsCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primaryBorder },
  participantsList: {
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
  settingsList: { gap: 14, paddingVertical: 4 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, borderRadius: 16, padding: 18 },
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

  // Standardized AI Planner Styles
  aiSectionHeader: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  aiSelectionPill: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
  },
  aiSelectionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiInput: {
    height: 46,
    backgroundColor: colors.cardLight,
    color: colors.text,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: colors.border,
    fontSize: 14,
  },
  aiInputSmall: {
    height: 40,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    textAlign: 'center',
  },
  quickAccessRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 16,
    paddingHorizontal: 4,
  },
  quickAccessBtn: {
    alignItems: 'center',
    width: 60,
  },
  quickAccessIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickAccessText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  }
});
