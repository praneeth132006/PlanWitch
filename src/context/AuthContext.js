import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import nativeAuth from '@react-native-firebase/auth';
import { auth } from '../config/firebase';
import * as DB from '../services/databaseService';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    // Configure Google Sign In (only on native platforms)
    if (Platform.OS !== 'web') {
      GoogleSignin.configure({
        webClientId: '739103871364-8dbqif6ogn8fiiqf4j5gb0h17fj7gdq0.apps.googleusercontent.com',
        offlineAccess: true,
      });
    }
    // console.log('AuthProvider: Setting up listener');

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // console.log('onAuthStateChanged:', firebaseUser?.email || 'null');

      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          emailVerified: firebaseUser.emailVerified,
          photoURL: firebaseUser.photoURL || '',
        });
      } else {
        setUser(null);
      }

      setInitializing(false);
    });

    // Handle Redirect Result (for Google Sign In) - WEB ONLY
    if (Platform.OS === 'web') {
      getRedirectResult(auth).then(async (result) => {
        if (result && result.user) {
          // console.log('Redirect Sign-In Successful:', result.user.email);
          await DB.saveUserProfile({
            displayName: result.user.displayName || '',
            photoURL: result.user.photoURL || '',
            email: result.user.email || '',
          });
        }
      }).catch((error) => {
        console.error('Redirect Sign-In Error:', error);
      });
    }

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Immediately set user state so app transitions to MainNavigator
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || '',
        emailVerified: result.user.emailVerified,
        photoURL: result.user.photoURL || '',
      });

      // console.log('signIn success:', result.user.email);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('signIn error:', error.code);
      let msg = 'Failed to sign in';
      if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password';
      if (error.code === 'auth/user-not-found') msg = 'No account found. Please sign up first.';
      if (error.code === 'auth/wrong-password') msg = 'Incorrect password';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, displayName) => {
    try {
      // Check if user is already logged in (prevents auto-auth interference)
      if (auth.currentUser) {
        return {
          success: false,
          error: 'You are already logged in. Please sign out first to create a new account.',
          alreadyLoggedIn: true
        };
      }

      setLoading(true);

      // Check if email already exists in Firebase
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods && signInMethods.length > 0) {
        setLoading(false);
        return {
          success: false,
          error: 'This email is already registered. Please use Sign In instead.',
          emailExists: true
        };
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }

      // Immediately set user state so app transitions to MainNavigator
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName || result.user.displayName || '',
        emailVerified: result.user.emailVerified,
        photoURL: result.user.photoURL || '',
      });

      // Save user profile to database for persistence
      await DB.saveUserProfile({
        displayName: displayName || '',
        photoURL: '',
        email: result.user.email || '',
      });

      // Mark as new user for onboarding
      setIsNewUser(true);

      // console.log('signUp success:', result.user.email);
      return { success: true, user: result.user, isNewUser: true };
    } catch (error) {
      console.error('signUp error:', error.code);
      let msg = 'Failed to create account';
      let emailExists = false;
      if (error.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
        emailExists = true;
      }
      if (error.code === 'auth/weak-password') msg = 'Password too weak';
      return { success: false, error: msg, emailExists };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (isSignUp = false) => {
    try {
      setLoading(true);

      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const additionalUserInfo = getAdditionalUserInfo(result);

        // If user is trying to sign up but already had an account
        if (isSignUp && !additionalUserInfo?.isNewUser) {
          await firebaseSignOut(auth);
          setUser(null);
          setLoading(false);
          return {
            success: false,
            error: 'This account already exists. Please use Sign In instead.',
            emailExists: true
          };
        }

        // Mirror user profile in database for persistence
        if (result.user) {
          await DB.saveUserProfile({
            displayName: result.user.displayName || '',
            photoURL: result.user.photoURL || '',
            email: result.user.email || '',
          });
        }

        // Mark as new user for onboarding if this is a new signup
        const userIsNew = additionalUserInfo?.isNewUser || false;
        if (userIsNew) {
          setIsNewUser(true);
        }

        setLoading(false);
        return { success: true, user: result.user, isNewUser: userIsNew };
      } else {
        // Native Google Sign In
        await GoogleSignin.hasPlayServices();
        const { data } = await GoogleSignin.signIn();
        const idToken = data.idToken;

        // Create a Google credential with the token
        const googleCredential = nativeAuth.GoogleAuthProvider.credential(idToken);

        // Sign-in with the credential
        const userCredential = await nativeAuth().signInWithCredential(googleCredential);

        // Mirror user profile in database
        if (userCredential.user) {
          await DB.saveUserProfile({
            displayName: userCredential.user.displayName || '',
            photoURL: userCredential.user.photoURL || '',
            email: userCredential.user.email || '',
          });

          // Check if it's a new user (Note: native SDK handles this differently, usually via database check)
          // For now, let's assume if they don't have a profile yet, it's new
          const profile = await DB.getUserProfile(userCredential.user.uid);
          if (!profile || !profile.email) {
            setIsNewUser(true);
          }
        }

        setLoading(false);
        return { success: true, user: userCredential.user };
      }
    } catch (error) {
      console.error('signInWithGoogle error:', error.code, error.message);
      setLoading(false);

      // Handle cancelled or errors
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request' || error.message?.includes('Sign in cancelled')) {
        return { success: false, cancelled: true };
      }

      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    // console.log('AuthContext.signOut: Starting...');
    try {
      setLoading(true);

      await firebaseSignOut(auth);

      // console.log('AuthContext.signOut: Firebase signOut complete');
      // onAuthStateChanged will set user to null

      return { success: true };
    } catch (error) {
      console.error('AuthContext.signOut: Error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, updates);
        // Also mirror in database for persistence and sync
        await DB.saveUserProfile(updates);
        setUser(prev => prev ? { ...prev, ...updates } : null);
        return { success: true };
      }
      return { success: false, error: 'No user' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('resetPassword error:', error.code, error.message);
      return { success: false, error: error.message };
    }
  };

  const deleteAccount = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return { success: false, error: 'No user logged in' };

      // First delete all user data from database
      await DB.deleteAllUserData();

      // Then delete the user from Firebase Authentication
      await deleteUser(currentUser);

      // User will be automatically signed out
      return { success: true };
    } catch (error) {
      console.error('Delete account error:', error);
      let msg = 'Failed to delete account';
      if (error.code === 'auth/requires-recent-login') {
        msg = 'Please sign in again before deleting your account';
      }
      return { success: false, error: msg };
    }
  };

  const clearNewUserFlag = () => {
    setIsNewUser(false);
  };

  const value = {
    user,
    loading,
    initializing,
    isAuthenticated: !!user,
    isNewUser,
    clearNewUserFlag,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateUserProfile,
    resetPassword,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
