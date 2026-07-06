import React from 'react';
import { StyleSheet, Alert } from 'react-native';
import { useTravelContext } from '../context/TravelContext';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../context/PremiumContext';
import * as DB from '../services/databaseService';
import AdService from '../services/AdService';
import TripDashboardScreen from '../screens/TripDashboardScreen';

// Screens
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
import SubscriptionScreen from '../screens/SubscriptionScreen';
import AdminScreen from '../screens/AdminScreen';
import AIChatScreen from '../screens/AIChatScreen';

export default function MainNavigator() {
  const [currentScreen, setCurrentScreen] = React.useState('Welcome');
  const [pendingJoinTrip, setPendingJoinTrip] = React.useState(null);

  const {
    setTripInfo,
    tripInfo,
    saveCurrentTripToList,
    switchToTrip,
    restoreActiveTrip,
  } = useTravelContext();

  const { user } = useAuth();
  const { isPremium } = usePremium();

  const hasActiveTrip = !!(
    tripInfo.destination ||
    tripInfo.startDate ||
    tripInfo.name
  );

  const handlePlanTrip = () => {
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

  const handleMyTrip = () => {
    if (!isPremium) {
      AdService.showInterstitial();
    }

    setCurrentScreen('TripDashboard');
  };

  const handleProfile = () => {
    setCurrentScreen('Profile');
  };

  const handleBackToHome = async () => {
    if (restoreActiveTrip) {
      await restoreActiveTrip();
    }

    setCurrentScreen('Welcome');
  };

  const handleTripSetupBack = () => {
    setCurrentScreen('Welcome');
  };

  const handlePreferencesBack = () => {
    setCurrentScreen('TripDashboard');
  };

  const handlePreferencesComplete = (data) => {
    if (data === 'Subscription') {
      setCurrentScreen('Subscription');
      return;
    }

    setCurrentScreen('TripDashboard');
  };

  const handleTripSetupComplete = async (tripData) => {
    try {
      const { aiData, ...cleanTripData } = tripData;

      let newTrip;

      if (saveCurrentTripToList) {
        newTrip = await saveCurrentTripToList({
          ...cleanTripData,
          budget: {
            total: parseFloat(tripData.budget) || 0,
            categories: {},
          },
        });
      }

      if (aiData && newTrip?.id) {
        if (
          aiData.itinerary &&
          Array.isArray(aiData.itinerary)
        ) {
          for (const day of aiData.itinerary) {
            if (day.activities) {
              for (const activity of day.activities) {
                const newItem = {
                  id:
                    Date.now().toString() +
                    Math.random()
                      .toString(36)
                      .substr(2, 5),
                  dayNumber: day.day,
                  name: activity.title,
                  type: 'attraction',
                  time: activity.time,
                  notes: activity.description,
                  location: '',
                  duration: '2h',
                  cost: '',
                };

                await DB.saveItineraryItem(
                  newItem,
                  newTrip.id,
                  newTrip.ownerId
                );
              }
            }
          }
        }

        if (
          aiData.expenses &&
          Array.isArray(aiData.expenses)
        ) {
          for (const exp of aiData.expenses) {
            const newExpense = {
              id:
                Date.now().toString() +
                Math.random()
                  .toString(36)
                  .substr(2, 5),
              title: exp.note || exp.category,
              category: exp.category,
              amount: exp.amount,
              date: new Date().toISOString(),
              paidBy:
                newTrip.ownerId || user?.uid,
              splitType: 'equal',
              splitAmounts: {},
              beneficiaries: [],
              createdAt: Date.now(),
            };

            await DB.saveExpense(
              newExpense,
              newTrip.id,
              newTrip.ownerId
            );
          }
        }
      }

      if (!isPremium) {
        AdService.showInterstitial();
      }

      setCurrentScreen('TripDashboard');
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Error',
        'Failed to save trip. Please try again.'
      );
    }
  };

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
    return (
      <ProfileScreen
        onBack={handleBackToHome}
        onOpenTrip={handleMyTrip}
        onNavigate={setCurrentScreen}
      />
    );
  }

  if (currentScreen === 'TripDashboard') {
  return (
    <TripDashboardScreen
      navigation={{
        navigate: setCurrentScreen,
      }}
    />
  );
}

  if (currentScreen === 'AIChat') {
    return (
      <AIChatScreen
        onBack={() =>
          setCurrentScreen('TripDashboard')
        }
      />
    );
  }

  if (currentScreen === 'Itinerary') {
    return (
      <MapScreen
        onBackToHome={() =>
          setCurrentScreen('TripDashboard')
        }
        onSetScreen={setCurrentScreen}
      />
    );
  }

  if (currentScreen === 'Expenses') {
    return (
      <ExpenseScreen
        onBackToHome={() =>
          setCurrentScreen('TripDashboard')
        }
        onSetScreen={setCurrentScreen}
      />
    );
  }

  if (currentScreen === 'Budget') {
    return (
      <BudgetScreen
        onBackToHome={() =>
          setCurrentScreen('TripDashboard')
        }
        onSetScreen={setCurrentScreen}
      />
    );
  }

  if (currentScreen === 'Packing') {
    return (
      <PackingScreen
        onBackToHome={() =>
          setCurrentScreen('TripDashboard')
        }
        onSetScreen={setCurrentScreen}
      />
    );
  }

  if (currentScreen === 'Food') {
    return (
      <FoodChecklistScreen
        onBackToHome={() =>
          setCurrentScreen('TripDashboard')
        }
        onSetScreen={setCurrentScreen}
      />
    );
  }

  if (currentScreen === 'AIPersonalizedPlan') {
    return (
      <AIPersonalizedPlanScreen
        navigation={{
          goBack: handleBackToHome,
          navigate: setCurrentScreen,
        }}
      />
    );
  }

  if (currentScreen === 'Subscription') {
    return (
      <SubscriptionScreen
        navigation={{
          goBack: () =>
            setCurrentScreen('Profile'),
          navigate: setCurrentScreen,
        }}
      />
    );
  }

  if (currentScreen.startsWith('Admin')) {
    const tab =
      currentScreen === 'AdminCoupons'
        ? 'coupons'
        : 'feedback';

    return (
      <AdminScreen
        navigation={{
          goBack: () =>
            setCurrentScreen('Profile'),
        }}
        initialTab={tab}
      />
    );
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