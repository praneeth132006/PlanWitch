import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TravelProvider } from '../context/TravelContext';

// Import screens
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MainApp from './MainApp';

export default function AppNavigator() {
  const { colors } = useTheme();
  const { user, initializing } = useAuth();
  const [authScreen, setAuthScreen] = useState('signIn');

  useEffect(() => {
    // console.log('AppNavigator: user =', user?.email || 'null', ', initializing =', initializing);
  }, [user, initializing]);

  // Loading screen
  if (initializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <Text style={styles.loadingLogo}>✈️</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading RouteMate...</Text>
      </View>
    );
  }

  // Authenticated - show main app
  if (user && user.email) {
    return (
      <TravelProvider>
        <MainApp />
      </TravelProvider>
    );
  }

  // Not authenticated - show auth screens
  if (authScreen === 'signUp') {
    return <SignUpScreen onNavigateToSignIn={() => setAuthScreen('signIn')} />;
  }

  if (authScreen === 'forgotPassword') {
    return <ForgotPasswordScreen onNavigateToSignIn={() => setAuthScreen('signIn')} />;
  }

  return (
    <SignInScreen
      onNavigateToSignUp={() => setAuthScreen('signUp')}
      onNavigateToForgotPassword={() => setAuthScreen('forgotPassword')}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    fontSize: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
