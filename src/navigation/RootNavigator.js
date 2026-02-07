import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { TravelProvider } from '../context/TravelContext';

import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MainApp from './MainApp';

export default function RootNavigator() {
  const { colors } = useTheme();
  const { user, initializing } = useAuth();
  const [authScreen, setAuthScreen] = useState('signIn');

  // Reset to signIn screen when user logs out
  useEffect(() => {
    // console.log('RootNavigator useEffect: user =', user?.email || 'null');
    if (!user && !initializing) {
      // console.log('RootNavigator: User is null, showing SignIn screen');
      setAuthScreen('signIn');
    }
  }, [user, initializing]);

  // console.log('RootNavigator render:', {
  //   hasUser: !!user,
  //   userEmail: user?.email || 'null',
  //   initializing,
  //   authScreen
  // });

  // Loading state
  if (initializing) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <Text style={styles.logo}>✈️</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.text, { color: colors.textMuted }]}>Loading RouteMate...</Text>
      </View>
    );
  }

  // Authenticated - show main app wrapped in TravelProvider
  if (user && user.email) {
    // console.log('RootNavigator: User authenticated, showing MainApp');
    return (
      <TravelProvider>
        <MainApp />
      </TravelProvider>
    );
  }

  // Not authenticated - show auth screens
  // console.log('RootNavigator: No user, showing:', authScreen);

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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});
