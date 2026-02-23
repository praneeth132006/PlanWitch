import {
  database,
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  off,
  auth
} from '../config/firebase';

const getUserId = () => auth.currentUser?.uid;

// helper to strip private data from shared/fetched trips
const cleanTripData = (trip) => {
  if (!trip) return null;
  const cleaned = { ...trip };
  // remove sub-node collections that should be private to the local user
  delete cleaned.packingItems;
  delete cleaned.expenses;
  delete cleaned.itinerary;
  delete cleaned.budget; // budget info is usually handled separately, but let's be safe
  return cleaned;
};

// ============ TRIPS ============
export const saveTrip = async (tripData) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  const tripId = tripData.id || push(ref(database, `users/${userId}/trips`)).key;
  const tripRef = ref(database, `users/${userId}/trips/${tripId}`);

  // Use update instead of set to avoid wiping sub-collections (expenses, packingItems, etc.)
  const cleanedData = cleanTripData(tripData);
  await update(tripRef, {
    ...cleanedData,
    id: tripId,
    updatedAt: Date.now(),
    createdAt: tripData.createdAt || Date.now()
  });

  // If trip has a code, map it globally and sync to shared node
  if (tripData.tripCode) {
    await saveTripCodeMapping(tripData.tripCode, userId, tripId);
    await saveToSharedTrips(tripId, { ...cleanedData, id: tripId, ownerId: userId });
  }

  return { ...cleanedData, id: tripId };
};

export const saveToSharedTrips = async (tripId, tripData) => {
  if (!tripId || !tripData) return;
  // We only mirror essential info for joining: name, destination, dates, participants, tripCode, ownerId
  const sharedData = {
    id: tripId,
    name: tripData.name || '',
    destination: tripData.destination || '',
    startDate: tripData.startDate || '',
    endDate: tripData.endDate || '',
    tripCode: tripData.tripCode || '',
    tripType: tripData.tripType || 'friends',
    ownerId: tripData.ownerId || getUserId(),
    participants: tripData.participants || [],
    updatedAt: Date.now()
  };
  await set(ref(database, `sharedTrips/${tripId}`), sharedData);
};

export const getTrips = async () => {
  const userId = getUserId();
  if (!userId) return [];

  const snapshot = await get(ref(database, `users/${userId}/trips`));
  if (!snapshot.exists()) return [];
  const trips = Object.values(snapshot.val());
  return trips.map(t => cleanTripData(t)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

export const deleteTrip = async (tripId) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // 1. Fetch trip data to check for tripCode
  const tripRef = ref(database, `users/${userId}/trips/${tripId}`);
  const snapshot = await get(tripRef);

  if (snapshot.exists()) {
    const tripData = snapshot.val();
    // 2. If it has a tripCode, release it
    if (tripData.tripCode) {
      await deleteTripCodeMapping(tripData.tripCode);
      await remove(ref(database, `sharedTrips/${tripId}`));
    }
  }

  // 3. Delete the trip
  await remove(tripRef);
};

export const softDeleteTrip = async (tripId) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // 1. Fetch trip data to preserve tripCode
  const tripRef = ref(database, `users/${userId}/trips/${tripId}`);
  const snapshot = await get(tripRef);

  if (snapshot.exists()) {
    const tripData = snapshot.val();
    const tripCode = tripData.tripCode;

    // 2. Overwrite with minimal data (soft delete)
    const softDeletedData = {
      id: tripId,
      tripCode: tripCode,
      isDeleted: true,
      deletedAt: Date.now()
    };

    // Update private trip node
    await set(tripRef, softDeletedData);

    // Update shared trip node
    await set(ref(database, `sharedTrips/${tripId}`), {
      ...softDeletedData,
      ownerId: userId
    });

    // 3. Remove from history entirely
    await remove(ref(database, `users/${userId}/tripHistory/${tripId}`));

    // Note: We deliberately DO NOT delete the tripCode mapping so the code remains valid
    // but points to a deleted trip state, preventing reuse or confusion.
  }
};

// ============ TRIP CODES & SHARING ============
export const saveTripCodeMapping = async (code, userId, tripId) => {
  await set(ref(database, `tripCodes/${code}`), { userId, tripId });
};

