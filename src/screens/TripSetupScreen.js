import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView,
  StyleSheet, Animated, Pressable, KeyboardAvoidingView, Platform, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Calendar from '../components/Calendar';
import { useTravelContext } from '../context/TravelContext';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import TripMap from '../components/TripMap';
import { generateTripItinerary } from '../services/aiService';

const TRIP_TYPES = [
  { key: 'solo', label: 'Solo Trip', icon: 'solo', description: 'Just me, exploring the world', color: '#3B82F6' },
  { key: 'friends', label: 'With Friends', icon: 'friends', description: 'Adventure with my buddies', color: '#10B981' },
  { key: 'family', label: 'Family Trip', icon: 'family', description: 'Quality time with family', color: '#F59E0B' },
  { key: 'couple', label: 'Couple Trip', icon: 'couple', description: 'Romantic getaway for two', color: '#EC4899' },
  { key: 'business', label: 'Business Trip', icon: 'business', description: 'Work travel with leisure', color: '#8B5CF6' },
];

const TRIP_MODES = [
  { key: 'single-base', label: 'Single-Base Trip', icon: 'home', description: 'Stay in one city/location and explore around.' },
  { key: 'multi-city', label: 'Multi-City Trip', icon: 'map', description: 'Hopping between multiple cities or countries.' },
];

const POPULAR_DESTINATIONS = [
  { name: 'Paris', country: 'France', icon: 'location' },
  { name: 'Tokyo', country: 'Japan', icon: 'location' },
  { name: 'Bali', country: 'Indonesia', icon: 'beach' },
  { name: 'New York', country: 'USA', icon: 'building' },
  { name: 'Dubai', country: 'UAE', icon: 'building' },
  { name: 'London', country: 'UK', icon: 'location' },
];

const BUDGET_PRESETS = [
  { label: 'Budget', range: '$500 - $1,000', value: 750, icon: 'money' },
  { label: 'Moderate', range: '$1,000 - $3,000', value: 2000, icon: 'card' },
  { label: 'Luxury', range: '$3,000 - $5,000', value: 4000, icon: 'diamond' },
  { label: 'Premium', range: '$5,000+', value: 7500, icon: 'crown' },
];

