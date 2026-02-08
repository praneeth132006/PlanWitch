import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function SignInScreen({ onNavigateToSignUp, onNavigateToForgotPassword }) {
  const { colors } = useTheme();
  const { signIn, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const styles = createStyles(colors);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password');
      return;
    }

    setError('');
    const result = await signIn(email.trim(), password);

    if (!result.success) {
      setError(result.error);
    }
    // If success, onAuthStateChanged will update user and RootNavigator will show MainApp
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Icon name="route" size={72} color={colors.primary} />
            <Text style={styles.appName}>TravelWitch</Text>
            <Text style={styles.title}>Welcome Back!</Text>
          </View>

          <View style={styles.form}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.icon}>📧</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.icon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={onNavigateToForgotPassword}>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSignIn} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Sign In</Text>}
            </TouchableOpacity>

            <View style={styles.signUpRow}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={onNavigateToSignUp}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 30 },
  logo: { fontSize: 72 },
  appName: { fontSize: 28, fontWeight: 'bold', color: colors.primary, marginTop: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 16 },
  form: { flex: 1 },
  error: { backgroundColor: '#FEE2E2', color: '#DC2626', padding: 12, borderRadius: 10, marginBottom: 16, textAlign: 'center' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.primaryBorder },
  icon: { fontSize: 18, marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text, outlineStyle: 'none' },
  forgot: { color: colors.primary, fontSize: 14, fontWeight: '600', textAlign: 'right', marginBottom: 20 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signUpText: { color: colors.textMuted },
  signUpLink: { color: colors.primary, fontWeight: 'bold' },
});