export const deleteTripCodeMapping = async (code) => {
  if (!code) return;
  await remove(ref(database, `tripCodes/${code}`));
};

export const checkTripCodeExists = async (code) => {
  if (!code) return false;
  const snapshot = await get(ref(database, `tripCodes/${code}`));
  return snapshot.exists();
};

export const getTripByCode = async (code) => {
  // console.log(`[DB] Looking up trip code: ${code}`);

  // 1. Look up code in 'tripCodes'
  try {
    const codeSnapshot = await get(ref(database, `tripCodes/${code}`));
    if (!codeSnapshot.exists()) {
      // console.log(`[DB] Code ${code} not found in tripCodes`);
      return null;
    }

    const { userId, tripId } = codeSnapshot.val();
    // console.log(`[DB] Code found. Owner: ${userId}, TripId: ${tripId}`);

    // 2. Fetch trip data from sharedTrips (Publicly accessible)
    // console.log(`[DB] Fetching trip data from sharedTrips/${tripId}`);

    const tripSnapshot = await get(ref(database, `sharedTrips/${tripId}`));
    if (!tripSnapshot.exists()) {
      // console.log(`[DB] Trip data not found in sharedTrips/${tripId}. Falling back to private node (may fail if not owner).`);

      const tripPath = tripId === 'current'
        ? `users/${userId}/currentTrip/info`
        : `users/${userId}/trips/${tripId}`;

      const fallbackSnapshot = await get(ref(database, tripPath));
      if (!fallbackSnapshot.exists()) return null;
      return { ...cleanTripData(fallbackSnapshot.val()), ownerId: userId };
    }

    return cleanTripData(tripSnapshot.val());
  } catch (error) {
    console.error(`[DB] Permission/Network Error in getTripByCode:`, error);
    throw error;
  }
};

/**
 * Subscribe to trip info changes in real-time
 * @param {string} tripId - Trip ID
 * @param {function} callback - Called with updated trip info
 * @returns {function} Unsubscribe function
 */
export const subscribeToTripInfo = (tripId, callback) => {
  if (!tripId) return () => { };

  const dbRef = ref(database, `sharedTrips/${tripId}`);

  const unsubscribe = onValue(dbRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(cleanTripData(snapshot.val()));
    }
  }, (error) => {
    console.error('[DB] Trip info subscription error:', error);
  });

  return () => off(dbRef, 'value', unsubscribe);
};

export const claimParticipantIdentity = async (ownerId, tripId, participantId, userId, photoURL = null) => {
  if (!ownerId || !tripId || !participantId || !userId) return;

  // 1. Update sharedTrips (Priority for joiners)
  const sharedParticipantsRef = ref(database, `sharedTrips/${tripId}/participants`);
  const sharedSnapshot = await get(sharedParticipantsRef);

  if (sharedSnapshot.exists()) {
    const participants = sharedSnapshot.val();
    const updatedParticipants = participants.map(p =>
      p.id === participantId ? { ...p, userId, photoURL } : p
    );
    await set(sharedParticipantsRef, updatedParticipants);
  }

  // 2. Update owner's private node (Sync)
  try {
    const tripPath = tripId === 'current' ? `users/${ownerId}/currentTrip/info` : `users/${ownerId}/trips/${tripId}`;
    const participantsRef = ref(database, `${tripPath}/participants`);
    const snapshot = await get(participantsRef);

    if (snapshot.exists()) {
      const participants = snapshot.val();
      const updatedParticipants = participants.map(p =>
        p.id === participantId ? { ...p, userId, photoURL } : p
      );
      await set(participantsRef, updatedParticipants);
    }
  } catch (e) {
    // console.log('[DB] Note: Could not update owner private node (expected for joiners)');
  }
};

