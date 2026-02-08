import React from 'react';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TravelProvider } from './src/context/TravelContext';
import { AlertProvider } from './src/context/AlertContext';
import MainNavigator from './src/navigation/MainNavigator';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertSystem from './src/components/AlertSystem';
import AppLoading from './src/components/AppLoading';
import { Platform } from 'react-native';
import { PremiumProvider } from './src/context/PremiumContext';
import AdService from './src/services/AdService';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.emoji}>⚠️</Text>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>{this.state.error?.message || 'Unknown error'}</Text>
          <Text style={errorStyles.hint}>Please restart the app</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#1F2937' },
  emoji: { fontSize: 60, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#EF4444', marginBottom: 12 },
  message: { fontSize: 14, color: '#D1D5DB', textAlign: 'center', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 16 },
});

function AppContent() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, loading, initializing, isNewUser, clearNewUserFlag } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  // When isNewUser becomes true, show onboarding
  React.useEffect(() => {
    if (isAuthenticated && isNewUser) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, isNewUser]);

  const handleOnboardingFinish = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      setShowOnboarding(false);
      clearNewUserFlag(); // Reset the flag after onboarding is done
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      setShowOnboarding(false);
      clearNewUserFlag();
    }
  };

  React.useEffect(() => {
    // Show splash for at least 2 seconds if initializing or loading
    if (!initializing && !loading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2000); // 2 seconds minimum splash for a premium feel
      return () => clearTimeout(timer);
    } else {
      setShowSplash(true);
    }
  }, [initializing, loading]);

  // Show premium loading screen
  if (showSplash || initializing) {
    return <AppLoading />;
  }

  return (
    <View style={styles.responsiveWrapper}>
      <View style={[styles.mainView, Platform.OS === 'web' && styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.bg}
        />
        {!isAuthenticated ? (
          <AuthScreen />
        ) : showOnboarding ? (
          <OnboardingScreen onFinish={handleOnboardingFinish} />
        ) : (
          <MainNavigator />
        )}
        <AlertSystem />
      </View>
    </View>
  );
}




export default function App() {
  React.useEffect(() => {
    AdService.init();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthProvider>
            <ThemeProvider>
              <PremiumProvider>
                <TravelProvider>
                  <AlertProvider>
                    <AppContent />
                  </AlertProvider>
                </TravelProvider>
              </PremiumProvider>
            </ThemeProvider>
          </AuthProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  loadingHint: {
    fontSize: 14,
    marginTop: 12,
  },
  mainView: {
    flex: 1,
  },
  responsiveWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  ...Platform.select({
    web: {
      responsiveWrapper: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
      },
      container: {
        width: '100%',
        maxWidth: 500, // Mobile app appearance on desktop
        height: '100%',
        backgroundColor: '#0D0D0D',
        alignSelf: 'center',
        overflow: 'hidden',
        boxShadow: '0 0 50px rgba(0,0,0,0.5)',
      }
    },
    default: {
      responsiveWrapper: {
        flex: 1,
        backgroundColor: '#0D0D0D',
      }
    }
  })
});

