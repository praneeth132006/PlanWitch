import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import * as DB from '../services/databaseService';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import AdService from '../services/AdService';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import ExpenseScreen from '../screens/ExpenseScreen';
import PackingScreen from '../screens/PackingScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TripSetupScreen from '../screens/TripSetupScreen';
import BudgetScreen from '../screens/BudgetScreen';

import JoinSelectionScreen from '../screens/JoinSelectionScreen';
import FoodChecklistScreen from '../screens/FoodChecklistScreen';
import AIPersonalizedPlanScreen from '../screens/AIPersonalizedPlanScreen';
import TripPreferencesScreen from '../screens/TripPreferencesScreen';
import Icon from '../components/Icon';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import AdminScreen from '../screens/AdminScreen';



// Main Navigator
export default function MainNavigator() {
  const [currentScreen, setCurrentScreen] = React.useState('Welcome');
  const [pendingJoinTrip, setPendingJoinTrip] = React.useState(null);
  const { setTripInfo, setBudget, tripInfo, saveCurrentTripToList, joinTripByCode, switchToTrip, restoreActiveTrip } = useTravelContext();
  const { user } = useAuth();
  const { isPremium } = usePremium();

  // Check if there's an active trip
  const hasActiveTrip = !!(tripInfo.destination || tripInfo.startDate || tripInfo.name);

  const handlePlanTrip = () => {
    // console.log('Plan trip pressed - navigating to TripSetup');
    setCurrentScreen('TripSetup');
  };

  const handleJoinTrip = (trip) => {
    setPendingJoinTrip(trip);
    setCurrentScreen('JoinSelection');
  };

  const handleJoinComplete = (trip) => {
    setPendingJoinTrip(null);
    if (trip) {
      if (switchToTrip) {
        switchToTrip(trip);
      } else {
        setTripInfo(trip);
      }
    }
    setCurrentScreen('TripDashboard');
  };

  const handleMyTrip = (trip, index) => {
    // console.log('Open trip:', trip?.destination);

    // Show Ad for free users
    if (!isPremium) {
      AdService.showInterstitial();
    }

    setCurrentScreen('TripDashboard');
  };

  const handleProfile = () => {
    setCurrentScreen('Profile');
  };

  const handleBackToHome = async () => {
    // If we were viewing a completed trip, restore the actual active trip
    if (restoreActiveTrip) {
      await restoreActiveTrip();
    }
    setCurrentScreen('Welcome');
  };

  const handleTripSetupComplete = async (tripData) => {
    // console.log('Trip setup complete - saving:', tripData.destination);

    try {
      // Extract AI Data if present
      const { aiData, ...cleanTripData } = tripData;

      // 1. One single call to save everything
      // This will generate ID/code AND set the trip as "active" in the context
      let newTrip;
      if (saveCurrentTripToList) {
        newTrip = await saveCurrentTripToList({
          ...cleanTripData,
          budget: { total: parseFloat(tripData.budget) || 0, categories: {} }
        });
      }

      // 2. Process AI Data if available
      if (aiData && newTrip && newTrip.id) {
        // console.log('Processing AI generated data for trip:', newTrip.id);

        // Save Itinerary
        if (aiData.itinerary && Array.isArray(aiData.itinerary)) {
          for (const day of aiData.itinerary) {
            if (day.activities) {
              for (const activity of day.activities) {
                const newItem = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  dayNumber: day.day,
                  name: activity.title,
                  type: 'attraction', // Default type
                  time: activity.time,
                  notes: activity.description,
                  location: '',
                  duration: '2h',
                  cost: ''
                };
                // Save directly to DB to ensure it goes to the correct trip ID immediately
                await DB.saveItineraryItem(newItem, newTrip.id, newTrip.ownerId);
              }
            }
          }
        }

        // Save Expenses
        if (aiData.expenses && Array.isArray(aiData.expenses)) {
          for (const exp of aiData.expenses) {
            const newExpense = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              title: exp.note || exp.category,
              category: exp.category,
              amount: exp.amount,
              date: new Date().toISOString(),
              paidBy: newTrip.ownerId || user?.uid,
              splitType: 'equal',
              splitAmounts: {},
              beneficiaries: [],
              createdAt: Date.now()
            };
            await DB.saveExpense(newExpense, newTrip.id, newTrip.ownerId);
          }
        }
      }

      // 3. Navigate directly to TripDashboard as requested
      // Show Ad for free users before moving to dashboard
      if (!isPremium) {
        AdService.showInterstitial();
      }
      setCurrentScreen('TripDashboard');
    } catch (error) {
      console.error('Error in handleTripSetupComplete:', error);
      Alert.alert('Error', 'Failed to save trip. Please try again.');
    }
  };

  const handleTripSetupBack = () => {
    setCurrentScreen('Welcome');
  };

  // console.log('MainNavigator - currentScreen:', currentScreen);

  // Navigation Handlers for Preferences
  const handlePreferencesBack = () => {
    // If they go back from preferences, generally go to dashboard
    setCurrentScreen('TripDashboard');
  };

  const handlePreferencesComplete = (data) => {
    // If user clicked "Upgrade" in the preferences gate
    if (data === 'Subscription') {
      setCurrentScreen('Subscription');
      return;
    }
    // After finishing preferences, go to dashboard
    setCurrentScreen('TripDashboard');
  };

  // Render based on current screen
  if (currentScreen === 'TripSetup') {
    return (
      <TripSetupScreen
        onComplete={handleTripSetupComplete}
        onBack={handleTripSetupBack}
      />
    );
  }

  if (currentScreen === 'TripPreferences') {
    return (
      <TripPreferencesScreen
        onBack={handlePreferencesBack}
        onComplete={handlePreferencesComplete}
      />
    );
  }

  if (currentScreen === 'Profile') {
    return <ProfileScreen onBack={handleBackToHome} onOpenTrip={handleMyTrip} onNavigate={setCurrentScreen} />;
  }

  if (currentScreen === 'TripDashboard') {
    return <HomeScreen onBackToHome={handleBackToHome} onSetScreen={setCurrentScreen} />;
  }

  // Standalone Access for previously tabbed screens
  if (currentScreen === 'Itinerary') {
    return <MapScreen onBackToHome={() => setCurrentScreen('TripDashboard')} onSetScreen={setCurrentScreen} />;
  }
  if (currentScreen === 'Expenses') {
    return <ExpenseScreen onBackToHome={() => setCurrentScreen('TripDashboard')} onSetScreen={setCurrentScreen} />;
  }
  if (currentScreen === 'Budget') {
    return <BudgetScreen onBackToHome={() => setCurrentScreen('TripDashboard')} onSetScreen={setCurrentScreen} />;
  }
  if (currentScreen === 'Packing') {
    return <PackingScreen onBackToHome={() => setCurrentScreen('TripDashboard')} onSetScreen={setCurrentScreen} />;
  }
  if (currentScreen === 'Food') {
    return <FoodChecklistScreen onBackToHome={() => setCurrentScreen('TripDashboard')} onSetScreen={setCurrentScreen} />;
  }

  if (currentScreen === 'AIPersonalizedPlan') {
    return <AIPersonalizedPlanScreen navigation={{ goBack: handleBackToHome, navigate: setCurrentScreen }} />;
  }

  if (currentScreen === 'Subscription') {
    return <SubscriptionScreen navigation={{ goBack: () => setCurrentScreen('Profile'), navigate: setCurrentScreen }} />;
  }

  if (currentScreen.startsWith('Admin')) {
    const tab = currentScreen === 'AdminCoupons' ? 'coupons' : 'feedback';
    return <AdminScreen navigation={{ goBack: () => setCurrentScreen('Profile') }} initialTab={tab} />;
  }

  if (currentScreen === 'JoinSelection') {
    return (
      <JoinSelectionScreen
        trip={pendingJoinTrip}
        onBack={() => {
          setPendingJoinTrip(null);
          setCurrentScreen('Welcome');
        }}
        onJoinComplete={handleJoinComplete}
      />
    );
  }

  // Default: Welcome screen
  return (
    <WelcomeScreen
      onPlanTrip={handlePlanTrip}
      onJoinTrip={handleJoinTrip}
      onMyTrip={handleMyTrip}
      onProfile={handleProfile}
      onSetScreen={setCurrentScreen}
      hasActiveTrip={hasActiveTrip}
    />
  );
}

const styles = StyleSheet.create({});