export const addNewParticipantToTrip = async (ownerId, tripId, participantData) => {
  if (!ownerId || !tripId || !participantData) return;

  // 1. Fetch current trip data to check tripType
  const tripPath = tripId === 'current' ? `users/${ownerId}/currentTrip/info` : `users/${ownerId}/trips/${tripId}`;
  const sharedPath = `sharedTrips/${tripId}`;

  const tripSnapshot = await get(ref(database, sharedPath));
  let updates = {};

  if (tripSnapshot.exists()) {
    const tripData = tripSnapshot.val();
    // If it was a solo trip, automatically change it to friends trip
    if (tripData.tripType === 'solo') {
      updates.tripType = 'friends';
      // If name is "Solo Trip" or default, update it
      if (tripData.name === 'Solo Trip' || !tripData.name || tripData.name.toLowerCase().includes('solo')) {
        updates.name = 'Friends Trip';
      }
    }
  }

  // 2. Update sharedTrips
  const sharedParticipantsRef = ref(database, `${sharedPath}/participants`);
  const sharedSnapshot = await get(sharedParticipantsRef);

  // Safe array conversion
  let sharedParticipants = [];
  if (sharedSnapshot.exists()) {
    const val = sharedSnapshot.val();
    sharedParticipants = Array.isArray(val) ? val : Object.values(val);
  }

  const updatedParticipants = [...sharedParticipants, participantData];

  const sharedUpdates = {
    ...updates,
    participants: updatedParticipants,
    updatedAt: Date.now()
  };

  await update(ref(database, sharedPath), sharedUpdates);

  // 3. Update owner's private node
  try {
    const privateRef = ref(database, tripPath);
    const privateSnapshot = await get(privateRef);

    if (privateSnapshot.exists()) {
      const privateData = privateSnapshot.val();
      let currentParticipants = [];
      if (privateData.participants) {
        currentParticipants = Array.isArray(privateData.participants)
          ? privateData.participants
          : Object.values(privateData.participants);
      }

      await update(privateRef, {
        ...updates,
        participants: [...currentParticipants, participantData],
        updatedAt: Date.now()
      });
    }
  } catch (e) {
    // console.log('[DB] Note: Could not update owner private node for new participant (expected for joiners)');
  }
};

export const addMeToTrip = async (trip, participantId = null, photoURL = null) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // 1. If a participant identity was chosen, claim it in the owner's trip
  if (participantId && trip.ownerId) {
    await claimParticipantIdentity(trip.ownerId, trip.id, participantId, userId, photoURL);
  }

  // 2. Add trip reference to my user profile
  const myTripRef = {
    id: trip.id,
    destination: trip.destination,
    startDate: trip.startDate || '',
    endDate: trip.endDate || '',
    name: trip.name || '',
    tripCode: trip.tripCode || '',
    tripType: trip.tripType || 'friends',
    ownerId: trip.ownerId, // CRITICAL: Save who owns it
    participantId: participantId, // Save which participant I am
    participants: trip.participants || [],
    isShared: true,
    addedAt: Date.now()
  };

  await set(ref(database, `users/${userId}/trips/${trip.id}`), myTripRef);
};

// ============ CURRENT TRIP ============
export const saveCurrentTripInfo = async (tripInfo) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');
  const cleaned = cleanTripData(tripInfo);
  await set(ref(database, `users/${userId}/currentTrip/info`), { ...cleaned, updatedAt: Date.now() });

  // Also ensure the trip code mapping exists globally for joining
  if (tripInfo.tripCode && tripInfo.id) {
    await saveTripCodeMapping(tripInfo.tripCode, userId, tripInfo.id);
    await saveToSharedTrips(tripInfo.id, { ...cleaned, ownerId: userId });
  }
};

export const getCurrentTripInfo = async () => {
  const userId = getUserId();
  if (!userId) return null;
  const snapshot = await get(ref(database, `users/${userId}/currentTrip/info`));
  return snapshot.exists() ? cleanTripData(snapshot.val()) : null;
};

// ============ EXPENSES ============
// ============ EXPENSES ============
export const saveExpense = async (expense, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId(); // Use ownerId if provided (shared trip), else active user
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/expenses`
    : (ownerId ? `expenses/${tripId}` : `users/${userId}/trips/${tripId}/expenses`);

  const expenseId = expense.id || push(ref(database, path)).key;
  await set(ref(database, `${path}/${expenseId}`), { ...expense, id: expenseId, createdAt: expense.createdAt || Date.now() });
  return { ...expense, id: expenseId };
};

export const saveExpenses = async (expenses, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/expenses`
    : (ownerId ? `expenses/${tripId}` : `users/${userId}/trips/${tripId}/expenses`);

  // Convert array to object with IDs as keys for Firebase
  const expensesObj = {};
  expenses.forEach(exp => {
    const id = exp.id || push(ref(database, path)).key;
    expensesObj[id] = { ...exp, id };
  });

  await set(ref(database, path), expensesObj);
};

