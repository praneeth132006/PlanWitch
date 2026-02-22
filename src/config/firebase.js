import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  off
} from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your Firebase configuration - EXACT copy from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCe3UjVQXIQDD6zl39rfOcpGSNzOtVPMFk",
  authDomain: "routemate-6a885.firebaseapp.com",
  databaseURL: "https://routemate-6a885-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "routemate-6a885",
  storageBucket: "routemate-6a885.firebasestorage.app",
  messagingSenderId: "739103871364",
  appId: "1:739103871364:web:7b8a634332576653244dd1",
  measurementId: "G-CB7TZM1E38"
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence
let auth;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} catch (error) {
  auth = getAuth(app);
}

// Initialize Realtime Database
const database = getDatabase(app);

// Initialize Analytics & Performance (Web Only)
let analytics;
let performance;

if (Platform.OS === 'web') {
  // Dynamic imports to avoid breaking native builds if packages aren't perfectly aligned
  import('firebase/analytics').then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
    console.log('Firebase Analytics initialized');
  }).catch(e => console.log('Analytics not supported in this env'));

  import('firebase/performance').then(({ getPerformance }) => {
    performance = getPerformance(app);
    console.log('Firebase Performance initialized');
  }).catch(e => console.log('Performance not supported in this env'));
}

export {
  auth,
  database,
  getFunctions,
  httpsCallable,
  analytics,
  performance,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  // Database exports
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  off
};

export default app;