export default function TripSetupScreen({ onComplete, onBack }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempFamilyCount, setTempFamilyCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);


  const [tripData, setTripData] = useState({
    mode: null, // 'multi-city' | 'single-base'
    stops: [], // For multi-city: [{id, name, ...}]
    origin: null,
    destination: '',
    destinationCoords: null,
    endLocation: null,
    startDate: '',
    endDate: '',
    tripType: '',
    budget: '',
    name: '',
    // Friends data
    friends: [],
    newFriendName: '',
    // Family data - redesigned for multiple families
    numberOfFamilies: 0,
    families: [], // Array of families, each with { familyName: '', members: [] }
    // Couple data
    partnerName: '',
    // Business data
    colleagues: [],
    newColleagueName: '',
  });

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const progressAnim = useState(new Animated.Value(0))[0];
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Dynamic steps based on trip type
  const getSteps = () => {
    // Step 0: Mode Selection
    if (!tripData.mode) {
      return [{ key: 'mode', title: 'Trip Style' }];
    }

    const baseSteps = [
      { key: 'mode', title: 'Trip Style' },
      { key: 'location', title: tripData.mode === 'multi-city' ? 'Destinations' : 'Route' },
      { key: 'details', title: 'Details' }, // Merged Type & Dates
    ];

    // Add companions step based on trip type
    if (tripData.tripType && tripData.tripType !== 'solo') {
      baseSteps.push({
        key: 'companions',
        title: getCompanionsTitle(),
        subtitle: getCompanionsSubtitle(),
        icon: getCompanionsIcon()
      });
    }

    return baseSteps;
  };

  const getCompanionsTitle = () => {
    switch (tripData.tripType) {
      case 'friends': return 'Add Friends';
      case 'family': return 'Family Members';
      case 'couple': return 'Your Partner';
      case 'business': return 'Colleagues';
      default: return 'Companions';
    }
  };

  const getCompanionsSubtitle = () => {
    switch (tripData.tripType) {
      case 'friends': return 'Who\'s coming with you?';
      case 'family': return 'Add your family members';
      case 'couple': return 'Add your partner\'s details';
      case 'business': return 'Add your travel colleagues';
      default: return 'Add your travel companions';
    }
  };

  const getCompanionsIcon = () => {
    switch (tripData.tripType) {
      case 'friends': return 'party';
      case 'family': return 'family';
      case 'couple': return 'couple';
      case 'business': return 'business';
      default: return 'group';
    }
  };

  const STEPS = getSteps();
  const totalSteps = STEPS.length;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: totalSteps > 0 ? (currentStep + 1) / totalSteps : 0,
      duration: 300,
      useNativeDriver: false
    }).start();
  }, [currentStep, totalSteps]);

  const animateStepChange = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (!isMounted.current) return;
      callback();
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  const { getUniqueTripCode } = useTravelContext();

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      animateStepChange(() => setCurrentStep(currentStep + 1));
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateStepChange(() => setCurrentStep(currentStep - 1));
    } else {
      onBack();
    }
  };

  const handleMagicBuild = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTripItinerary(
        tripData.destination,
        calculateDuration(tripData.startDate, tripData.endDate),
        tripData.budget
      );

      if (result.success) {
        // Here we would normally set the state with the result
        // For now, we will just proceed to complete with this "enriched" data
        // But since we are mocking, we will just call handleComplete and maybe pass extra data if possible
        // Ideally, we populate the context. For this iteration, let's just complete the trip.
        // In a real app, we would save the result.itinerary and result.expenses to the DB.

        // We will pass the AI result to handleComplete to be saved
        await handleComplete(result);
      }
    } catch (error) {
      Alert.alert('AI Error', 'Failed to generate itinerary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = async (aiData = null) => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      // For Multi-City, ensure we have a valid destination string for the DB/Context
      let finalDestination = tripData.destination;
      let finalName = tripData.name;

      if (tripData.mode === 'multi-city' && tripData.stops.length > 0) {
        // Use first stop or a combination
        const stopNames = tripData.stops.map(s => s.name || s.formatted_address.split(',')[0]).join(' - ');
        finalDestination = stopNames.length > 30 ? `${tripData.stops[0].name} & others` : stopNames;

        // Also ensure name is set
        if (!finalName) {
          finalName = `${tripData.stops[0].name} Multi-City Trip`;
        }
      }

      const tripCode = await getUniqueTripCode();

      // Prepare participants based on trip type - Include owner as first participant
      let participants = [
        {
          id: 'owner',
          name: user?.displayName || 'Organizer',
          userId: user?.uid,
          type: 'owner',
          familyGroup: tripData.tripType === 'family' ? 'Family 1' : null
        }
      ];

      switch (tripData.tripType) {
        case 'friends':
          participants = [...participants, ...tripData.friends.map(name => ({
            id: `fr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name,
            type: 'friend'
          }))];
          break;
        case 'family':
          participants = [...participants, ...tripData.families.flatMap(family =>
            family.members.map(member => ({
              ...member,
              id: `fam_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              familyGroup: family.familyName
            }))
          )];
          break;
        case 'couple':
          if (tripData.partnerName) {
            participants = [...participants, {
              id: `pt_${Date.now()}`,
              name: tripData.partnerName,
              type: 'partner'
            }];
          }
          break;
        case 'business':
          participants = [...participants, ...tripData.colleagues.map(name => ({
            id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name,
            type: 'colleague'
          }))];
          break;
      }

      // Log to verify data
      console.log('TripSetupScreen - completing with tripType:', tripData.tripType);

      onComplete({
        ...tripData,
        tripCode,
        participants,
        tripType: tripData.tripType,
        destination: finalDestination,
        name: finalName || `${finalDestination} Trip`,
        aiData: aiData // Pass AI data
      });
    } catch (error) {
      console.error('Trip Creation Error:', error);
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const isStepValid = () => {
    const step = STEPS[currentStep];
    if (!step) return false;

    switch (step.key) {
      case 'mode':
        return tripData.mode !== null;
      case 'location':
        if (tripData.mode === 'single-base') {
          return (
            tripData.origin &&
            (tripData.destination || '').trim().length > 0 &&
            tripData.endLocation
          );
        } else {
          return tripData.stops.length > 0;
        }
      case 'details':
        return tripData.tripType !== '' && tripData.startDate && tripData.endDate;
      case 'companions':
        if (tripData.tripType === 'couple') {
          return tripData.partnerName.trim().length > 0;
        }
        return true;
      default:
        return true;
    }
  };

  const selectDestination = (dest) => {
    setTripData({ ...tripData, destination: `${dest.name}, ${dest.country}` });
  };

  const selectTripType = (type) => {
    setTripData({
      ...tripData,
      tripType: type.key,
      // Reset companion data when changing type
      friends: [],
      familyMembers: [],
      partnerName: '',
      colleagues: [],
    });
  };

  const addFriend = () => {
    if (tripData.newFriendName.trim()) {
      setTripData({
        ...tripData,
        friends: [...tripData.friends, tripData.newFriendName.trim()],
        newFriendName: '',
      });
    }
  };

  const removeFriend = (index) => {
    setTripData({
      ...tripData,
      friends: tripData.friends.filter((_, i) => i !== index),
    });
  };

  const setNumberOfFamilies = (count) => {
    const families = [];
    for (let i = 0; i < count; i++) {
      families.push({
        familyName: `Family ${i + 1}`,
        members: [],
        newMemberName: '',
        newMemberRelation: '',
      });
    }
    setTripData({
      ...tripData,
      numberOfFamilies: count,
      families,
    });
  };

  const addFamilyMember = (familyIndex, name, relation) => {
    const updatedFamilies = [...tripData.families];
    updatedFamilies[familyIndex].members.push({
      name: name.trim(),
      relation: relation || 'Member',
    });
    updatedFamilies[familyIndex].newMemberName = '';
    updatedFamilies[familyIndex].newMemberRelation = '';
    setTripData({
      ...tripData,
      families: updatedFamilies,
    });
  };

  const removeFamilyMember = (familyIndex, memberIndex) => {
    const updatedFamilies = [...tripData.families];
    updatedFamilies[familyIndex].members = updatedFamilies[familyIndex].members.filter((_, i) => i !== memberIndex);
    setTripData({
      ...tripData,
      families: updatedFamilies,
    });
  };

  const updateFamilyInput = (familyIndex, field, value) => {
    const updatedFamilies = [...tripData.families];
    updatedFamilies[familyIndex][field] = value;
    setTripData({
      ...tripData,
      families: updatedFamilies,
    });
  };

  const addColleague = () => {
    if (tripData.newColleagueName.trim()) {
      setTripData({
        ...tripData,
        colleagues: [...tripData.colleagues, tripData.newColleagueName.trim()],
        newColleagueName: '',
      });
    }
  };

  const removeColleague = (index) => {
    setTripData({
      ...tripData,
      colleagues: tripData.colleagues.filter((_, i) => i !== index),
    });
  };

  const selectBudgetPreset = (preset) => {
    setTripData({ ...tripData, budget: preset.value.toString() });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    try {
      let startDate, endDate;

      // Handle Date objects
      if (start instanceof Date) startDate = start;
      else {
        // Parse "12 Jan 2024" format
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const parts = start.split(' ');
        startDate = new Date(parseInt(parts[2]), months.indexOf(parts[1]), parseInt(parts[0]));
      }

      if (end instanceof Date) endDate = end;
      else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const parts = end.split(' ');
        endDate = new Date(parseInt(parts[2]), months.indexOf(parts[1]), parseInt(parts[0]));
      }

      const diffTime = endDate - startDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0; // Return diffDays directly (0-indexed duration usually +1 but logic varies)
    } catch (e) {
      console.warn('Error calculating duration:', e);
      return 0;
    }
  };

  const renderStepContent = () => {
    const step = STEPS[currentStep];
    if (!step) return null; // Safety guard

    switch (step.key) {
      case 'mode':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What kind of trip is this?</Text>
            <View style={styles.tripTypeGrid}>
              {TRIP_MODES.map((mode) => (
                <Pressable
                  key={mode.key}
                  style={({ pressed }) => [
                    styles.tripTypeCard,
                    tripData.mode === mode.key && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setTripData(prev => ({ ...prev, mode: mode.key }))}
                >
                  <View style={[styles.tripTypeIconBg, { backgroundColor: colors.primary + '20' }]}>
                    <Icon name={mode.icon} size={28} color={colors.primary} />
                  </View>
                  <View style={styles.tripTypeInfo}>
                    <Text style={styles.tripTypeLabel}>{mode.label}</Text>
                    <Text style={styles.tripTypeDesc}>{mode.description}</Text>
                  </View>
                  {tripData.mode === mode.key && (
                    <View style={[styles.tripTypeCheck, { backgroundColor: colors.primary }]}>
                      <Icon name="check" size={14} color="#FFF" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 'location':
        if (tripData.mode === 'multi-city') {
          return (
            <View style={styles.fullScreenContent}>
              {/* Map Section - Top 60% */}
              <View style={styles.fullMapSection}>
                <TripMap
                  stops={tripData.stops}
                  mode="multi-city"
                  style={{ height: '100%', width: '100%' }}
                />
                {/* Floating Badge */}
                <View style={styles.floatingCityBadge}>
                  <Text style={styles.badgeText}>{tripData.stops.length} Cities</Text>
                </View>
              </View>

              {/* Controls Section - Bottom 40% */}
              <View style={styles.fullControlsSection}>
                <View style={styles.plannerHeader}>
                  <Text style={styles.plannerTitle}>Route Planner</Text>
                  <Text style={styles.plannerSubtitle}>Build your dream itinerary by adding cities in order.</Text>
                </View>

                <View style={{ zIndex: 3000, marginVertical: 15 }}>
                  <PlacesAutocomplete
                    placeholder="Where to next?"
                    onPlaceSelect={(place) => {
                      if (place) {
                        setTripData(prev => ({
                          ...prev,
                          stops: [...prev.stops, place]
                        }));
                      }
                    }}
                    showMap={false}
                    clearOnSelect={true}
                  />
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  style={{ flex: 1 }}
                >
                  {tripData.stops.map((stop, index) => (
                    <View key={index} style={styles.premiumStopCard}>
                      <View style={styles.premiumStopNumber}>
                        <Text style={styles.premiumStopNumberText}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1, paddingHorizontal: 16 }}>
                        <Text style={styles.premiumStopName}>{stop.name || stop.fullAddress.split(',')[0]}</Text>
                        <Text style={styles.premiumStopAddress} numberOfLines={1}>{stop.fullAddress}</Text>
                      </View>
                      <Pressable
                        onPress={() => setTripData(prev => ({ ...prev, stops: prev.stops.filter((_, i) => i !== index) }))}
                        style={styles.premiumRemoveBtn}
                      >
                        <Icon name="close" size={14} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}

                  {tripData.stops.length === 0 && (
                    <View style={styles.emptyStateContainer}>
                      <Icon name="location" size={40} color={colors.textMuted} />
                      <Text style={styles.emptyStateText}>No destinations added</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          );
        }

        return (
          <View style={styles.stepContent}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 16, zIndex: 3000 }}>
                <Text style={styles.inputLabel}>Departure City</Text>
                <PlacesAutocomplete
                  value={tripData.origin?.name || tripData.origin?.fullAddress || ''}
                  onPlaceSelect={(place) => setTripData(prev => ({ ...prev, origin: place }))}
                  placeholder="Where are you starting?"
                  showMap={false}
                />
              </View>

              <View style={{ marginBottom: 16, zIndex: 2000 }}>
                <Text style={styles.inputLabel}>Main Location to Visit</Text>
                <PlacesAutocomplete
                  value={tripData.destination}
                  onPlaceSelect={(place) => {
                    if (place) {
                      setTripData(prev => ({
                        ...prev,
                        destination: place.name || place.fullAddress,
                        destinationCoords: place
                      }));
                    }
                  }}
                  placeholder="Search destination..."
                  showMap={false}
                />
              </View>

              <View style={{ marginBottom: 16, zIndex: 1000 }}>
                <Text style={styles.inputLabel}>Trip End Location</Text>
                <PlacesAutocomplete
                  value={tripData.endLocation?.name || tripData.endLocation?.fullAddress || ''}
                  onPlaceSelect={(place) => setTripData(prev => ({ ...prev, endLocation: place }))}
                  placeholder="Where will you end up?"
                  showMap={false}
                />
              </View>

              <Text style={[styles.inputHelper, { marginTop: 20, textAlign: 'center', color: colors.primary }]}>
                You can edit all information after creating the trip.
              </Text>
            </ScrollView>
          </View>
        );

      case 'details':
        const selectedType = TRIP_TYPES.find(t => t.key === tripData.tripType);
        return (
          <View style={styles.stepContent}>
            {/* Trip Type Dropdown */}
            <View style={{ zIndex: 5000, marginBottom: 20 }}>
              <Text style={styles.inputLabel}>Trip Type</Text>
              <Pressable
                style={[styles.dropdownTrigger, showTypeDropdown && styles.dropdownTriggerActive]}
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {selectedType ? (
                    <>
                      <View style={[styles.dropdownIconBg, { backgroundColor: selectedType.color + '20' }]}>
                        <Icon name={selectedType.icon} size={20} color={selectedType.color} />
                      </View>
                      <Text style={styles.dropdownValue}>{selectedType.label}</Text>
                    </>
                  ) : (
                    <Text style={[styles.dropdownValue, { color: colors.textMuted }]}>Select Trip Type</Text>
                  )}
                </View>
                <Icon name={showTypeDropdown ? "arrow-up" : "arrow-down"} size={20} color={colors.textMuted} />
              </Pressable>

              {showTypeDropdown && (
                <View style={styles.dropdownMenu}>
                  {TRIP_TYPES.map((type) => (
                    <Pressable
                      key={type.key}
                      style={styles.dropdownItem}
                      onPress={() => {
                        selectTripType(type);
                        setShowTypeDropdown(false);
                      }}
                    >
                      <View style={[styles.dropdownIconBg, { backgroundColor: type.color + '20', width: 32, height: 32 }]}>
                        <Icon name={type.icon} size={16} color={type.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                        <Text style={[styles.dropdownItemLabel, { color: colors.text, fontSize: 16 }]} numberOfLines={1}>{type.label}</Text>
                        <Text style={[styles.dropdownItemDesc, { color: colors.textMuted, fontSize: 13 }]} numberOfLines={1}>{type.description}</Text>
                      </View>
                      <View style={{ width: 20 }}>
                        {tripData.tripType === type.key && (
                          <Icon name="check" size={14} color={colors.primary} />
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Dates Selection */}
            <View>
              <Text style={styles.inputLabel}>When are you going?</Text>
              <Pressable
                style={styles.dateInputBtn}
                onPress={() => setShowCalendar(true)}
              >
                <Icon name="calendar" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.dateInputHtml, !tripData.startDate && { color: colors.textMuted }]}>
                    {tripData.startDate && tripData.endDate
                      ? `${typeof tripData.startDate === 'string' ? tripData.startDate : tripData.startDate.toLocaleDateString()} → ${typeof tripData.endDate === 'string' ? tripData.endDate : tripData.endDate.toLocaleDateString()}`
                      : 'Select Trip Duration'}
                  </Text>
                  {tripData.startDate && tripData.endDate && (
                    <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 }}>
                      {calculateDuration(tripData.startDate, tripData.endDate)} Day Journey
                    </Text>
                  )}
                </View>
              </Pressable>
            </View>

            <Calendar
              visible={showCalendar}
              onClose={() => setShowCalendar(false)}
              onSelect={(start, end) => {
                setTripData({ ...tripData, startDate: start, endDate: end });
              }}
              mode="range"
              initialStartDate={tripData.startDate}
              initialEndDate={tripData.endDate}
            />
          </View>
        );

      case 'companions':
        return renderCompanionsContent();

      default:
        return null;
    }
  };

  const getTravelersCount = () => {
    let count = 1; // Self
    switch (tripData.tripType) {
      case 'friends': count += tripData.friends.length; break;
      case 'family': count += tripData.familyMembers.length; break;
      case 'couple': count += tripData.partnerName ? 1 : 0; break;
      case 'business': count += tripData.colleagues.length; break;
    }
    return count;
  };

  const renderCompanionsContent = () => {
    switch (tripData.tripType) {
      case 'friends':
        return (
          <View style={styles.stepContent}>
            {/* Add Friend Input */}
            <View style={styles.addCompanionSection}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconBg}>
                  <Icon name="profile" size={20} color={colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.mainInput, { outlineStyle: 'none' }]}
                  placeholder="Enter friend's name"
                  placeholderTextColor={colors.textMuted}
                  value={tripData.newFriendName}
                  onChangeText={(text) => setTripData({ ...tripData, newFriendName: text })}
                  onSubmitEditing={addFriend}
                />
                <Pressable
                  style={[styles.addBtn, !tripData.newFriendName.trim() && styles.addBtnDisabled]}
                  onPress={addFriend}
                  disabled={!tripData.newFriendName.trim()}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Friends List */}
            <View style={styles.companionsList}>
              <Text style={styles.companionsListTitle}>
                🎉 Friends ({tripData.friends.length})
              </Text>
              {tripData.friends.length === 0 ? (
                <View style={styles.emptyCompanions}>
                  <Icon name="group" size={40} color={colors.textMuted + '50'} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>No friends added yet</Text>
                  <Text style={styles.emptyHint}>Add friends who are joining this trip</Text>
                </View>
              ) : (
                tripData.friends.map((friend, index) => (
                  <View key={index} style={styles.companionCard}>
                    <View style={styles.companionAvatar}>
                      <Text style={styles.companionAvatarText}>{friend.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.companionName}>{friend}</Text>
                    <Pressable style={styles.removeBtn} onPress={() => removeFriend(index)}>
                      <Icon name="close" size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {/* Skip Note */}
            <View style={styles.skipNote}>
              <Text style={styles.skipNoteText}>💡 You can add more friends later from the trip dashboard</Text>
            </View>
          </View>
        );

      case 'family':
        if (tripData.numberOfFamilies === 0) {
          return (
            <View style={styles.stepContent}>
              <View style={styles.familyCountContainer}>
                <Icon name="family" size={60} color={colors.primary} style={{ marginBottom: 16 }} />
                <Text style={styles.familyCountTitle}>How many families are joining?</Text>
                <Text style={styles.familyCountSubtitle}>Including your own family</Text>

                <View style={styles.countControl}>
                  <Pressable
                    style={[styles.countBtn, tempFamilyCount <= 1 && styles.countBtnDisabled]}
                    onPress={() => setTempFamilyCount(Math.max(1, tempFamilyCount - 1))}
                    disabled={tempFamilyCount <= 1}
                  >
                    <Text style={styles.countBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.countValue}>{tempFamilyCount}</Text>
                  <Pressable
                    style={styles.countBtn}
                    onPress={() => setTempFamilyCount(tempFamilyCount + 1)}
                  >
                    <Text style={styles.countBtnText}>+</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={styles.confirmCountBtn}
                  onPress={() => setNumberOfFamilies(tempFamilyCount)}
                >
                  <Text style={styles.confirmCountText}>Continue</Text>
                </Pressable>
              </View>
            </View>
          );
        }

        return (
          <ScrollView style={styles.familiesScroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.stepContent, { paddingBottom: 100 }]}>
              <View style={styles.familiesHeaderRow}>
                <Text style={styles.familiesTitle}>Families ({tripData.numberOfFamilies})</Text>
                <Pressable onPress={() => setNumberOfFamilies(0)}>
                  <Text style={styles.changeCountText}>Change</Text>
                </Pressable>
              </View>

              {tripData.families.map((family, fIndex) => (
                <View key={fIndex} style={styles.familySection}>
                  <Text style={styles.familySectionTitle}>{family.familyName}</Text>

                  {/* Add Member Input for this family */}
                  <View style={styles.familyInputRow}>
                    <View style={[styles.inputContainer, styles.familyNameInput]}>
                      <TextInput
                        style={[styles.familyInput, { outlineStyle: 'none' }]}
                        placeholder="Name"
                        placeholderTextColor={colors.textMuted}
                        value={family.newMemberName}
                        onChangeText={(text) => updateFamilyInput(fIndex, 'newMemberName', text)}
                      />
                    </View>
                    <Pressable
                      style={[styles.addBtnFamily, !family.newMemberName?.trim() && styles.addBtnDisabled]}
                      onPress={() => addFamilyMember(fIndex, family.newMemberName, 'Family Member')}
                      disabled={!family.newMemberName?.trim()}
                    >
                      <Text style={styles.addBtnText}>+</Text>
                    </Pressable>
                  </View>

                  {/* Members List for this family */}
                  <View style={styles.familyMembersList}>
                    {family.members.length === 0 ? (
                      <Text style={styles.emptyFamilyText}>No members added yet</Text>
                    ) : (
                      family.members.map((member, mIndex) => (
                        <View key={mIndex} style={styles.familyMemberCard}>
                          <View style={styles.familyMemberInfo}>
                            <Text style={styles.familyMemberName}>{member.name}</Text>
                            <Text style={styles.familyMemberRelation}>{member.relation}</Text>
                          </View>
                          <Pressable
                            style={styles.removeMemberBtn}
                            onPress={() => removeFamilyMember(fIndex, mIndex)}
                          >
                            <Icon name="close" size={14} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        );

      case 'couple':
        return (
          <View style={styles.stepContent}>
            <View style={styles.coupleSection}>
              <View style={styles.coupleIllustration}>
                <Icon name="couple" size={60} color={colors.primary} />
              </View>
              <Text style={styles.coupleTitle}>Traveling with your partner?</Text>
              <Text style={styles.coupleSubtitle}>Add their name to share this trip</Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputIconBg}>
                  <Icon name="heart" size={20} color={colors.primary} />
                </View>
                <TextInput
                  style={[styles.mainInput, { outlineStyle: 'none' }]}
                  placeholder="Partner's name"
                  placeholderTextColor={colors.textMuted}
                  value={tripData.partnerName}
                  onChangeText={(text) => setTripData({ ...tripData, partnerName: text })}
                />
              </View>
            </View>
          </View>
        );

      case 'business':
        return (
          <View style={styles.stepContent}>
            {/* Add Colleague Input */}
            <View style={styles.addCompanionSection}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconBg}>
                  <Icon name="business" size={20} color={colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.mainInput, { outlineStyle: 'none' }]}
                  placeholder="Enter colleague's name"
                  placeholderTextColor={colors.textMuted}
                  value={tripData.newColleagueName}
                  onChangeText={(text) => setTripData({ ...tripData, newColleagueName: text })}
                  onSubmitEditing={addColleague}
                />
                <Pressable
                  style={[styles.addBtn, !tripData.newColleagueName.trim() && styles.addBtnDisabled]}
                  onPress={addColleague}
                  disabled={!tripData.newColleagueName.trim()}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Colleagues List */}
            <View style={styles.companionsList}>
              <Text style={styles.companionsListTitle}>
                💼 Colleagues ({tripData.colleagues.length})
              </Text>
              {tripData.colleagues.length === 0 ? (
                <View style={styles.emptyCompanions}>
                  <Icon name="business" size={40} color={colors.textMuted + '50'} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>No colleagues added yet</Text>
                  <Text style={styles.emptyHint}>Add colleagues joining this business trip</Text>
                </View>
              ) : (
                tripData.colleagues.map((colleague, index) => (
                  <View key={index} style={styles.companionCard}>
                    <View style={styles.companionAvatar}>
                      <Text style={styles.companionAvatarText}>{colleague.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.companionName}>{colleague}</Text>
                    <Pressable style={styles.removeBtn} onPress={() => removeColleague(index)}>
                      <Icon name="close" size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {/* Skip Note */}
            <View style={styles.skipNote}>
              <Text style={styles.skipNoteText}>💡 You can add more colleagues later</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[
          styles.header,
          STEPS[currentStep]?.key === 'location' && tripData.mode === 'multi-city' ? {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 5000,
            backgroundColor: 'transparent',
            borderBottomWidth: 0,
          } : {}
        ]}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Icon name="back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.stepIndicator}>Step {currentStep + 1} of {totalSteps}</Text>
            {/* Tiny Pill Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>



        {/* Step Header - Hidden for location step and family companions */}
        {STEPS[currentStep] && !((STEPS[currentStep].key === 'location') || (STEPS[currentStep].key === 'companions' && tripData.tripType === 'family')) && (
          <Animated.View style={[styles.stepHeader, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.stepIconBg}>
              <Icon name={STEPS[currentStep]?.icon || 'star'} size={32} color={colors.primary} />
            </View>
            <Text style={styles.stepTitle}>{STEPS[currentStep]?.title}</Text>
            <Text style={styles.stepSubtitle}>{STEPS[currentStep]?.subtitle}</Text>
          </Animated.View>
        )}

        {/* Content */}
        {STEPS[currentStep]?.key === 'location' && tripData.mode === 'multi-city' ? (
          <View style={{ flex: 1 }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {renderStepContent()}
            </Animated.View>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {renderStepContent()}
            </Animated.View>
          </ScrollView>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              !isStepValid() && styles.nextButtonDisabled,
              pressed && isStepValid() && { opacity: 0.9, transform: [{ scale: 0.98 }] }
            ]}
            onPress={handleNext}
            disabled={!isStepValid() || isCreating}
          >
            <Text style={styles.nextButtonText}>
              {STEPS.length > 0 && currentStep === STEPS.length - 1 ? (isCreating ? 'Creating...' : '🚀 Create Trip') : 'Continue'}
            </Text>
            {STEPS.length > 0 && currentStep < STEPS.length - 1 && <Text style={styles.nextButtonIcon}>→</Text>}
          </Pressable>
        </View>

        {/* Date Pickers */}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  backButtonText: {
    fontSize: 22,
    color: colors.text,
  },
  headerCenter: {
    alignItems: 'center',
  },
  stepIndicator: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    width: 44,
  },
  progressContainer: {
    paddingHorizontal: 0,
    marginTop: 6,
    width: 60,
    alignSelf: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.cardLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  stepIconBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  stepIcon: {
    fontSize: 36,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepContent: {
    flex: 1,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  inputIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputIcon: {
    fontSize: 20,
  },
  mainInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 10,
  },
  clearButtonText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  suggestionsSection: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
  },
  destinationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  destinationCard: {
    width: '31%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  destinationCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  destinationEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  destinationName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  destinationCountry: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  datesSection: {
    marginBottom: 24,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  dateCardEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  dateCardContent: {
    flex: 1,
  },
  dateCardLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },

  dateCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dateCardPlaceholder: {
    color: colors.textMuted,
  },
  dateArrowContainer: {
    paddingHorizontal: 4,
  },
  dateArrow: {
    fontSize: 18,
    color: colors.textMuted,
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  durationIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  tripTypeGrid: {
    gap: 12,
  },
  tripTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
    borderLeftWidth: 4,
  },
  tripTypeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  tripTypeIconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripTypeEmoji: {
    fontSize: 24,
  },
  tripTypeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  tripTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tripTypeDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  tripTypeCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryBorder,
  },
  tripTypeCheckText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addCompanionSection: {
    marginBottom: 20,
  },
  familyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  familyNameInput: {
    flex: 1,
  },
  familyInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnSmall: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnFamily: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: colors.bg,
    fontSize: 18,
    fontWeight: 'bold',
  },
  companionsList: {
    marginBottom: 20,
  },
  // Family Count UI
  familyCountContainer: {
    alignItems: 'center',
    marginVertical: 40,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 30,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  familyCountEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  familyCountTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  familyCountSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 30,
  },
  countControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  countBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBtnDisabled: {
    opacity: 0.3,
  },
  countBtnText: {
    fontSize: 28,
    color: colors.text,
    fontWeight: 'bold',
  },
  countValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
    minWidth: 50,
    textAlign: 'center',
  },
  confirmCountBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  confirmCountText: {
    color: colors.bg,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Family Sections UI
  familiesScroll: {
    flex: 1,
  },
  familiesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  familiesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  inputHelper: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: -4,
  },
  changeCountText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  familySection: {
    marginBottom: 30,
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  familySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  quickRelationsScroll: {
    flexGrow: 0,
    marginBottom: 20,
  },
  familyMembersList: {
    marginTop: 10,
  },
  emptyFamilyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  familyMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  familyMemberInfo: {
    flex: 1,
  },
  familyMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  familyMemberRelation: {
    fontSize: 13,
    color: colors.textMuted,
  },
  removeMemberBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  removeMemberText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  companionsListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  emptyCompanions: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
  },
  companionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  companionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  companionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companionName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  companionRelation: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  skipNote: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  skipNoteText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  coupleSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  coupleIllustration: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
  },
  coupleEmoji: {
    fontSize: 50,
  },
  coupleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  coupleSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
  },
  budgetInputSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  budgetCurrency: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
  },
  budgetInput: {
    fontSize: 56,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    minWidth: 150,
  },
  presetsSection: {
    marginTop: 24,
  },
  presetsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    textAlign: 'center',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryBorder,
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  presetEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  presetLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  presetLabelActive: {
    color: colors.primary,
  },
  presetRange: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  presetRangeActive: {
    color: colors.primary,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryBorder,
  },
  summaryEmoji: {
    fontSize: 22,
    marginRight: 14,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  tipEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.primaryBorder,
    backgroundColor: colors.bg,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10, // More compact
    gap: 6,
    width: '80%', // Even smaller width
    alignSelf: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.bg,
  },
  nextButtonIcon: {
    fontSize: 18,
    color: colors.bg,
  },
  dateInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  dateInputHtml: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6', // Violet color for AI
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 20,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  aiButtonIcon: {
    fontSize: 18,
  },
  // Full Screen Layout Styles
  fullScreenContent: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  fullMapSection: {
    height: '60%',
    width: '100%',
    position: 'relative',
    backgroundColor: colors.cardLight,
  },
  floatingCityBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  fullControlsSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 36, // Smoother curve
    borderTopRightRadius: 36, // Smoother curve
    marginTop: -36, // Deeper overlay
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  plannerHeader: {
    marginBottom: 0,
  },
  plannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  plannerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
    lineHeight: 14,
  },
  premiumStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  premiumStopNumber: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumStopNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  premiumStopName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  premiumStopAddress: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  premiumRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    opacity: 0.3,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '600',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  dropdownTriggerActive: {
    borderColor: colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.primaryBorder + '50',
  },
  dropdownItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  dropdownItemDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
