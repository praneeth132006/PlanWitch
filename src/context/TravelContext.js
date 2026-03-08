import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { generateUniqueTripCode } from '../utils/tripCodeGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { usePremium } from './PremiumContext';
import * as DB from '../services/databaseService';
// DB imports include softDeleteTrip now
import { auth } from '../config/firebase';

const DEFAULT_CATEGORIES = [
  { key: 'accommodation', label: 'Stay', icon: 'stay', color: '#8B5CF6', tip: '30-40%' },
  { key: 'transport', label: 'Transport', icon: 'transport', color: '#3B82F6', tip: '15-25%' },
  { key: 'food', label: 'Food', icon: 'food', color: '#F59E0B', tip: '20-30%' },
  { key: 'activities', label: 'Activities', icon: 'activities', color: '#10B981', tip: '10-15%' },
  { key: 'shopping', label: 'Shopping', icon: 'shopping', color: '#EC4899', tip: '5-10%' },
  { key: 'other', label: 'Other', icon: 'other', color: '#6B7280', tip: '5-10%' },
];

const currencies = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
];

const TravelContext = createContext(null);

export const useTravelContext = () => {
  const context = useContext(TravelContext);
  if (!context) {
    return {
      tripInfo: {},
      budget: { total: 0 },
      expenses: [],
      packingItems: [],
      itinerary: [],
      tripHistory: [],
      allTrips: [],
      currency: currencies[0],
      currencies,
      setTripInfo: () => { },
      setBudget: () => { },
      setExpenses: () => { },
      addExpense: () => { },
      setPackingItems: () => { },
      foodItems: [],
      addFoodItem: () => { },
      toggleFoodItem: () => { },
      deleteFoodItem: () => { },
      setItinerary: () => { },
      setCurrency: () => { },
      clearTrip: async () => { },
      deleteTripFromHistory: () => { },
      tripPreferences: {},
      userPlan: 'free',
      saveTripPreferences: () => { },
      CONSTANTS: { FREE_TRIP_LIMIT: 3, FREE_TRAVELER_LIMIT: 5 },
      checkFeatureAccess: () => true,
    };
  }
  return context;
};

