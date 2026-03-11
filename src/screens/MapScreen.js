import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Modal, StyleSheet, Animated, Dimensions, Image, ActivityIndicator, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTravelContext } from '../context/TravelContext';
import { useTheme } from '../context/ThemeContext';
import TimePickerModal from '../components/TimePickerModal';
import Icon from '../components/Icon';
import { getTravelLogistics } from '../services/transitService';
import { getLogistics, saveLogistics } from '../services/databaseService';

const { width } = Dimensions.get('window');

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
  const { itinerary, addItineraryItem, deleteItineraryItem, updateItineraryItem, tripInfo, getAllTravelers, setItinerary, checkFeatureAccess, addFoodItem, foodItems, setFoodItems, addPackingItem, packingItems, setPackingItems, setBudget } = useTravelContext();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [newStop, setNewStop] = useState({
    name: '', type: 'attraction', dayNumber: 1, time: '', notes: '', location: '',
    duration: '', cost: ''
  });


  const scrollViewRef = useRef(null);
  const floatAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  // --- Travel Logistics State ---
  const [logisticsData, setLogisticsData] = useState({});
  const [logisticsLoading, setLogisticsLoading] = useState({});

  const tripDays = useMemo(() => generateDays(tripInfo.startDate, tripInfo.endDate), [tripInfo.startDate, tripInfo.endDate]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Load all logistics for this trip once on mount
  useEffect(() => {
    if (tripInfo.id) {
      getLogistics(tripInfo.id).then(data => {
        if (data) setLogisticsData(data);
      });
    }
  }, [tripInfo.id]);

  // Fetch logistics whenever the selected day or its stops change
  useEffect(() => {
    const day = tripDays[selectedDayIndex];
    if (!day) return;
    const dayStops = getStopsForDay(day.dayNumber);
    if (dayStops.length < 2) return;

    dayStops.forEach((stop, i) => {
      if (i >= dayStops.length - 1) return;
      const next = dayStops[i + 1];
      const key = `${stop.id}-${next.id}`;
      // Skip if already fetched or currently loading
      if (logisticsData[key] || logisticsLoading[key]) return;

      // Only fetch if at least one stop has a location or name
      if (!(stop.location || stop.name) || !(next.location || next.name)) return;

      setLogisticsLoading(prev => ({ ...prev, [key]: true }));
      getTravelLogistics(stop, next).then(data => {
        // Now always storing data even if it contains an error object
        if (data) {
          setLogisticsData(prev => ({ ...prev, [key]: data }));
          // Persist to DB (for errors we might want to retry later, but for now we save the state)
          if (tripInfo.id) saveLogistics(tripInfo.id, key, data);
        }
        setLogisticsLoading(prev => ({ ...prev, [key]: false }));
      }).catch(err => {
        console.error('[MapScreen] Logistics fetch error:', err);
        setLogisticsData(prev => ({ ...prev, [key]: { error: 'NETWORK_FAIL' } }));
        setLogisticsLoading(prev => ({ ...prev, [key]: false }));
      });
    });
  }, [selectedDayIndex, itinerary]);

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

        {/* Day Selector (Horizontal Pill List) */}
        {tripDays.length > 0 && totalStops > 0 && (
          <View style={styles.daySelectorContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daySelectorScroll}
            >
              {tripDays.map((day, index) => {
                const isActive = index === selectedDayIndex;
                const stopsForDay = getStopsForDay(day.dayNumber);
                const hasStops = stopsForDay.length > 0;
                return (
                  <TouchableOpacity
                    key={day.dayNumber}
                    style={[styles.dayPill, isActive && styles.dayPillActive]}
                    onPress={() => setSelectedDayIndex(index)}
                  >
                    <Text style={[styles.dayPillNumber, isActive && styles.dayPillNumberActive]}>{day.dayNumber}</Text>
                    <Text style={[styles.dayPillLabel, isActive && styles.dayPillLabelActive]}>Day</Text>
                    {hasStops && (
                      <View style={[styles.dayPillBadge, isActive && styles.dayPillBadgeActive]}>
                        <Text style={[styles.dayPillBadgeText, isActive && styles.dayPillBadgeTextActive]}>{stopsForDay.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timeline}>
          {tripDays.length > 0 && totalStops > 0 && (() => {
            // Render only the currently selected day
            const day = tripDays[selectedDayIndex] || tripDays[0];
            const dayIndex = selectedDayIndex;
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
                          const nextStop = !isLast ? dayStops[stopIndex + 1] : null;
                          const logisticsKey = nextStop ? `${stop.id}-${nextStop.id}` : null;
                          const logistics = logisticsKey ? logisticsData[logisticsKey] : null;
                          const isLoadingLogistics = logisticsKey ? logisticsLoading[logisticsKey] : false;

                          return (
                            <React.Fragment key={stop.id}>
                              <View style={styles.stopWrapper}>
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

                                  {stop.notes && (
                                    <View style={styles.stopNotesContainer}>
                                      <Text style={styles.stopNotes}>{stop.notes}</Text>
                                    </View>
                                  )}
                                </View>
                              </View>

                              {/* === Smart Travel Logistics Card === */}
                              {!isLast && logistics && (
                                <View style={styles.logisticsCard}>
                                  <View style={styles.logisticsTimeline}>
                                    <View style={styles.logisticsDot} />
                                    <View style={styles.logisticsDash} />
                                    <View style={styles.logisticsDot} />
                                  </View>
                                  <View style={styles.logisticsContent}>
                                    <View style={styles.logisticsHeader}>
                                      <Text style={styles.logisticsLabel}>ROUTE INFO</Text>
                                      <View style={styles.logisticsActions}>
                                        {logistics.distance && <Text style={styles.logisticsDistance}>📏 {logistics.distance}</Text>}
                                        <TouchableOpacity
                                          style={styles.logisticsNavBtn}
                                          onPress={() => {
                                            const getQuery = (s) => {
                                              const parts = [];
                                              if (s.name) parts.push(s.name);
                                              if (s.location) parts.push(s.location);
                                              return encodeURIComponent(parts.join(', '));
                                            };
                                            const originStr = getQuery(stop);
                                            const destStr = getQuery(nextStop);
                                            Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}`);
                                          }}
                                        >
                                          <Text style={styles.logisticsNavBtnText}>🗺️ Navigate</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                    {logistics.error === 'CORS_BLOCK' && (
                                      <View style={styles.logisticsErrorContainer}>
                                        <Text style={styles.logisticsErrorText}>⚠️ Browser Limitation Detected</Text>
                                        <Text style={styles.logisticsErrorSubtext}>Google APIs are blocked on localhost in browsers. This will work on a real phone!</Text>
                                      </View>
                                    )}
                                    {logistics.error === 'NO_ROUTE' && (
                                      <View style={[styles.logisticsErrorContainer, { backgroundColor: colors.textMuted + '10', borderColor: colors.textMuted + '25' }]}>
                                        <Text style={[styles.logisticsErrorText, { color: colors.textMuted }]}>📍 Route details unavailable</Text>
                                        <Text style={styles.logisticsErrorSubtext}>Targets may be too close or no road data found. Walking is likely the best option.</Text>
                                      </View>
                                    )}
                                    {logistics.error === 'NETWORK_FAIL' && (
                                      <View style={[styles.logisticsErrorContainer, { backgroundColor: '#FF634715', borderColor: '#FF634730' }]}>
                                        <Text style={[styles.logisticsErrorText, { color: '#FF6347' }]}>📡 Network Timeout</Text>
                                        <Text style={styles.logisticsErrorSubtext}>Could not connect to Google Maps. Re-trying might help or check your internet.</Text>
                                      </View>
                                    )}
                                    <View style={styles.logisticsModes}>
                                      {logistics.driving && (
                                        <View style={styles.logisticsMode}>
                                          <Text style={styles.logisticsModeIcon}>🚕</Text>
                                          <Text style={styles.logisticsModeTime}>{logistics.driving.duration}</Text>
                                          <Text style={styles.logisticsModeLabel}>taxi</Text>
                                        </View>
                                      )}
                                      {logistics.transit && (
                                        <View style={styles.logisticsMode}>
                                          <Text style={styles.logisticsModeIcon}>🚌</Text>
                                          <Text style={styles.logisticsModeTime}>{logistics.transit.duration}</Text>
                                          <Text style={styles.logisticsModeLabel}>transit</Text>
                                        </View>
                                      )}
                                      {logistics.walking && (
                                        <View style={styles.logisticsMode}>
                                          <Text style={styles.logisticsModeIcon}>🚶</Text>
                                          <Text style={styles.logisticsModeTime}>{logistics.walking.duration}</Text>
                                          <Text style={styles.logisticsModeLabel}>walk</Text>
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                </View>
                              )}
                              {!isLast && isLoadingLogistics && !logistics && (
                                <View style={styles.logisticsCard}>
                                  <View style={styles.logisticsTimeline}>
                                    <View style={styles.logisticsDot} />
                                    <View style={styles.logisticsDash} />
                                    <View style={styles.logisticsDot} />
                                  </View>
                                  <View style={styles.logisticsContent}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={styles.logisticsLoadingText}>Calculating route...</Text>
                                  </View>
                                </View>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })()}
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

  // Smart Travel Logistics
  logisticsCard: {
    flexDirection: 'row',
    marginLeft: 14,
    marginVertical: 6,
    paddingLeft: 10,
  },
  logisticsTimeline: {
    alignItems: 'center',
    width: 20,
    paddingVertical: 4,
  },
  logisticsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary + '60',
  },
  logisticsDash: {
    width: 1.5,
    flex: 1,
    backgroundColor: colors.primary + '30',
    marginVertical: 2,
    borderRadius: 1,
  },
  logisticsContent: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary + '40',
  },
  logisticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logisticsLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  logisticsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logisticsDistance: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  logisticsNavBtn: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  logisticsNavBtnText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  logisticsModes: {
    flexDirection: 'row',
    gap: 12,
  },
  logisticsMode: {
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 64,
  },
  logisticsModeIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  logisticsModeTime: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  logisticsModeLabel: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logisticsLoadingText: {
    color: colors.textMuted,
    fontSize: 11,
    marginLeft: 8,
  },
  logisticsErrorContainer: {
    marginVertical: 4,
    padding: 10,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  logisticsErrorText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  logisticsErrorSubtext: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },

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