export const getExpenses = async (tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) return [];

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/expenses`
    : (ownerId ? `expenses/${tripId}` : `users/${userId}/trips/${tripId}/expenses`);

  const snapshot = await get(ref(database, path));
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
};

export const deleteExpenseFromDB = async (expenseId, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/expenses/${expenseId}`
    : (ownerId ? `expenses/${tripId}/${expenseId}` : `users/${userId}/trips/${tripId}/expenses/${expenseId}`);

  await remove(ref(database, path));
};

// ============ PACKING ITEMS ============
// ============ PACKING ITEMS ============
export const savePackingItem = async (item, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = isCurrent
    ? `users/${userId}/currentTrip/packingItems`
    : `users/${userId}/trips/${tripId}/packingItems`;

  const itemId = item.id || push(ref(database, path)).key;
  await set(ref(database, `${path}/${itemId}`), { ...item, id: itemId });
  return { ...item, id: itemId };
};

export const getPackingItems = async (tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) return [];

  const isCurrent = !tripId || tripId === 'current';
  const path = isCurrent
    ? `users/${userId}/currentTrip/packingItems`
    : `users/${userId}/trips/${tripId}/packingItems`;

  const snapshot = await get(ref(database, path));
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
};

export const updatePackingItem = async (itemId, updates, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = isCurrent
    ? `users/${userId}/currentTrip/packingItems/${itemId}`
    : `users/${userId}/trips/${tripId}/packingItems/${itemId}`;

  await update(ref(database, path), updates);
};

export const deletePackingItemFromDB = async (itemId, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = isCurrent
    ? `users/${userId}/currentTrip/packingItems/${itemId}`
    : `users/${userId}/trips/${tripId}/packingItems/${itemId}`;

  await remove(ref(database, path));
};

// ============ FOOD ITEMS ============
export const saveFoodItem = async (item, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/foodItems`
    : (ownerId ? `foodItems/${tripId}` : `users/${userId}/trips/${tripId}/foodItems`);

  const itemId = item.id || push(ref(database, path)).key;
  await set(ref(database, `${path}/${itemId}`), { ...item, id: itemId });
  return { ...item, id: itemId };
};

export const saveFoodItems = async (items, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/foodItems`
    : (ownerId ? `foodItems/${tripId}` : `users/${userId}/trips/${tripId}/foodItems`);

  const itemsObj = {};
  items.forEach(item => {
    const id = item.id || push(ref(database, path)).key;
    itemsObj[id] = { ...item, id };
  });

  await set(ref(database, path), itemsObj);
};

export const getFoodItems = async (tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) return [];

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/foodItems`
    : (ownerId ? `foodItems/${tripId}` : `users/${userId}/trips/${tripId}/foodItems`);

  const snapshot = await get(ref(database, path));
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
};

export const updateFoodItem = async (itemId, updates, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/foodItems/${itemId}`
    : (ownerId ? `foodItems/${tripId}/${itemId}` : `users/${userId}/trips/${tripId}/foodItems/${itemId}`);

  await update(ref(database, path), updates);
};

export const deleteFoodItemFromDB = async (itemId, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/foodItems/${itemId}`
    : (ownerId ? `foodItems/${tripId}/${itemId}` : `users/${userId}/trips/${tripId}/foodItems/${itemId}`);

  await remove(ref(database, path));
};

// ============ ITINERARY ============
// ============ ITINERARY ============
export const saveItineraryItem = async (item, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/itinerary`
    : (ownerId ? `itinerary/${tripId}` : `users/${userId}/trips/${tripId}/itinerary`);

  const itemId = item.id || push(ref(database, path)).key;
  await set(ref(database, `${path}/${itemId}`), { ...item, id: itemId });
  return { ...item, id: itemId };
};

