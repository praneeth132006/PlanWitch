import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { ref, set, get, update } from 'firebase/database';
import { auth, database } from '../config/firebase';
// Safe import for crashlytics (crashes in Expo Go)
let crashlytics = null;
try {
  crashlytics = require('@react-native-firebase/crashlytics').default;
} catch (e) {
  crashlytics = () => ({ log: () => {}, recordError: () => {} });
}
import { Platform } from 'react-native';

// Sign up with email and password
export const signUp = async (email, password, displayName) => {
  try {
    if (Platform.OS !== 'web') {
      crashlytics().log('User attempting to sign up');
    }
    // console.log('Signing up user:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // console.log('User created:', user.uid);

    // Update display name
    await updateProfile(user, { displayName });
    // console.log('Profile updated with display name');

    // Create user profile in database
    await createUserProfile(user.uid, {
      email: user.email,
      displayName,
      createdAt: new Date().toISOString(),
      photoURL: null,
    });
    // console.log('User profile created in database');

    return { success: true, user };
  } catch (error) {
    console.error('SignUp error:', error);
    return { success: false, error: getErrorMessage(error.code) };
  }
};

// Sign in with email and password
export const signIn = async (email, password) => {
  try {
    // console.log('Signing in user:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // console.log('Sign in successful:', userCredential.user.uid);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('SignIn error:', error);
    return { success: false, error: getErrorMessage(error.code) };
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
    // console.log('Sign out successful');
    return { success: true };
  } catch (error) {
    console.error('SignOut error:', error);
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: getErrorMessage(error.code) };
  }
};

// Create user profile in database
export const createUserProfile = async (userId, profileData) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, {
      ...profileData,
      updatedAt: new Date().toISOString(),
    });
    // console.log('User profile saved to database');
  } catch (error) {
    console.error('Error creating user profile:', error);
    // Don't throw error, just log it - profile creation failure shouldn't block signup
  }
};

// Get user profile from database
export const getUserProfile = async (userId) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
};

// Auth state observer
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    // console.log('Auth state changed:', user ? user.email : 'No user');
    callback(user);
  });
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Error message helper
const getErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email address',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Check your connection',
    'auth/invalid-credential': 'Invalid email or password',
  };
  return errorMessages[errorCode] || `Error: ${errorCode}`;
};