export const TravelProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // --- State ---
  const [tripInfo, setTripInfoState] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    name: '',
    participants: [],
    tripCode: '',
    tripType: '',
    isCompleted: false,
  });

  const [budget, setBudgetState] = useState({ total: 0, categories: {} });
  const [expenses, setExpenses] = useState([]);
  const [packingItems, setPackingItems] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [allTrips, setAllTrips] = useState([]);
  const [currency, setCurrencyState] = useState(currencies[0]);
  const [customCategories, setCustomCategories] = useState(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);
  const [tripOwnerId, setTripOwnerId] = useState(null);

  // Ref to store real-time listener unsubscribe functions
  const unsubscribersRef = useRef({});

  // Cleanup function for real-time listeners
  const cleanupListeners = () => {
    Object.values(unsubscribersRef.current).forEach(unsub => {
      if (typeof unsub === 'function') {
        unsub();
      }
    });
    unsubscribersRef.current = {};
    // console.log('[Context] Cleaned up real-time listeners');
  };

  const setupRealTimeListeners = (id, owner) => {
    // 1. Clean up existing listeners if any
    cleanupListeners();

    if (!id || !isAuthenticated) return;

    // console.log('[Context] Setting up real-time listeners for trip:', id, 'owned by:', owner);

    // A. Subscribe to trip info changes
    unsubscribersRef.current.info = DB.subscribeToTripInfo(id, (data) => {
      if (data) {
        setTripInfoState(prev => ({ ...prev, ...data }));
      }
    });

    // B. Subscribe to expenses
    unsubscribersRef.current.expenses = DB.subscribeToExpenses(id, owner, (data) => {
      setExpenses(data || []);
    });

    // C. Subscribe to budget
    unsubscribersRef.current.budget = DB.subscribeToBudget(id, owner, (data) => {
      setBudgetState(data || { total: 0, categories: {} });
    });

    // D. Subscribe to itinerary
    unsubscribersRef.current.itinerary = DB.subscribeToItinerary(id, owner, (data) => {
      setItinerary(data || []);
    });

    // E. Subscribe to food items
    unsubscribersRef.current.foodItems = DB.subscribeToFoodItems(id, owner, (data) => {
      setFoodItems(data || []);
    });

    // F. Subscribe to packing items
    unsubscribersRef.current.packingItems = DB.subscribeToPackingItems(id, owner, (data) => {
      setPackingItems(data || []);
    });
  };

  // New State for AI Personalization
  const [tripPreferences, setTripPreferences] = useState({});
  const { isPremium, loading: premiumLoading } = usePremium();
  const userPlan = isPremium ? 'pro' : 'free';

  const CONSTANTS = {
    FREE_TRIP_LIMIT: 3,
    FREE_TRAVELER_LIMIT: 5
  };

  // --- Guest Persistence Keys ---
  const STORAGE_KEYS = {
    CURRENT_TRIP: 'guest_current_trip',
    ALL_TRIPS: 'guest_all_trips',
    TRIP_HISTORY: 'guest_trip_history'
  };

  // Helper to save guest data
  const saveGuestData = async (info, trips) => {
    if (isAuthenticated) return;
    try {
      if (info) await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_TRIP, JSON.stringify(info));
      if (trips) await AsyncStorage.setItem(STORAGE_KEYS.ALL_TRIPS, JSON.stringify(trips));
    } catch (e) {
      console.warn('Failed to save guest data:', e);
    }
  };

  // Helper to load guest data
  const loadGuestData = async () => {
    try {
      const [infoStr, tripsStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_TRIP),
        AsyncStorage.getItem(STORAGE_KEYS.ALL_TRIPS)
      ]);
      return {
        info: infoStr ? JSON.parse(infoStr) : null,
        trips: tripsStr ? JSON.parse(tripsStr) : []
      };
    } catch (e) {
      console.warn('Failed to load guest data:', e);
    }
  };

  const checkFeatureAccess = (feature, currentCount = 0) => {
    if (userPlan === 'pro') return { allowed: true };

    switch (feature) {
      case 'ai_planning':
        return { allowed: false, reason: 'Upgrade to Pro to use AI Planning.' };
      case 'ads':
        return { allowed: false, reason: 'Ads are shown in the free version.' };
      case 'new_trip':
        // Count active trips
        const activeTrips = allTrips.filter(t => !t.isCompleted).length;
        if (activeTrips >= CONSTANTS.FREE_TRIP_LIMIT) {
          return { allowed: false, reason: `Active trip limit reached (${CONSTANTS.FREE_TRIP_LIMIT}). Upgrade to create unlimited trips.` };
        }
        return { allowed: true };
      case 'add_traveler':
        if (currentCount >= CONSTANTS.FREE_TRAVELER_LIMIT) {
          return { allowed: false, reason: `Traveler limit reached (${CONSTANTS.FREE_TRAVELER_LIMIT} per trip). Upgrade for unlimited travelers.` };
        }
        return { allowed: true };
      default:
        return { allowed: true };
    }
  };



  // --- Derived ---
  const localParticipantId = useMemo(() => {
    if (!user || !tripInfo.participants) return 'main_user';

    // Safety check for participants type
    const participantsList = Array.isArray(tripInfo.participants)
      ? tripInfo.participants
      : Object.values(tripInfo.participants || {});

    const me = participantsList.find(p => p.userId === user.uid);
    if (me) return me.id;
    if (tripInfo.ownerId === user.uid) return 'owner';
    return 'main_user';
  }, [user, tripInfo.participants, tripInfo.ownerId]);

  // --- Actions ---

  // Load data from Firebase when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData().then(({ trips, currentTrip }) => {
        checkAndAutoEndTrips(trips, currentTrip);
        if (currentTrip) {
          setupRealTimeListeners(currentTrip.id, currentTrip.ownerId || user.uid);
        }
      });
    } else {
      resetLocalState();
    }
  }, [isAuthenticated, user]);

  // Cleanup real-time listeners on unmount
  useEffect(() => {
    return () => {
      cleanupListeners();
    };
  }, []);

  // Check and auto-end ANY past trips
  const checkAndAutoEndTrips = async (tripsToCheck, activeTrip) => {
    const list = tripsToCheck || allTrips;
    if (!list || list.length === 0) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let hasUpdates = false;
      let updatedTrips = [...list];
      const historyToAdd = [];

      for (let i = 0; i < updatedTrips.length; i++) {
        // Create a shallow copy to avoid mutating the original object in the array if it came from state
        const trip = { ...updatedTrips[i] };

        if (trip.isCompleted) continue; // Already done

        // Parse date - Robust handling for ISO and formatted strings
        let tripEndDate;
        if (!trip.endDate) continue;

        try {
          // Try parsing ISO string or standard date format directly
          const parsedDate = new Date(trip.endDate);
          if (!isNaN(parsedDate.getTime())) {
            tripEndDate = parsedDate;
          } else {
            // Fallback for "2 Jan 2026" or "02 Jan 2026" format
            const parts = trip.endDate.trim().split(/\s+/);
            if (parts.length >= 3) {
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthIndex = months.findIndex(m => m.toLowerCase().startsWith(parts[1].toLowerCase()));
              if (monthIndex !== -1) {
                // Ensure properly parsed integers
                const day = parseInt(parts[0], 10);
                const year = parseInt(parts[2], 10);
                if (!isNaN(day) && !isNaN(year)) {
                  tripEndDate = new Date(year, monthIndex, day);
                }
              }
            }
          }

          if (!tripEndDate || isNaN(tripEndDate.getTime())) {
            // console.warn('[Context] Could not parse date for trip:', trip.destination, trip.endDate);
            continue;
          }

          tripEndDate.setHours(0, 0, 0, 0);

          // Check if expired
          // Use a buffer? No, strict check: if today is AFTER the end date.
          if (today > tripEndDate) {
            // console.log(`[Context] Auto-completing expired trip: ${trip.destination}. End: ${tripEndDate.toDateString()}, Today: ${today.toDateString()}`);

            // Complete it
            trip.isCompleted = true;
            trip.completedAt = Date.now();
            trip.completedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            hasUpdates = true;
            historyToAdd.push(trip);
            // Replace the item in our local updatedTrips array with the completed version
            updatedTrips[i] = trip;

            // Save to DB
            if (isAuthenticated) {
              await DB.saveTrip(trip);
              await DB.saveToHistory(trip);
            }

            // If this was the ACTIVE trip, clear it from DB and State
            if (activeTrip && trip.id === activeTrip.id) {
              // console.log('[Context] The expired trip is currently active. Clearing it.');
              if (isAuthenticated) {
                await DB.clearCurrentTripData();
              }
              // Clear local active state
              setTripInfoState({
                destination: '', startDate: '', endDate: '', name: '',
                participants: [], tripCode: '', tripType: '', isCompleted: false,
              });
              setBudgetState({ total: 0, categories: {} });
              setExpenses([]);
              setItinerary([]);
              setTripOwnerId(null);
            }
          }
        } catch (err) {
          console.error('[Context] Error checking trip date:', err);
        }
      }

      if (hasUpdates) {
        // Update lists
        setAllTrips(updatedTrips);
        // Add new history items to state
        if (isAuthenticated) {
          // Re-fetch to be safe or just prepend
          const history = await DB.getTripHistory();
          setTripHistory(history.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)));
        } else {
          setTripHistory(prev => [...historyToAdd, ...prev]);
        }
      }

    } catch (error) {
      console.error('Error in checkAndAutoEndTrips:', error);
    }
  };

  const resetLocalState = () => {
    // Clean up real-time listeners
    cleanupListeners();

    setTripInfoState({
      destination: '', startDate: '', endDate: '', name: '',
      participants: [], tripCode: '', tripType: '', isCompleted: false,
    });
    setBudgetState({ total: 0, categories: {} });
    setExpenses([]);
    setPackingItems([]);
    setItinerary([]);
    setTripHistory([]);
    setAllTrips([]);
    setCurrencyState(currencies[0]);
    setTripOwnerId(null);
  };

  // Exposed function to purely reset state for a new trip
  const startNewTrip = async () => {
    // 1. Clear all local state
    setTripInfoState({
      destination: '', startDate: '', endDate: '', name: '',
      participants: [], tripCode: '', tripType: '', isCompleted: false,
    });
    setBudgetState({ total: 0, categories: {} });
    setExpenses([]);
    setPackingItems([]);
    setItinerary([]);
    setTripOwnerId(user?.uid);

    // 2. Clear from persistent storage
    if (isAuthenticated) {
      try {
        await DB.clearCurrentTripData();
        // Force refresh lists to ensure UI is in sync
        const [trips, history] = await Promise.all([DB.getTrips(), DB.getTripHistory()]);
        setAllTrips(trips);
        setTripHistory(history.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)));
      } catch (err) {
        console.warn('Failed to clear DB active trip or refresh:', err);
      }
    }
  };

  const getUniqueTripCode = async () => {
    let code = '';
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      code = generateUniqueTripCode();
      exists = await DB.checkTripCodeExists(code);
      attempts++;
    }

    return code;
  };

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      // console.log('Loading user data from Firebase...');

      // Load user settings (Currency)
      const settings = await DB.getUserSettings();
      if (settings?.currency) {
        const savedCurrency = currencies.find(c => c.code === settings.currency);
        if (savedCurrency) setCurrencyState(savedCurrency);
      }

      // Load current trip info
      const currentTrip = await DB.getCurrentTripInfo();
      if (currentTrip) {
        setTripInfoState(currentTrip);
        setTripOwnerId(currentTrip.ownerId || user?.uid);
      }

      // Load budget
      const savedBudget = await DB.getBudget(currentTrip?.id, currentTrip?.ownerId || user?.uid);
      setBudgetState(savedBudget);

      // Load expenses
      const savedExpenses = await DB.getExpenses(currentTrip?.id, currentTrip?.ownerId || user?.uid);
      setExpenses(savedExpenses);

      // Load packing items - ALWAYS local/private, not synced with owner
      const savedPackingItems = await DB.getPackingItems(currentTrip?.id);
      setPackingItems(savedPackingItems);

      // Load food items (persisted)
      const savedFoodItems = await DB.getFoodItems(currentTrip?.id, currentTrip?.ownerId || user?.uid);
      setFoodItems(savedFoodItems);

      // Load itinerary
      const savedItinerary = await DB.getItinerary(currentTrip?.id, currentTrip?.ownerId || user?.uid);
      setItinerary(savedItinerary);

      // Load all trips
      const savedTrips = await DB.getTrips();
      setAllTrips(savedTrips);

      // Load trip history
      const savedHistory = await DB.getTripHistory();
      setTripHistory(savedHistory.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)));

      // console.log('User data loaded successfully');
      return { trips: savedTrips, currentTrip }; // Return both for processing
    } catch (error) {
      console.error('Error loading user data:', error);
      return { trips: [], currentTrip: null };
    } finally {
      setIsLoading(false);
    }
  };

  // Set trip info and save to Firebase
  const setTripInfo = async (updater) => {
    let newInfo = typeof updater === 'function' ? updater(tripInfo) : updater;

    if (newInfo.destination && !newInfo.tripCode) {
      newInfo.tripCode = await getUniqueTripCode();
    }
    if (newInfo.destination && !newInfo.id) {
      newInfo.id = `trip-${Date.now()}`;
    }

    setTripInfoState(newInfo);

    // Sync allTrips list immediately
    setAllTrips(prev => {
      if (!newInfo.id) return prev;
      const filtered = prev.filter(t => t.id !== newInfo.id);
      return [newInfo, ...filtered];
    });

    // Save to Firebase
    if (isAuthenticated && newInfo.destination) {
      try {
        await DB.saveCurrentTripInfo(newInfo);
      } catch (error) {
        console.error('Error saving trip info:', error);
      }
    }
  };

  // Set budget and save to Firebase
  const setBudget = async (updater) => {
    const newBudget = typeof updater === 'function' ? updater(budget) : updater;
    setBudgetState(newBudget);

    if (isAuthenticated) {
      try {
        // Save to specific trip path to ensure persistence across reloads
        await DB.saveBudget(newBudget, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error saving budget:', error);
      }
    }
  };

  // Add expense and save to Firebase
  const addExpense = async (expense) => {
    const newExpense = {
      ...expense,
      id: expense.id || Date.now().toString(),
      paidBy: expense.paidBy || localParticipantId,
      splitType: expense.splitType || 'equal',
      splitAmounts: expense.splitAmounts || {},
      beneficiaries: expense.beneficiaries || [],
      createdAt: Date.now(),
    };

    setExpenses(prev => {
      const updated = [...prev, newExpense];
      return updated.sort((a, b) => (b.dateTimestamp || b.createdAt) - (a.dateTimestamp || a.createdAt));
    });

    if (isAuthenticated) {
      try {
        await DB.saveExpense(newExpense, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error saving expense:', error);
      }
    }
  };

  // Update expense
  const updateExpense = async (id, updatedData) => {
    setExpenses(prev => {
      const updated = prev.map(exp => exp.id === id ? { ...exp, ...updatedData } : exp);
      return updated.sort((a, b) => (b.dateTimestamp || b.createdAt) - (a.dateTimestamp || a.createdAt));
    });

    if (isAuthenticated) {
      try {
        await DB.saveExpense({ ...updatedData, id }, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error updating expense:', error);
      }
    }
  };

  // Delete expense
  const deleteExpense = async (id) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id));

    if (isAuthenticated) {
      try {
        await DB.deleteExpenseFromDB(id, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  // Add packing item
  const addPackingItem = async (item) => {
    const newItem = { ...item, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), packed: false };
    setPackingItems(prev => [...prev, newItem]);

    if (isAuthenticated) {
      try {
        await DB.savePackingItem(newItem, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error saving packing item:', error);
      }
    }
  };

  // Toggle packing item
  const togglePackingItem = async (id) => {
    const item = packingItems.find(i => i.id === id);
    if (!item) return;

    setPackingItems(prev => prev.map(i => i.id === id ? { ...i, packed: !i.packed } : i));

    if (isAuthenticated) {
      try {
        await DB.updatePackingItem(id, { packed: !item.packed }, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error updating packing item:', error);
      }
    }
  };

  // Delete packing item
  const deletePackingItem = async (id) => {
    setPackingItems(prev => prev.filter(item => item.id !== id));

    if (isAuthenticated) {
      try {
        await DB.deletePackingItemFromDB(id, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error deleting packing item:', error);
      }
    }
  };

  // --- FOOD ITEMS ---
  const addFoodItem = async (place, name, type, bestTime = null, bestLocations = [], premiumDetails = {}) => {
    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      place,
      name,
      type,
      bestTime,
      bestLocations: Array.isArray(bestLocations) ? bestLocations : (bestLocations ? [bestLocations] : []),
      ...premiumDetails, // Includes localSecret, perfectPairing, vibe, priceRange, variation
      tried: false
    };

    setFoodItems(prev => [...prev, newItem]);

    if (isAuthenticated) {
      try {
        await DB.saveFoodItem(newItem, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error saving food item:', error);
      }
    }
  };

  const toggleFoodItem = async (id) => {
    const item = foodItems.find(i => i.id === id);
    if (!item) return;

    setFoodItems(prev => prev.map(i => i.id === id ? { ...i, tried: !i.tried } : i));

    if (isAuthenticated) {
      try {
        await DB.updateFoodItem(id, { tried: !item.tried }, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error updating food item:', error);
      }
    }
  };

  const deleteFoodItem = async (id) => {
    setFoodItems(prev => prev.filter(item => item.id !== id));

    if (isAuthenticated) {
      try {
        await DB.deleteFoodItemFromDB(id, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error deleting food item:', error);
      }
    }
  };

  // Add itinerary item
  const addItineraryItem = async (item) => {
    const newItem = { ...item, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) };
    setItinerary(prev => [...prev, newItem]);

    if (isAuthenticated) {
      try {
        await DB.saveItineraryItem(newItem, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error saving itinerary item:', error);
      }
    }
  };

  // Delete itinerary item
  const deleteItineraryItem = async (id) => {
    setItinerary(prev => prev.filter(item => item.id !== id));

    if (isAuthenticated) {
      try {
        await DB.deleteItineraryItemFromDB(id, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error deleting itinerary item:', error);
      }
    }
  };

  // Update itinerary item
  const updateItineraryItem = async (id, updates) => {
    setItinerary(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));

    if (isAuthenticated) {
      try {
        const item = itinerary.find(i => i.id === id);
        if (item) {
          await DB.saveItineraryItem({ ...item, ...updates }, tripInfo.id, tripOwnerId);
        }
      } catch (error) {
        console.error('Error updating itinerary item:', error);
      }
    }
  };

  // Wrapped List Setters
  const setExpensesSync = async (updater) => {
    const newExpenses = typeof updater === 'function' ? updater(expenses) : updater;
    setExpenses(newExpenses);
    if (isAuthenticated) {
      try {
        await DB.saveExpenses(newExpenses, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error saving expenses list:', error);
      }
    }
  };

  const setItinerarySync = async (updater) => {
    const newItinerary = typeof updater === 'function' ? updater(itinerary) : updater;
    setItinerary(newItinerary);
    if (isAuthenticated) {
      try {
        await DB.saveItinerary(newItinerary, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error saving itinerary list:', error);
      }
    }
  };

  const setFoodItemsSync = async (updater) => {
    const newFoodItems = typeof updater === 'function' ? updater(foodItems) : updater;
    setFoodItems(newFoodItems);
    if (isAuthenticated) {
      try {
        await DB.saveFoodItems(newFoodItems, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error saving food items list:', error);
      }
    }
  };

  const setPackingItemsSync = async (updater) => {
    const newPackingItems = typeof updater === 'function' ? updater(packingItems) : updater;
    setPackingItems(newPackingItems);
    if (isAuthenticated) {
      try {
        await DB.savePackingItems(newPackingItems, tripInfo.id, tripOwnerId);
      } catch (error) {
        console.error('Error saving packing items list:', error);
      }
    }
  };

  // End trip - move to history
  const endTrip = async () => {
    if (tripInfo && tripInfo.destination) {
      try {
        setIsLoading(true);

        // 1. Ensure the trip is fully saved with its latest data
        const savedTrip = await saveCurrentTripToList();

        // 2. Mark as completed
        const completedTrip = {
          ...savedTrip,
          isCompleted: true,
          completedAt: Date.now(),
          completedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          totalSpent: getTotalExpenses(),
          budget: budget.total,
          expensesCount: expenses.length,
          currency: currency.code,
        };

        // 3. Save to database in both locations
        if (isAuthenticated) {
          await DB.saveTrip(completedTrip);
          await DB.saveToHistory(completedTrip);

          // Force refresh all internal lists
          const [updatedTrips, updatedHistory] = await Promise.all([
            DB.getTrips(),
            DB.getTripHistory()
          ]);
          setAllTrips(updatedTrips);
          setTripHistory(updatedHistory.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)));
        } else {
          setTripHistory(prev => [completedTrip, ...prev]);
          setAllTrips(prev => prev.map(t => t.id === completedTrip.id ? completedTrip : t));
        }

        // 4. Clear active trip state - Hard reset
        await clearTrip();

        return { success: true };
      } catch (error) {
        console.error('Error ending trip:', error);
        return { success: false, error: error.message };
      } finally {
        setIsLoading(false);
      }
    }
    return { success: false, error: 'No active trip to end' };
  };

  // Clear current trip
  const clearTrip = async () => {
    try {
      setIsLoading(true);

      // Clean up real-time listeners
      cleanupListeners();

      setTripInfoState({
        destination: '', startDate: '', endDate: '', name: '',
        participants: [], tripCode: '', tripType: '', isCompleted: false,
      });
      setBudgetState({ total: 0, categories: {} });
      setExpenses([]);
      setPackingItems([]);
      setFoodItems([]);
      setItinerary([]);

      if (isAuthenticated) {
        await DB.clearCurrentTripData();
      }
      return { success: true };
    } catch (error) {
      console.error('Error clearing trip:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to a specific trip
  const switchToTrip = async (trip) => {
    if (!trip) {
      console.warn('switchToTrip called with null trip');
      return;
    }
    try {
      setIsLoading(true);

      // Clean up any existing real-time listeners before switching
      cleanupListeners();

      // Determine owner
      const owner = trip.ownerId || user?.uid;
      setTripOwnerId(owner);

      // Setup real-time listeners
      setupRealTimeListeners(trip.id, owner);

      // Refetch from shared node if it's a shared trip to get latest participants/info
      if (trip.tripCode) {
        try {
          const latestTrip = await DB.getTripByCode(trip.tripCode);
          if (latestTrip) {
            trip = { ...trip, ...latestTrip };
          }
        } catch (err) {
          console.warn('Failed to fetch latest trip info, using local data:', err);
        }
      }

      // Update trip info state
      setTripInfoState(trip);

      // Load shared data for this trip
      if (isAuthenticated) {
        // Fetch packing items (per-user, not shared)
        const savedPacking = await DB.getPackingItems(trip.id);
        setPackingItems(savedPacking || []);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error switching trip:', error);
      setIsLoading(false);
    }
  };

  // Save current trip to all trips list
  // Save current trip to all trips list - Now the primary entry point for saving a trip
  const saveCurrentTripToList = async (passedTrip) => {
    const dataToSave = passedTrip || tripInfo;
    if (!dataToSave.destination) return;

    // 1. Generate final data once
    const tripId = dataToSave.id || `trip-${Date.now()}`;
    const tripCode = dataToSave.tripCode || await getUniqueTripCode();

    const newTrip = {
      ...dataToSave,
      id: tripId,
      tripCode: tripCode,
      totalExpenses: dataToSave.totalExpenses || getTotalExpenses() || 0,
      ownerId: dataToSave.ownerId || user?.uid,
      createdAt: dataToSave.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // 2. Atomic state updates
    setTripOwnerId(newTrip.ownerId);
    setTripInfoState(newTrip);

    if (dataToSave.budget) {
      setBudgetState(dataToSave.budget);
    }

    setAllTrips(prev => {
      const filtered = prev.filter(t => t.id !== newTrip.id);
      return [newTrip, ...filtered];
    });

    // 3. Persistent storage
    if (isAuthenticated) {
      try {
        // Save to currentTrip/info for resume on reload
        await DB.saveCurrentTripInfo(newTrip);

        // Save budget if it was part of the update
        if (dataToSave.budget) {
          await DB.saveBudget(dataToSave.budget, newTrip.id, newTrip.ownerId);
        }

        // Save to the main trips list
        await DB.saveTrip(newTrip);

        // Final sync of history and all trips
        const [updatedTrips, updatedHistory] = await Promise.all([
          DB.getTrips(),
          DB.getTripHistory()
        ]);

        // console.log(`[Context] Saved trip. Now refreshing. DB trips count: ${updatedTrips.length}`);

        if (updatedTrips.length > 0) {
          setAllTrips(updatedTrips);
        } else {
          console.warn('[Context] DB.getTrips() returned empty after save. Keeping local state.');
        }
        setTripHistory(updatedHistory.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)));
      } catch (error) {
        console.error('Error saving trip to list:', error);
      }
    } else {
      // Handle Guest Persistence
      await saveGuestData(newTrip, [newTrip, ...allTrips.filter(t => t.id !== newTrip.id)]);
    }

    return newTrip;
  };
  const getTotalExpenses = () => expenses
    .filter(e => !e.type || e.type === 'expense')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const getExpensesByCategory = () => expenses.reduce((acc, e) => {
    const amount = parseFloat(e.amount) || 0;
    acc[e.category] = (acc[e.category] || 0) + amount;
    return acc;
  }, {});

  const getRemainingBudget = () => (budget.total || 0) - getTotalExpenses();

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    if (currency.code === 'INR') {
      return `${currency.symbol}${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    return `${currency.symbol}${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  };

  const isMultiUserTrip = () => tripInfo.tripType && tripInfo.tripType !== 'solo';

  const getAllTravelers = () => {
    // Handle case where participants is an object (Firebase quirk)
    let participantsList = [];

    if (tripInfo && tripInfo.participants) {
      participantsList = Array.isArray(tripInfo.participants)
        ? [...tripInfo.participants]  // Clone to avoid mutation
        : Object.values(tripInfo.participants || {});
    }

    // Debug log to trace issues
    // console.log('[getAllTravelers] participantsList:', JSON.stringify(participantsList));
    // console.log('[getAllTravelers] tripInfo.ownerId:', tripInfo.ownerId);
    // console.log('[getAllTravelers] current user.uid:', user?.uid);

    // Check if the owner is already in the participants list (by type OR by userId)
    const ownerInList = participantsList.find(p =>
      p.id === 'owner' ||
      p.type === 'owner' ||
      (p.userId && tripInfo.ownerId && p.userId === tripInfo.ownerId)
    );

    // If no owner in list, we need to add one
    if (!ownerInList) {
      const isCurrentUserOwner = tripInfo.ownerId === user?.uid || !tripInfo.ownerId;

      if (isCurrentUserOwner && user) {
        // Current user is owner - add themselves
        participantsList.unshift({
          id: 'owner',
          name: user.displayName || 'Organizer',
          userId: user.uid,
          type: 'owner',
          familyGroup: tripInfo.tripType === 'family' ? 'Family 1' : null
        });
      } else if (tripInfo.ownerId) {
        // Someone else is owner - add placeholder with their ownerId
        participantsList.unshift({
          id: 'owner',
          name: 'Trip Owner', // Will be updated when we get their info
          userId: tripInfo.ownerId,
          type: 'owner',
          familyGroup: tripInfo.tripType === 'family' ? 'Family 1' : null
        });
      }
    }

    const isFamilyTrip = tripInfo.tripType === 'family';

    return participantsList.map(p => {
      // Determine the display name
      let displayName = p.name || 'Unknown';

      // If this participant is the current user, show "You"
      if (p.userId === user?.uid) {
        displayName = 'You';
      }
      // If name is missing or just 'owner', use a fallback
      else if (!p.name || p.name === 'owner') {
        displayName = (p.type === 'owner' || p.id === 'owner') ? 'Trip Owner' : 'Unknown';
      }

      return {
        ...p,
        name: displayName,
        isMe: p.userId === user?.uid,
        photoURL: p.userId === user?.uid ? user?.photoURL : p.photoURL,
        familyGroup: isFamilyTrip ? (p.familyGroup || 'Family 1') : null
      };
    });
  };

  const deleteTripFromHistory = async (id) => {
    // Remove from local history list
    setTripHistory(prev => prev.filter(trip => trip.id !== id));
    // Also remove from allTrips if it's there (to prevent it showing up as active)
    setAllTrips(prev => prev.filter(trip => trip.id !== id));

    // CRITICAL: If the deleted trip is the CURRENTLY active trip, clear it immediately
    // to prevent it from showing up in the Dashboard/Welcome Screen.
    if (tripInfo && tripInfo.id === id) {
      // console.log('[Context] Deleting currently active trip, clearing state...');
      await clearTrip();
    }

    if (isAuthenticated) {
      try {
        // Use soft delete to preserve trip code but remove data
        await DB.softDeleteTrip(id);
        return { success: true };
      } catch (error) {
        console.error('Error soft deleting trip:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  };

  const deleteTrip = async (tripId) => {
    // Try to remove from active trips
    const isActive = allTrips.some(t => t.id === tripId);
    if (isActive) {
      setAllTrips(prev => prev.filter(trip => trip.id !== tripId));
    }

    // Also try to remove from history just in case
    const isHistory = tripHistory.some(t => t.id === tripId);
    if (isHistory) {
      setTripHistory(prev => prev.filter(trip => trip.id !== tripId));
    }

    if (isAuthenticated) {
      try {
        await DB.deleteTrip(tripId);
        // Also try deleting from history DB path if needed
        await DB.deleteTripFromHistory(tripId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting trip:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: true };
  };



  // --- AI Personalization & Subscription ---



  const saveTripPreferences = async (preferences) => {
    setTripPreferences(preferences);

    // Update local trip info state with preferences
    setTripInfoState(prev => ({ ...prev, preferences }));

    if (isAuthenticated && tripInfo.id) {
      try {
        await DB.saveTripPreferences(tripInfo.id, preferences);
        // Also update the main trip record to include these preferences
        await DB.saveTrip({ ...tripInfo, preferences });
      } catch (error) {
        console.error('Error saving trip preferences:', error);
      }
    }
  };

  // Join trip by code - Fix: Store as reference, don't copy
  const findTripByCode = async (code) => {
    try {
      const trip = await DB.getTripByCode(code);
      return trip;
    } catch (error) {
      console.error('Find trip error:', error);
      return null;
    }
  };

  const joinTripByCode = async (code, participantId = null) => {
    try {
      setIsLoading(true);

      const trip = await DB.getTripByCode(code);

      if (!trip) {
        setIsLoading(false);
        return { success: false, error: 'Invalid trip code' };
      }

      // Check if already joined
      const alreadyJoined = allTrips.some(t => t.id === trip.id);
      if (alreadyJoined) {
        setIsLoading(false);
        return { success: true, trip, message: 'You have already joined this trip' };
      }

      // Add ref to my trips with chosen identity
      await DB.addMeToTrip(trip, participantId, user?.photoURL);

      // Fetch the updated trip data (to ensure we have the claimed identity locally)
      const updatedTrip = await DB.getTripByCode(code);

      // Update local state
      setAllTrips(prev => [updatedTrip, ...prev]);

      setIsLoading(false);
      return { success: true, trip: updatedTrip };
    } catch (error) {
      console.error('Join trip error:', error);
      setIsLoading(false);
      return { success: false, error: 'Failed to join trip' };
    }
  };

  const joinAsNewTraveler = async (trip, name, familyGroup = null) => {
    try {
      setIsLoading(true);
      const userId = auth.currentUser?.uid;

      const newParticipant = {
        id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: name || 'New Traveler',
        userId: userId,
        photoURL: user?.photoURL || 'profile_avatar',
        type: trip.tripType === 'family' ? 'family' : 'friend', // Set type correctly
        familyGroup: familyGroup // Include family group
      };

      // 1. Add to owner's trip
      await DB.addNewParticipantToTrip(trip.ownerId, trip.id, newParticipant);

      // 2. Add to my trips
      await DB.addMeToTrip(trip, newParticipant.id, user?.photoURL);

      // 3. Fetch updated trip
      const updatedTrip = await DB.getTripByCode(trip.tripCode);

      // Update local state
      setAllTrips(prev => [updatedTrip, ...prev]);

      setIsLoading(false);
      return { success: true, trip: updatedTrip };
    } catch (error) {
      console.error('Join as new traveler error:', error);
      setIsLoading(false);
      return { success: false, error: 'Failed to join as new traveler' };
    }
  };

  const getTripByCode = (code) => allTrips.find(trip => trip.tripCode === code?.toUpperCase());
  const createNewTrip = () => {
    setTripOwnerId(user?.uid); // Reset owner to self
    saveCurrentTripToList();
  };
  const getBalances = () => ({});
  const getSettlements = () => [];

  const setCurrency = async (newCurrency) => {
    setCurrencyState(newCurrency);
    if (isAuthenticated) {
      try {
        await DB.saveUserSettings({ currency: newCurrency.code });
      } catch (error) {
        console.error('Error saving currency preference:', error);
      }
    }
  };

  // Update trip info in DB
  const updateTripInfo = async (updates) => {
    const newInfo = { ...tripInfo, ...updates };
    setTripInfoState(newInfo);
    // ... existing logic ...
  };

  return (
    <TravelContext.Provider value={{
      tripInfo: tripInfo || { // Fallback if tripInfo somehow becomes null
        destination: '', startDate: '', endDate: '', name: '',
        participants: [], tripCode: '', tripType: '', isCompleted: false,
      },
      setTripInfo,
      budget, setBudget,
      expenses, setExpenses: setExpensesSync,
      addExpense,
      updateExpense,
      deleteExpense,
      startNewTrip, // Exported for UI to call
      getTotalExpenses, getExpensesByCategory,
      packingItems,
      addPackingItem,
      setPackingItems: setPackingItemsSync,
      togglePackingItem,
      deletePackingItem,
      // --- FOOD ITEMS EXPORT ---
      foodItems,
      setFoodItems: setFoodItemsSync,
      addFoodItem,
      toggleFoodItem,
      deleteFoodItem,
      // -------------------------
      itinerary,
      setItinerary: setItinerarySync,
      addItineraryItem,
      deleteItineraryItem,
      updateItineraryItem,
      getRemainingBudget,
      clearTrip, endTrip,
      tripHistory, setTripHistory,
      currency, setCurrency, currencies,
      formatCurrency,
      customCategories, setCustomCategories,
      isMultiUserTrip, getAllTravelers, getBalances, getSettlements,
      localParticipantId,
      deleteTripFromHistory, deleteTrip, resetLocalState, findTripByCode,
      joinTripByCode, joinAsNewTraveler, switchToTrip, tripOwnerId, getUniqueTripCode,
      saveCurrentTripToList,
      tripPreferences,
      userPlan,
      isPremium,
      premiumLoading,
      saveTripPreferences,
      allTrips, setAllTrips,
      isLoading,
      checkFeatureAccess,
      CONSTANTS,
    }}>
      {children}
    </TravelContext.Provider>
  );
};