export const saveItinerary = async (itinerary, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/itinerary`
    : (ownerId ? `itinerary/${tripId}` : `users/${userId}/trips/${tripId}/itinerary`);

  const itineraryObj = {};
  itinerary.forEach(item => {
    const id = item.id || push(ref(database, path)).key;
    itineraryObj[id] = { ...item, id };
  });

  await set(ref(database, path), itineraryObj);
};

export const getItinerary = async (tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) return [];

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/itinerary`
    : (ownerId ? `itinerary/${tripId}` : `users/${userId}/trips/${tripId}/itinerary`);

  const snapshot = await get(ref(database, path));
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
};

export const deleteItineraryItemFromDB = async (itemId, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/itinerary/${itemId}`
    : (ownerId ? `itinerary/${tripId}/${itemId}` : `users/${userId}/trips/${tripId}/itinerary/${itemId}`);

  await remove(ref(database, path));
};

// ============ BUDGET ============
// ============ BUDGET ============
export const saveBudget = async (budget, tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) throw new Error('User not authenticated');

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/budget`
    : (ownerId ? `budget/${tripId}` : `users/${userId}/trips/${tripId}/budget`);

  await set(ref(database, path), budget);
};

export const getBudget = async (tripId = null, ownerId = null) => {
  const userId = ownerId || getUserId();
  if (!userId) return { total: 0, categories: {} };

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/budget`
    : (ownerId ? `budget/${tripId}` : `users/${userId}/trips/${tripId}/budget`);

  const snapshot = await get(ref(database, path));
  return snapshot.exists() ? snapshot.val() : { total: 0, categories: {} };
};

// ============ CLEAR & HISTORY ============
export const clearCurrentTripData = async () => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');
  await remove(ref(database, `users/${userId}/currentTrip`));
};

export const saveToHistory = async (tripData) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Use the trip's ID as the history key to ensure we can easily delete/find it later
  const historyId = tripData.id || push(ref(database, `users/${userId}/tripHistory`)).key;
  await set(ref(database, `users/${userId}/tripHistory/${historyId}`), {
    ...tripData,
    id: historyId,
    completedAt: tripData.completedAt || Date.now()
  });
};

export const deleteTripFromHistory = async (tripId) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');
  if (!tripId) return;
  await remove(ref(database, `users/${userId}/tripHistory/${tripId}`));
};

export const getTripHistory = async () => {
  const userId = getUserId();
  if (!userId) return [];
  const snapshot = await get(ref(database, `users/${userId}/tripHistory`));
  return snapshot.exists() ? Object.values(snapshot.val()).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)) : [];
};

// ============ USER SETTINGS (Theme, Currency, etc.) ============
export const saveUserSettings = async (settings) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');
  await update(ref(database, `users/${userId}/settings`), { ...settings, updatedAt: Date.now() });
};

export const saveUserProfile = async (profileData) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');
  await update(ref(database, `users/${userId}/profile`), { ...profileData, updatedAt: Date.now() });
};

export const getUserSettings = async () => {
  const userId = getUserId();
  if (!userId) return null;
  const snapshot = await get(ref(database, `users/${userId}/settings`));
  return snapshot.exists() ? snapshot.val() : null;
};

// ============ DELETE ALL USER DATA ============
export const deleteAllUserData = async () => {
  const userId = getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Remove all user data from database
  await remove(ref(database, `users/${userId}`));
  // console.log('All user data deleted from database');
};

// ============ FEEDBACK ============
export const saveFeedback = async (feedbackData) => {
  const userId = getUserId();
  const feedbackRef = push(ref(database, 'feedback'));
  await set(feedbackRef, {
    ...feedbackData,
    userId: userId || 'anonymous',
    createdAt: Date.now(),
    id: feedbackRef.key
  });
  return feedbackRef.key;
};

export const getFeedbackList = async () => {
  const snapshot = await get(ref(database, 'feedback'));
  return snapshot.exists()
    ? Object.values(snapshot.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    : [];
};

export const deleteFeedback = async (id) => {
  if (!id) return;
  await remove(ref(database, `feedback/${id}`));
};

export const subscribeToFeedback = (callback) => {
  const dbRef = ref(database, 'feedback');
  const unsubscribe = onValue(dbRef, (snapshot) => {
    const data = snapshot.exists()
      ? Object.values(snapshot.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      : [];
    callback(data);
  });
  return () => off(dbRef, 'value', unsubscribe);
};

// ============ REAL-TIME SUBSCRIPTIONS ============
// These functions set up listeners that automatically sync data across all users

/**
 * Subscribe to expenses in real-time
 * @param {string} tripId - Trip ID
 * @param {string} ownerId - Trip owner's user ID
 * @param {function} callback - Called with updated expenses array
 * @returns {function} Unsubscribe function
 */
export const subscribeToExpenses = (tripId, ownerId, callback) => {
  const userId = ownerId || getUserId();
  if (!userId) return () => { };

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/expenses`
    : (ownerId ? `expenses/${tripId}` : `users/${userId}/trips/${tripId}/expenses`);

  const dbRef = ref(database, path);

  const unsubscribe = onValue(dbRef, (snapshot) => {
    const data = snapshot.exists() ? Object.values(snapshot.val()) : [];
    callback(data.sort((a, b) => (b.dateTimestamp || b.createdAt || 0) - (a.dateTimestamp || a.createdAt || 0)));
  }, (error) => {
    console.error('[DB] Expenses subscription error:', error);
  });

  return () => off(dbRef, 'value', unsubscribe);
};

