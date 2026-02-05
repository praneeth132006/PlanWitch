import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Modal, StyleSheet, Animated, Dimensions, Image, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTravelContext } from '../context/TravelContext';

import { useTheme } from '../context/ThemeContext';
import TimePickerModal from '../components/TimePickerModal';
import Icon from '../components/Icon';
import { CustomAlert } from '../components/CustomAlert';
import { generateTripItinerary } from '../services/aiService';
import DatePicker12 from '../components/ui/DatePicker12';
import PremiumButton from '../components/PremiumButton';

const { width } = Dimensions.get('window');

const INTEREST_TAGS = ['Nature', 'History', 'Food', 'Adventure', 'Shopping', 'Culture', 'Relaxation', 'Nightlife'];
const PACE_OPTIONS = ['Relaxed', 'Moderate', 'Packed'];

// Simplified and organized stop types
// Simplified and organized stop types
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

// Helper to generate days between two dates
const generateDays = (startDate, endDate) => {
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

export default function MapScreen({ onBackToHome, onSetScreen }) {
  const { itinerary, addItineraryItem, deleteItineraryItem, tripInfo, getAllTravelers, setItinerary } = useTravelContext();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newStop, setNewStop] = useState({
    name: '', type: 'attraction', dayNumber: 1, time: '', notes: '', location: '',
    duration: '', cost: ''
  });



  // AI State
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiPreferences, setAiPreferences] = useState({
    pace: 'Moderate',
    interests: [],
    startTime: '09:00 AM',
    endTime: '09:00 PM',
    locationDurations: {}
  });

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

  const scrollViewRef = useRef(null);
  const floatAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  const tripDays = useMemo(() => generateDays(tripInfo.startDate, tripInfo.endDate), [tripInfo.startDate, tripInfo.endDate]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  const floatTranslate = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  const handleAddStop = () => {
    if (newStop.name.trim()) {
      if (isEditing) {
        updateItineraryItem(editingId, { ...newStop, dayNumber: parseInt(selectedDay?.dayNumber || newStop.dayNumber) });
      } else {
        addItineraryItem({ ...newStop, dayNumber: parseInt(selectedDay?.dayNumber || 1), latitude: 0, longitude: 0 });
      }
      setNewStop({ name: '', type: 'attraction', dayNumber: 1, time: '', notes: '', location: '', duration: '', cost: '' });
      setIsEditing(false);
      setEditingId(null);
      setModalVisible(false);
      setSelectedDay(null);
    }
  };

  const openAddModal = (day) => {
    setIsEditing(false);
    setEditingId(null);
    setSelectedDay(day);
    setNewStop({ name: '', type: 'attraction', dayNumber: day.dayNumber, time: '', notes: '', location: '', duration: '', cost: '' });
    setModalVisible(true);
  };

  const openEditModal = (stop) => {
    setIsEditing(true);
    setEditingId(stop.id);
    setSelectedDay({ dayNumber: stop.dayNumber });
    setNewStop({
      name: stop.name,
      type: stop.type,
      dayNumber: stop.dayNumber,
      time: stop.time || '',
      notes: stop.notes || '',
      location: stop.location || '',
      duration: stop.duration || '',
      cost: stop.cost || ''
    });
    setModalVisible(true);
  };

  const getStopType = (key) => STOP_TYPES.find(t => t.key === key) || STOP_TYPES[11];

  // Sort stops by time
  const getStopsForDay = (dayNumber) => {
    const numericDay = parseInt(dayNumber);
    return itinerary
      .filter(s => parseInt(s.dayNumber) === numericDay)
      .sort((a, b) => {
        const timeA = timeToMinutes(a.time);
        const timeB = timeToMinutes(b.time);
        if (timeA !== timeB) return timeA - timeB;
        return (a.name || '').localeCompare(b.name || ''); // Stable sort for same time
      });
  };

  const getCategoryStats = (dayNumber) => {
    const stops = getStopsForDay(dayNumber);
    return {
      transport: stops.filter(s => getStopType(s.type).category === 'transport').length,
      // ... existing categories
    };
  };

  const handleToggleInterest = (interest) => {
    setAiPreferences(prev => {
      const exists = prev.interests.includes(interest);
      if (exists) return { ...prev, interests: prev.interests.filter(i => i !== interest) };
      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  const handleGenerateItinerary = async () => {
    if (aiPreferences.interests.length === 0) {
      showAlert('Selection Required', 'Please select at least one interest.', 'warning');
      return;
    }

    // Validate total days match trip duration exactly
    const totalTripDays = tripDays.length || 3;

    // Only count days for current stops (ignore stale keys in locationDurations)
    let totalLocationDays = 0;
    if (tripInfo.stops && tripInfo.stops.length > 0) {
      tripInfo.stops.forEach((stop, index) => {
        // Use index-based key matching the input field
        const durationKey = `stop_${index}`;
        const days = parseInt(aiPreferences.locationDurations?.[durationKey]) || 0;
        totalLocationDays += days;
      });
    }

    if (totalLocationDays !== totalTripDays) {
      const message = totalLocationDays > totalTripDays
        ? `You've allocated ${totalLocationDays} days, but your trip is only ${totalTripDays} days. Please reduce by ${totalLocationDays - totalTripDays} day(s).`
        : `You've allocated ${totalLocationDays} days, but your trip is ${totalTripDays} days. Please add ${totalTripDays - totalLocationDays} more day(s).`;

      showAlert('Days Mismatch', message, 'warning');
      return;
    }

    // Check if itinerary already exists - Explicitly check length
    if (itinerary && itinerary.length > 0) {
      setAiModalVisible(false);
      // Ask user to Replace or Merge
      showAlert(
        'Existing Itinerary Found',
        'You already have items in your itinerary. Do you want to replace them completely with the new plan?',
        'info',
        () => {
          // Replace: Clear existing and generate new
          setItinerary([]);
          executeAiGeneration(true, []);  // Pass empty array as 'current'
        },
        () => hideAlert(), // Cancel
        null, // Removed Merge option
        'Replace All',
        'Cancel',
        ''
      );
    } else {
      executeAiGeneration(true, []);
    }
  };

  const executeAiGeneration = async (isReplace, currentItems) => {
    setAiModalVisible(false);
    setIsAiGenerating(true);

    // Show generating alert without dismiss button (loading state)
    setAlertConfig({
      visible: true,
      title: 'Generating Itinerary',
      message: 'AI is crafting your perfect trip plan... This may take a moment.',
      type: 'loading',
      onConfirm: null, // No dismiss button
      onCancel: null,
      confirmText: '',
      cancelText: ''
    });

    try {
      // Calculate days to generate
      const days = tripDays.length || 3;
      const result = await generateTripItinerary(
        tripInfo.destination,
        days,
        'Mid', // User budget preference could be passed here if available
        tripInfo.travelers || '2',
        aiPreferences.interests.join(', '),
        aiPreferences
      );

      hideAlert(); // Hide generating alert

      if (result.success && result.itinerary) {
        let addedCount = 0;

        // Use a Set to track added items to prevent self-duplicates in this batch
        const addedSignatures = new Set();

        result.itinerary.forEach(day => {
          day.activities.forEach(activity => {
            // Map AI type to our STOP_TYPES
            let type = activity.type?.toLowerCase() || 'attraction';
            if (!STOP_TYPES.some(t => t.key === type)) {
              if (type.includes('meal')) type = 'lunch';
              else if (type.includes('visit')) type = 'attraction';
              else type = 'attraction';
            }

            // Robust Duplicate Check
            const cleanTitle = activity.title.toLowerCase().trim();
            const dayNum = parseInt(day.day);
            const signature = `${dayNum}-${cleanTitle}`;
            if (addedSignatures.has(signature)) return; // Skip self-duplicate

            // 2. Check against existing itinerary items (if merging)
            const isDuplicate = !isReplace && currentItems.some(item => {
              if (parseInt(item.dayNumber) !== dayNum) return false;
              const existingName = (item.name || '').toLowerCase().trim();
              return existingName === cleanTitle || existingName.includes(cleanTitle) || cleanTitle.includes(existingName);
            });

            if (!isDuplicate) {
              addedSignatures.add(signature);
              addItineraryItem({
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
          });
        });

        setTimeout(() => {
          showAlert('Success', `AI has added ${addedCount} stops to your itinerary!`, 'success');
        }, 500);
      } else {
        setTimeout(() => {
          showAlert('AI Error', result.error || 'Could not generate itinerary.', 'error');
        }, 500);
      }

    } catch (e) {
      hideAlert();
      setTimeout(() => {
        showAlert('Error', e.message, 'error');
      }, 500);
    } finally {
      setIsAiGenerating(false);
    }
  };


  const totalStops = itinerary.length;
  const travelers = getAllTravelers();
  const participantCount = travelers.length;

  const filteredTypes = selectedCategory === 'all'
    ? STOP_TYPES
    : STOP_TYPES.filter(t => t.category === selectedCategory);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed Header */}
      {/* Fixed Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, backgroundColor: colors.bg, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="itinerary" size={24} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Itinerary</Text>
        </View>
        {!tripInfo.isCompleted && (
          <PremiumButton
            title={isAiGenerating ? 'Generating...' : 'AI Suggestions'}
            onPress={() => setAiModalVisible(true)}
            variant="gradient"
            size="small"
            loading={isAiGenerating}
            disabled={isAiGenerating}
          />
        )}
      </View>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        bounces={true}
      >



        {/* Trip Summary Card - Moved Inside ScrollView */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={{ marginRight: 8 }}><Icon name="calendar" size={20} color={colors.textMuted} /></View>
              <View>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{tripDays.length} Days</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={{ marginRight: 8 }}><Icon name="group" size={20} color={colors.textMuted} /></View>
              <View>
                <Text style={styles.summaryLabel}>Travelers</Text>
                <Text style={styles.summaryValue}>{participantCount} {participantCount === 1 ? 'Person' : 'People'}</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={{ marginRight: 8 }}><Icon name="location" size={20} color={colors.textMuted} /></View>
              <View>
                <Text style={styles.summaryLabel}>Activities</Text>
                <Text style={styles.summaryValue}>{totalStops} Planned</Text>
              </View>
            </View>
          </View>
          {tripInfo.startDate && tripInfo.endDate && (
            <View style={styles.dateRange}>
              <Text style={styles.dateRangeText}>
                🛫 {typeof tripInfo.startDate === 'string' ? tripInfo.startDate : tripInfo.startDate?.toLocaleDateString()}  →  {typeof tripInfo.endDate === 'string' ? tripInfo.endDate : tripInfo.endDate?.toLocaleDateString()} 🛬
              </Text>
            </View>
          )}
        </View>
        {/* Empty Hero */}
        {totalStops === 0 && (
          <View style={styles.emptyHero}>
            <Animated.View style={[styles.emptyHeroContent, { transform: [{ translateY: floatTranslate }] }]}>
              <View style={styles.emptyHeroGlobe}>
                <Icon name="map" size={50} color={colors.primary} />
                <Animated.View style={[styles.emptyHeroRing, { transform: [{ scale: pulseAnim }] }]} />
              </View>
            </Animated.View>
            <Text style={styles.emptyHeroTitle}>Plan Your Perfect Day</Text>
            <Text style={styles.emptyHeroText}>Add transportation, meals, activities & more</Text>
            <View style={styles.emptyHeroTips}>
              <View style={styles.tipItem}><Text style={styles.tipIcon}>✈️</Text><Text style={styles.tipText}>Transport</Text></View>
              <View style={styles.tipItem}><Text style={styles.tipIcon}>🏨</Text><Text style={styles.tipText}>Stay</Text></View>
              <View style={styles.tipItem}><Text style={styles.tipIcon}>🍽️</Text><Text style={styles.tipText}>Meals</Text></View>
              <View style={styles.tipItem}><Text style={styles.tipIcon}>🎯</Text><Text style={styles.tipText}>Activities</Text></View>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timeline}>
          {tripDays.map((day, dayIndex) => {
            const dayStops = getStopsForDay(day.dayNumber);
            const hasStops = dayStops.length > 0;
            const isLastDay = dayIndex === tripDays.length - 1;
            const stats = getCategoryStats(day.dayNumber);

            return (
              <View key={day.dayNumber} style={styles.daySection}>
                <View style={styles.dayCard}>
                  {/* Day Badge Column */}
                  <View style={styles.dayCardLeft}>
                    <View style={[styles.dayBadge, hasStops && styles.dayBadgeActive]}>
                      <Text style={[styles.dayBadgeText, hasStops && styles.dayBadgeTextActive]}>{day.dayNumber}</Text>
                    </View>
                    {!isLastDay && <View style={styles.dayConnector} />}
                  </View>

                  {/* Day Content */}
                  <View style={styles.dayCardContent}>
                    {/* Day Header */}
                    <View style={styles.dayCardHeader}>
                      <View>
                        <Text style={styles.dayCardTitle}>Day {day.dayNumber}</Text>
                        <Text style={styles.dayCardDate}>{day.dayName ? `${day.dayName}, ${day.dateString}` : day.dateString}</Text>
                      </View>
                      {!tripInfo.isCompleted && (
                        <TouchableOpacity style={styles.addButton} onPress={() => openAddModal(day)}>
                          <Text style={styles.addButtonIcon}>+</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Day Stats Mini */}
                    {hasStops && (
                      <View style={styles.dayStats}>
                        {stats.transport > 0 && <View style={styles.dayStatItem}><Text style={styles.dayStatIcon}>🚗</Text><Text style={styles.dayStatCount}>{stats.transport}</Text></View>}
                        {stats.accommodation > 0 && <View style={styles.dayStatItem}><Text style={styles.dayStatIcon}>🏨</Text><Text style={styles.dayStatCount}>{stats.accommodation}</Text></View>}
                        {stats.meal > 0 && <View style={styles.dayStatItem}><Text style={styles.dayStatIcon}>🍽️</Text><Text style={styles.dayStatCount}>{stats.meal}</Text></View>}
                        {stats.activity > 0 && <View style={styles.dayStatItem}><Text style={styles.dayStatIcon}>🎯</Text><Text style={styles.dayStatCount}>{stats.activity}</Text></View>}
                      </View>
                    )}

                    {/* Stops */}
                    {dayStops.length === 0 ? (
                      <TouchableOpacity
                        style={styles.emptyCard}
                        onPress={() => !tripInfo.isCompleted && openAddModal(day)}
                        disabled={tripInfo.isCompleted}
                      >
                        <View style={styles.emptyCardIcon}><Text style={styles.emptyCardEmoji}>✨</Text></View>
                        <View style={styles.emptyCardText}>
                          <Text style={styles.emptyCardTitle}>No activities planned</Text>
                          {!tripInfo.isCompleted && (
                            <Text style={styles.emptyCardSubtitle}>Tap to add transport, meals, or activities</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.stopsTimeline}>
                        {dayStops.map((stop, stopIndex) => {
                          const type = getStopType(stop.type);
                          const isLast = stopIndex === dayStops.length - 1;

                          return (
                            <View key={stop.id} style={styles.stopWrapper}>
                              {/* Time Column */}
                              <View style={styles.stopTimeContainer}>
                                <Text style={styles.stopTimeText}>{stop.time || '--:--'}</Text>
                                {!isLast && <View style={[styles.stopTimeLine, { backgroundColor: type.color + '40' }]} />}
                              </View>

                              {/* Stop Card */}
                              <View style={[styles.stopCard, { borderLeftColor: type.color }]}>
                                {/* Category Tag */}
                                <View style={[styles.categoryTag, { backgroundColor: type.color + '20' }]}>
                                  <Text style={[styles.categoryTagText, { color: type.color }]}>{type.category.toUpperCase()}</Text>
                                </View>

                                <View style={styles.stopCardHeader}>
                                  <View style={[styles.stopIconContainer, { backgroundColor: type.color + '25' }]}>
                                    <Icon name={type.icon} size={20} color={type.color} />
                                  </View>
                                  <View style={styles.stopCardInfo}>
                                    <Text style={styles.stopCardName}>{stop.name}</Text>
                                    <View style={styles.stopCardMeta}>
                                      <View style={[styles.stopTypeBadge, { backgroundColor: type.color + '15' }]}>
                                        <Text style={[styles.stopTypeBadgeText, { color: type.color }]}>{type.label}</Text>
                                      </View>
                                      {stop.duration && <Text style={styles.stopDuration}>⏱️ {stop.duration}</Text>}
                                    </View>
                                  </View>
                                  {!tripInfo.isCompleted && (
                                    <View style={styles.stopActions}>
                                      <TouchableOpacity style={styles.stopEditBtn} onPress={() => openEditModal(stop)}>
                                        <Icon name="pen" size={14} color={colors.primary} />
                                      </TouchableOpacity>
                                      <TouchableOpacity style={styles.stopDeleteBtn} onPress={() => deleteItineraryItem(stop.id)}>
                                        <Icon name="close" size={14} color="#EF4444" />
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>

                                {stop.location && (
                                  <View style={styles.stopDetailRow}>
                                    <Text style={styles.stopDetailIcon}>📍</Text>
                                    <Text style={styles.stopDetailText}>{stop.location}</Text>
                                  </View>
                                )}


                                {/* Cost removed as per user request */}

                                {stop.notes && (
                                  <View style={styles.stopNotesContainer}>
                                    <Text style={styles.stopNotes}>{stop.notes}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>



      {/* Add Stop Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <Text style={styles.modalTitle}>{isEditing ? 'Edit Activity' : 'Add to Itinerary'}</Text>
                {selectedDay && (
                  <View style={styles.modalDayBadge}>
                    <Text style={styles.modalDayText}>Day {selectedDay.dayNumber}</Text>
                    {selectedDay.dateString && <Text style={styles.modalDateText}> • {selectedDay.fullDate || selectedDay.dateString}</Text>}
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Filter */}
              <View style={styles.categoryFilter}>
                {['all', 'transport', 'accommodation', 'meal', 'activity'].map(cat => (
                  <TouchableOpacity key={cat} style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]} onPress={() => setSelectedCategory(cat)}>
                    <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                      {cat === 'all' ? 'All' : cat === 'transport' ? 'Transport' : cat === 'accommodation' ? 'Stay' : cat === 'meal' ? 'Meals' : 'Activities'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Type Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeGrid}>
                  {filteredTypes.map(type => (
                    <TouchableOpacity key={type.key} style={[styles.typeChip, newStop.type === type.key && { backgroundColor: type.color, borderColor: type.color }]} onPress={() => setNewStop({ ...newStop, type: type.key })}>
                      <Icon name={type.icon} size={16} color={newStop.type === type.key ? colors.bg : type.color} style={{ marginRight: 4 }} />
                      <Text style={[styles.typeChipText, newStop.type === type.key && { color: colors.bg }]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name / Description *</Text>
                <TextInput style={[styles.input, { outlineStyle: 'none' }]} placeholder="e.g., Flight to Paris, Eiffel Tower Visit" placeholderTextColor={colors.textMuted} value={newStop.name} onChangeText={(t) => setNewStop({ ...newStop, name: t })} />
              </View>

              {/* Time - Tap to open picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>⏰ Time</Text>
                <TouchableOpacity style={styles.timePickerButton} onPress={() => setTimePickerVisible(true)}>
                  <Text style={styles.timePickerIcon}>🕐</Text>
                  <Text style={[styles.timePickerText, !newStop.time && { color: colors.textMuted }]}>
                    {newStop.time || 'Tap to select time'}
                  </Text>
                  <Text style={styles.timePickerArrow}>→</Text>
                </TouchableOpacity>
              </View>

              {/* Duration & Cost Row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>⏱️ Duration</Text>
                  <TextInput style={[styles.input, { outlineStyle: 'none' }]} placeholder="2 hours" placeholderTextColor={colors.textMuted} value={newStop.duration} onChangeText={(t) => setNewStop({ ...newStop, duration: t })} />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>💰 Cost (optional)</Text>
                  <TextInput style={[styles.input, { outlineStyle: 'none' }]} placeholder="$50" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={newStop.cost} onChangeText={(t) => setNewStop({ ...newStop, cost: t })} />
                </View>
              </View>

              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📍 Location</Text>
                <TextInput style={[styles.input, { outlineStyle: 'none' }]} placeholder="Address or place name" placeholderTextColor={colors.textMuted} value={newStop.location} onChangeText={(t) => setNewStop({ ...newStop, location: t })} />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📝 Notes (optional)</Text>
                <TextInput style={[styles.input, styles.notesInput, { outlineStyle: 'none' }]} placeholder="Tips, reminders, details..." placeholderTextColor={colors.textMuted} value={newStop.notes} onChangeText={(t) => setNewStop({ ...newStop, notes: t })} multiline />
              </View>

              <TouchableOpacity style={[styles.submitButton, !newStop.name.trim() && styles.submitButtonDisabled]} onPress={handleAddStop} disabled={!newStop.name.trim()}>
                <Text style={styles.submitButtonText}>Add to Day {selectedDay?.dayNumber}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={timePickerVisible}
        onClose={() => setTimePickerVisible(false)}
        onSelect={(time) => setNewStop({ ...newStop, time })}
        selectedTime={newStop.time}
        title="Select Time"
      />

      {/* AI Preferences Modal */}
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

              {/* 1. Trip Timings */}
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Trip Timings</Text>
              <View style={{ marginBottom: 20, backgroundColor: colors.cardLight, padding: 16, borderRadius: 16 }}>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Starts At</Text>
                    <DatePicker12
                      mode="time"
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
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Places & Duration</Text>
              <View style={{ marginBottom: 24, gap: 10 }}>
                {tripInfo.stops && tripInfo.stops.length > 0 ? (
                  tripInfo.stops.map((stop, index) => {
                    const stopName = typeof stop === 'object' ? (stop.name || `Stop ${index + 1}`) : stop;
                    // Use index-based key to support duplicate place names
                    const durationKey = `stop_${index}`;
                    return (
                      <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, padding: 12, borderRadius: 12 }}>
                        <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' }}>{stopName}</Text>
                        <TextInput
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            padding: 8,
                            borderRadius: 8,
                            width: 80,
                            textAlign: 'center',
                            borderWidth: 1,
                            borderColor: colors.border,
                            outlineStyle: 'none'
                          }}
                          placeholder="Days"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          value={aiPreferences.locationDurations?.[durationKey] || ''}
                          onChangeText={(t) => setAiPreferences(prev => ({
                            ...prev,
                            locationDurations: { ...prev.locationDurations, [durationKey]: t }
                          }))}
                        />
                      </View>
                    );
                  })
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>No main stops added yet. Add stops in settings to plan per location.</Text>
                )}
              </View>

              {/* 3. Pace */}
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Trip Pace</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                {PACE_OPTIONS.map(pace => (
                  <TouchableOpacity
                    key={pace}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: aiPreferences.pace === pace ? colors.primary : colors.bg,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: aiPreferences.pace === pace ? colors.primary : colors.border
                    }}
                    onPress={() => setAiPreferences(prev => ({ ...prev, pace }))}
                  >
                    <Text style={{
                      fontWeight: '600',
                      color: aiPreferences.pace === pace ? 'white' : colors.textMuted
                    }}>{pace}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 4. Interests */}
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Interests</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 30 }}>
                {INTEREST_TAGS.map(tag => {
                  const selected = aiPreferences.interests.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        backgroundColor: selected ? colors.primary + '20' : colors.bg,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border
                      }}
                      onPress={() => handleToggleInterest(tag)}
                    >
                      <Text style={{
                        color: selected ? colors.primary : colors.textMuted,
                        fontWeight: selected ? '700' : '500'
                      }}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

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
                onPress={handleGenerateItinerary}
                disabled={isAiGenerating}
              >
                {isAiGenerating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Icon name="sparkles" size={20} color="white" />
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Generate Timed Itinerary</Text>
                  </>
                )}
              </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  headerSubtitle: { color: colors.primary, fontSize: 14, marginTop: 4 },

  // Summary Card
  summaryCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.primaryBorder },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  summaryIcon: { fontSize: 20, marginRight: 8 },
  summaryLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase' },
  summaryValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  summaryDivider: { width: 1, backgroundColor: colors.primaryBorder, marginHorizontal: 8 },
  dateRange: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.primaryBorder, alignItems: 'center' },
  dateRangeText: { color: colors.primary, fontSize: 13, fontWeight: '500' },

  // Day Selector
  daySelectorContainer: { marginBottom: 12 },
  daySelectorScroll: { paddingHorizontal: 20, gap: 8 },
  dayPill: { alignItems: 'center', backgroundColor: colors.card, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.primaryBorder, minWidth: 52 },
  dayPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayPillNumber: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  dayPillNumberActive: { color: colors.bg },
  dayPillLabel: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  dayPillLabelActive: { color: colors.bg },
  dayPillBadge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  dayPillBadgeActive: { backgroundColor: colors.bg },
  dayPillBadgeText: { color: colors.bg, fontSize: 10, fontWeight: 'bold' },
  dayPillBadgeTextActive: { color: colors.primary },

  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // Empty Hero
  emptyHero: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyHeroContent: { marginBottom: 20 },
  emptyHeroGlobe: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  emptyHeroEmoji: { fontSize: 50, zIndex: 2 },
  emptyHeroRing: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: colors.primary, opacity: 0.4 },
  emptyHeroTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  emptyHeroText: { color: colors.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center' },
  emptyHeroTips: { flexDirection: 'row', marginTop: 24, gap: 16 },
  tipItem: { alignItems: 'center' },
  tipIcon: { fontSize: 24 },
  tipText: { color: colors.textMuted, fontSize: 11, marginTop: 4 },

  // Timeline
  timeline: { paddingHorizontal: 16, marginTop: 10 },
  daySection: { marginBottom: 24 },
  dayCard: { flexDirection: 'row' },
  dayCardLeft: { alignItems: 'center', width: 30 },
  dayBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  dayBadgeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayBadgeText: { color: colors.text, fontSize: 12, fontWeight: 'bold' },
  dayBadgeTextActive: { color: colors.bg },
  dayConnector: { width: 2, flex: 1, backgroundColor: colors.primaryBorder, marginVertical: 8 },
  dayCardContent: { flex: 1, marginLeft: 16, paddingBottom: 8 },
  dayCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dayCardTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  dayCardDate: { color: colors.primary, fontSize: 12, marginTop: 2 },
  addButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  addButtonIcon: { color: colors.primary, fontSize: 20 },

  // Day Stats
  dayStats: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  dayStatItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dayStatIcon: { fontSize: 12, marginRight: 4 },
  dayStatCount: { color: colors.text, fontSize: 12, fontWeight: '600' },

  // Empty Card
  emptyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.primaryBorder, borderStyle: 'dashed' },
  emptyCardIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  emptyCardEmoji: { fontSize: 18 },
  emptyCardText: { marginLeft: 12 },
  emptyCardTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  emptyCardSubtitle: { color: colors.textLight, fontSize: 11, marginTop: 2 },

  // Stops Timeline
  stopsTimeline: { gap: 10 },
  stopWrapper: { flexDirection: 'row' },
  stopTimeContainer: { width: 32, alignItems: 'center' },
  stopTimeText: { color: colors.primary, fontSize: 10, fontWeight: '600' },
  stopTimeLine: { width: 2, flex: 1, marginTop: 4, marginBottom: -4, borderRadius: 1 },

  stopCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.primaryBorder, borderLeftWidth: 3, marginLeft: 6 },
  categoryTag: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryTagText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  stopCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  stopIconContainer: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stopIconEmoji: { fontSize: 16 },
  stopCardInfo: { flex: 1, marginLeft: 10 },
  stopCardName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  stopCardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8, flexWrap: 'wrap' },
  stopTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  stopTypeBadgeText: { fontSize: 10, fontWeight: '600' },
  stopDuration: { color: colors.textMuted, fontSize: 10 },
  stopActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stopEditBtn: { padding: 6, backgroundColor: colors.primary + '15', borderRadius: 6, borderWidth: 1, borderColor: colors.primary + '30' },
  stopDeleteBtn: { padding: 6, backgroundColor: '#EF444415', borderRadius: 6, borderWidth: 1, borderColor: '#EF444430' },
  stopDeleteIcon: { color: '#EF4444', fontSize: 16 },
  stopDetailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  stopDetailIcon: { fontSize: 11, marginRight: 6 },
  stopDetailText: { color: colors.textMuted, fontSize: 11, flex: 1 },
  stopNotesContainer: { marginTop: 8, backgroundColor: colors.cardLight, padding: 8, borderRadius: 6 },
  stopNotes: { color: colors.textLight, fontSize: 11, lineHeight: 16 },

  // FAB
  fab: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabIcon: { color: colors.bg, fontSize: 18, fontWeight: 'bold', marginRight: 6 },
  fabText: { color: colors.bg, fontSize: 14, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 20, maxHeight: '88%' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.textMuted, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalHeaderInfo: {},
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  modalDayBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  modalDayText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  modalDateText: { color: colors.textMuted, fontSize: 13 },
  modalClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardLight, borderRadius: 8 },
  modalCloseText: { color: colors.textMuted, fontSize: 20 },

  // Category Filter
  categoryFilter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.cardLight, borderWidth: 1, borderColor: colors.primaryBorder },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { color: colors.text, fontSize: 12 },
  categoryChipTextActive: { color: colors.bg, fontWeight: '600' },

  inputGroup: { marginBottom: 14 },
  inputLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 6, fontWeight: '500' },
  inputRow: { flexDirection: 'row' },
  input: { backgroundColor: colors.cardLight, color: colors.text, padding: 14, borderRadius: 10, fontSize: 14, borderWidth: 1, borderColor: colors.primaryBorder },
  notesInput: { height: 70, textAlignVertical: 'top' },

  // Time Picker Button
  timePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.primaryBorder },
  timePickerIcon: { fontSize: 20, marginRight: 10 },
  timePickerText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '500' },
  timePickerArrow: { color: colors.primary, fontSize: 16 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardLight, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.primaryBorder },
  typeChipIcon: { fontSize: 12, marginRight: 4 },
  typeChipText: { color: colors.text, fontSize: 11, fontWeight: '500' },

  submitButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: colors.bg, fontSize: 16, fontWeight: 'bold' },
});