/**
 * Subscribe to budget in real-time
 * @param {string} tripId - Trip ID
 * @param {string} ownerId - Trip owner's user ID
 * @param {function} callback - Called with updated budget object
 * @returns {function} Unsubscribe function
 */
export const subscribeToBudget = (tripId, ownerId, callback) => {
  const userId = ownerId || getUserId();
  if (!userId) return () => { };

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/budget`
    : (ownerId ? `budget/${tripId}` : `users/${userId}/trips/${tripId}/budget`);

  const dbRef = ref(database, path);

  const unsubscribe = onValue(dbRef, (snapshot) => {
    const data = snapshot.exists() ? snapshot.val() : { total: 0, categories: {} };
    callback(data);
  }, (error) => {
    console.error('[DB] Budget subscription error:', error);
  });

  return () => off(dbRef, 'value', unsubscribe);
};

/**
 * Subscribe to itinerary in real-time
 * @param {string} tripId - Trip ID
 * @param {string} ownerId - Trip owner's user ID
 * @param {function} callback - Called with updated itinerary array
 * @returns {function} Unsubscribe function
 */
export const subscribeToItinerary = (tripId, ownerId, callback) => {
  const userId = ownerId || getUserId();
  if (!userId) return () => { };

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/itinerary`
    : (ownerId ? `itinerary/${tripId}` : `users/${userId}/trips/${tripId}/itinerary`);

  const dbRef = ref(database, path);

  const unsubscribe = onValue(dbRef, (snapshot) => {
    const data = snapshot.exists() ? Object.values(snapshot.val()) : [];
    callback(data);
  }, (error) => {
    console.error('[DB] Itinerary subscription error:', error);
  });

  return () => off(dbRef, 'value', unsubscribe);
};

/**
 * Subscribe to food items in real-time
 * @param {string} tripId - Trip ID
 * @param {string} ownerId - Trip owner's user ID
 * @param {function} callback - Called with updated food items array
 * @returns {function} Unsubscribe function
 */
export const subscribeToFoodItems = (tripId, ownerId, callback) => {
  const userId = ownerId || getUserId();
  if (!userId) return () => { };

  const isCurrent = !tripId || tripId === 'current';
  const path = (isCurrent && !ownerId)
    ? `users/${userId}/currentTrip/foodItems`
    : (ownerId ? `foodItems/${tripId}` : `users/${userId}/trips/${tripId}/foodItems`);

  const dbRef = ref(database, path);

  const unsubscribe = onValue(dbRef, (snapshot) => {
    const data = snapshot.exists() ? Object.values(snapshot.val()) : [];
    callback(data);
  }, (error) => {
    console.error('[DB] Food items subscription error:', error);
  });

  return () => off(dbRef, 'value', unsubscribe);
};
