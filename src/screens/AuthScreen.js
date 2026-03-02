import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, signInWithGoogle, resetPassword, requestOTP, verifyEmailOTP, loading, isAuthenticated, user } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRefs = useRef([]);

  // Resend timer countdown
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);



  // Show message if user is already logged in (edge case)
  React.useEffect(() => {
    if (isAuthenticated && user) {
      Alert.alert(
        'Already Logged In',
        `You are already logged in as ${user.email}. You'll be redirected to the app.`,
        [{ text: 'OK' }]
      );
    }
  }, [isAuthenticated, user]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleOtpDigitChange = useCallback((text, index) => {
    const newDigits = [...otpDigits];
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const pastedDigits = ['', '', '', '', '', ''];
      chars.forEach((c, i) => { pastedDigits[i] = c; });
      setOtpDigits(pastedDigits);
      setOtpValue(chars.join(''));
      const nextIdx = Math.min(chars.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);
    setOtpValue(newDigits.join(''));
    if (errors.otp) setErrors({ ...errors, otp: null });

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }, [otpDigits, errors]);

  const handleOtpKeyPress = useCallback((e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      const newDigits = [...otpDigits];
      newDigits[index - 1] = '';
      setOtpDigits(newDigits);
      setOtpValue(newDigits.join(''));
    }
  }, [otpDigits]);

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setOtpLoading(true);
    const result = await requestOTP(formData.email.trim());
    setOtpLoading(false);
    if (result.success) {
      setResendTimer(30);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpValue('');
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
    } else {
      Alert.alert('Error', result.error || 'Failed to resend code.');
    }
  };
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [legalType, setLegalType] = useState('terms'); // 'terms' or 'privacy'

  const styles = useMemo(() => createStyles(colors), [colors]);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!showForgotPassword) {
      // Password validation
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      // Sign up specific validations
      if (!isLogin) {
        if (!formData.name.trim()) {
          newErrors.name = 'Name is required';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (showForgotPassword) {
      // Handle forgot password
      const result = await resetPassword(formData.email.trim());
      if (result.success) {
        setIsResetSent(true);
      } else {
        Alert.alert('Error', result.error);
      }
    } else if (isLogin) {
      // Handle login
      const result = await signIn(formData.email.trim(), formData.password);
      if (!result.success) {
        // Check if user doesn't exist
        if (result.error && (result.error.includes('No account found') || result.error.includes('user-not-found'))) {
          Alert.alert(
            'Account Not Found',
            'No account found with this email. Please sign up first to create an account.',
            [
              {
                text: 'Go to Sign Up',
                onPress: () => {
                  setIsLogin(false);
                  setFormData({ ...formData, password: '', confirmPassword: '' });
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert('Sign In Failed', result.error);
        }
      }
    } else {
      // Handle sign up - First request OTP
      setOtpLoading(true);
      const result = await requestOTP(formData.email.trim());
      setOtpLoading(false);

      if (result.success) {
        setShowOTP(true);
        setResendTimer(30);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpValue('');
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification code');
      }
    }
  };

  const handleVerifyOTP = async () => {
    const currentOtp = otpDigits.join('');
    if (!currentOtp || currentOtp.length !== 6) {
      setErrors({ ...errors, otp: 'Please enter a 6-digit code' });
      return;
    }

    setOtpLoading(true);
    const verifyResult = await verifyEmailOTP(formData.email.trim(), currentOtp);

    if (verifyResult.success) {
      // Proceed with actual signup after successful OTP verification
      const signupResult = await signUp(formData.email.trim(), formData.password, formData.name.trim());
      setOtpLoading(false);

      if (!signupResult.success) {
        setShowOTP(false);
        Alert.alert('Sign Up Failed', signupResult.error);
      } else {
        // Success! Screen will likely navigate away due to AuthContext user state change
      }
    } else {
      setOtpLoading(false);
      Alert.alert('Verification Failed', verifyResult.error || 'Incorrect code');
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await signInWithGoogle(!isLogin);
    if (!result.success && !result.cancelled) {
      if (result.emailExists) {
        // User already exists - show message and switch to login form
        Alert.alert(
          'Account Already Exists',
          'This email is already registered. Please use the Sign In option to log in.',
          [
            {
              text: 'Go to Sign In',
              onPress: () => {
                setIsLogin(true);
                setFormData({ ...formData, name: '', password: '', confirmPassword: '' });
              },
            },
          ]
        );
      } else if (result.error) {
        Alert.alert('Google Sign In Failed', result.error);
      }
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setShowForgotPassword(false);
    setIsResetSent(false);
    setErrors({});
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
  };

  const handleOpenPrivacy = () => {
    setLegalType('privacy');
    setShowTermsModal(true);
  };

  const handleOpenTerms = () => {
    setLegalType('terms');
    setShowTermsModal(true);
  };

  const renderInput = (field, placeholder, icon, options = {}) => {
    const isPasswordField = options.secureTextEntry;
    const isConfirmPassword = field === 'confirmPassword';
    const isVisible = isConfirmPassword ? showConfirmPassword : showPassword;
    const setVisible = isConfirmPassword ? setShowConfirmPassword : setShowPassword;

    return (
      <View style={styles.inputContainer}>
        <View style={styles.inputIconBg}>
          <View>{icon}</View>
        </View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={formData[field]}
          onChangeText={(text) => {
            setFormData({ ...formData, [field]: text });
            if (errors[field]) setErrors({ ...errors, [field]: null });
          }}
          autoCapitalize={options.autoCapitalize || 'none'}
          keyboardType={options.keyboardType || 'default'}
          secureTextEntry={isPasswordField && !isVisible}
          editable={!loading}
        />
        {isPasswordField && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setVisible(!isVisible)}
          >
            <Text style={styles.eyeIcon}>{isVisible ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header (Premium Logo) */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Icon name="logo" size={42} color={colors.primary} />
            </View>
            <Text style={styles.appName}>PlanWitch</Text>
            <Text style={styles.tagline}>Discover your next adventure</Text>
          </View>

          {/* Centered Dialog Container */}
          <View style={styles.dialogWrapper}>
            <View style={styles.formCard}>
              {showForgotPassword && isResetSent ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIconBg}>
                    <Icon name="check" size={40} color="#10B981" />
                  </View>
                  <Text style={styles.successTitle}>Check Your Email</Text>
                  <Text style={styles.successMessage}>
                    We've sent password reset link to {formData.email}. Check your spam folder if you don't see it.
                  </Text>
                  <TouchableOpacity
                    style={styles.backToLoginBtn}
                    onPress={() => {
                      setShowForgotPassword(false);
                      setIsResetSent(false);
                    }}
                  >
                    <Text style={styles.backToLoginText}>Back to Sign In</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.formTitle}>
                    {showForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back!' : 'Create Account'}
                  </Text>
                  <Text style={styles.formSubtitle}>
                    {showForgotPassword
                      ? 'Enter your email to receive reset instructions'
                      : isLogin
                        ? 'Sign in to continue your adventures'
                        : 'Start planning your dream trips'}
                  </Text>

                  {/* Name Input (Sign Up only) */}
                  {!isLogin && !showForgotPassword && (
                    <View style={styles.inputWrapper}>
                      {renderInput('name', 'Full Name', <Icon name="user" size={18} color={colors.primary} />, { autoCapitalize: 'words' })}
                      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>
                  )}

                  {/* Email Input */}
                  <View style={styles.inputWrapper}>
                    {renderInput('email', 'Email Address', <Icon name="email" size={18} color={colors.primary} />, { keyboardType: 'email-address' })}
                    {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                  </View>

                  {/* Password Input */}
                  {!showForgotPassword && (
                    <View style={styles.inputWrapper}>
                      {renderInput('password', 'Password', <Icon name="password" size={18} color={colors.primary} />, { secureTextEntry: true })}
                      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>
                  )}

                  {/* Confirm Password (Sign Up only) */}
                  {!isLogin && !showForgotPassword && (
                    <View style={styles.inputWrapper}>
                      {renderInput('confirmPassword', 'Confirm Password', <Icon name="password" size={18} color={colors.primary} />, { secureTextEntry: true })}
                      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                    </View>
                  )}

                  {/* Forgot Password Link */}
                  {isLogin && !showForgotPassword && (
                    <TouchableOpacity
                      style={styles.forgotButton}
                      onPress={() => {
                        setShowForgotPassword(true);
                        setIsResetSent(false);
                      }}
                    >
                      <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  )}

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.bg} size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {showForgotPassword ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {!showForgotPassword && (
                    <>
                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                      >
                        <Image
                          source={{ uri: 'https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png' }}
                          style={styles.googleIcon}
                        />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Back to Login (from Forgot Password) */}
                  {showForgotPassword && (
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => setShowForgotPassword(false)}
                    >
                      <Text style={styles.backButtonText}>← Back to Sign In</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* OTP Overlay/View */}
              {showOTP && (
                <View style={styles.otpContainer}>
                  {/* Email Icon */}
                  <View style={styles.otpIconCircle}>
                    <Icon name="email" size={32} color={colors.primary} />
                  </View>

                  <Text style={styles.otpTitle}>Verify Your Email</Text>
                  <Text style={styles.otpSubtitle}>
                    We've sent a 6-digit code to
                  </Text>
                  <Text style={styles.otpEmail}>{formData.email}</Text>

                  {/* 6 Individual Digit Boxes */}
                  <View style={styles.otpDigitsRow}>
                    {otpDigits.map((digit, idx) => (
                      <TextInput
                        key={idx}
                        ref={el => otpInputRefs.current[idx] = el}
                        style={[
                          styles.otpDigitBox,
                          digit ? styles.otpDigitBoxFilled : null,
                          errors.otp ? styles.otpDigitBoxError : null,
                        ]}
                        value={digit}
                        onChangeText={text => handleOtpDigitChange(text, idx)}
                        onKeyPress={e => handleOtpKeyPress(e, idx)}
                        keyboardType="number-pad"
                        maxLength={2}
                        textContentType="oneTimeCode"
                        autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                        selectionColor={colors.primary}
                      />
                    ))}
                  </View>
                  {errors.otp && <Text style={styles.otpErrorText}>{errors.otp}</Text>}

                  {/* Resend Timer */}
                  <View style={styles.otpResendRow}>
                    <Text style={styles.otpResendLabel}>Didn't receive the code? </Text>
                    <TouchableOpacity onPress={handleResendOTP} disabled={resendTimer > 0}>
                      <Text style={[styles.otpResendBtn, resendTimer > 0 && styles.otpResendDisabled]}>
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Verify Button */}
                  <TouchableOpacity
                    style={[styles.otpVerifyBtn, otpLoading && styles.submitButtonDisabled]}
                    onPress={handleVerifyOTP}
                    disabled={otpLoading}
                  >
                    {otpLoading ? (
                      <ActivityIndicator color={colors.bg} size="small" />
                    ) : (
                      <Text style={styles.otpVerifyBtnText}>Verify & Create Account</Text>
                    )}
                  </TouchableOpacity>

                  {/* Edit Details Link */}
                  <TouchableOpacity
                    style={styles.otpBackBtn}
                    onPress={() => {
                      setShowOTP(false);
                      setOtpDigits(['', '', '', '', '', '']);
                      setOtpValue('');
                    }}
                  >
                    <Text style={styles.otpBackText}>← Edit Details</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Switch Mode (Inside Dialog Wrapper) */}
            {!showForgotPassword && (
              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                </Text>
                <TouchableOpacity onPress={switchMode}>
                  <Text style={styles.switchButton}>
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Terms */}
          {!isLogin && !showForgotPassword && (
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink} onPress={handleOpenTerms}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink} onPress={handleOpenPrivacy}>Privacy Policy</Text>
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Legal Dialog (dialog-08) - Web Compatible */}
      {showTermsModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%', width: '90%', maxWidth: 400 }]}>
            <View style={styles.dialogHeader}>
              <View style={[styles.dialogIconContainer, { backgroundColor: colors.primaryMuted }]}>
                <Icon name={legalType === 'terms' ? 'link' : 'lock'} size={24} color={colors.primary} />
              </View>
              <Text style={styles.dialogTitle}>
                {legalType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </Text>
              <Text style={styles.dialogDescription}>
                {legalType === 'terms'
                  ? 'Please review our rules and guidelines for using PlanWitch.'
                  : 'Learn how we collect, use, and protect your personal data.'}
              </Text>
            </View>

            <ScrollView style={styles.legalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalContent}>
                {legalType === 'terms' ? (
                  `Welcome to PlanWitch. By using our application, you agree to:
\n• Use the service responsibly for travel planning.
• Not attempt to copy, modify, or reverse engineer the app.
• Maintain your device security (avoid jailbreaking).
• Acknowledge that AI is used to provide core features.
• Accept responsibility for data charges from your provider.`
                ) : (
                  `Your privacy is our priority. PlanWitch collects:
\n• Registration data (Email, Name) provided by you.
• Automatic data (Device ID, usage patterns) for optimization.
• AI processing data for personalized recommendations.
\nWe do NOT track precise real-time location. Data is shared only with trusted partners like Google and RevenueCat. You can delete your data anytime via profile settings.`
                )}
              </Text>

              <TouchableOpacity
                style={styles.fullLegalLink}
                onPress={() => Linking.openURL(legalType === 'terms' ? 'https://sites.google.com/view/planwitch-tnc/home' : 'https://sites.google.com/view/planwitch/home')}
              >
                <Text style={styles.fullLegalLinkText}>View Full Document →</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.dialogCloseBtn}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={styles.dialogCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView >
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }
    }),
  },
  dialogWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
  },
  logoEmoji: {
    fontSize: 50,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.textMuted,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: 32,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    width: '100%',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 4,
  },
  inputIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  inputIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 14,
    paddingHorizontal: 8,
    outlineStyle: 'none',
  },
  eyeButton: {
    padding: 12,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.primaryBorder,
  },
  dividerText: {
    paddingHorizontal: 12,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardLight,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  switchText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  switchButton: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backToLoginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    minHeight: 52,
    width: '100%',
    alignItems: 'center',
  },
  backToLoginText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: 'bold',
  },
  otpContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: 28,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: `0 4px 12px rgba(0,0,0,0.08)` }
    }),
  },
  otpTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  otpSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  otpEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 28,
  },
  otpDigitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
    width: '100%',
  },
  otpDigitBox: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.cardLight,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    outlineStyle: 'none',
  },
  otpDigitBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  otpDigitBoxError: {
    borderColor: '#EF4444',
  },
  otpErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  otpResendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  otpResendLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  otpResendBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  otpResendDisabled: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  otpVerifyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    width: '100%',
  },
  otpVerifyBtnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: 'bold',
  },
  otpBackBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  otpBackText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal & Dialog Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }
    }),
  },
  dialogHeader: { alignItems: 'center', marginBottom: 24 },
  dialogIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  dialogTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 12, textAlign: 'center' },
  dialogDescription: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  legalScroll: { marginVertical: 20, maxHeight: 300 },
  legalContent: { fontSize: 14, color: colors.text, lineHeight: 24, opacity: 0.9, marginBottom: 8 },
  fullLegalLink: { marginTop: 20, paddingVertical: 12, alignItems: 'center' },
  fullLegalLinkText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  dialogCloseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  dialogCloseText: { color: colors.bg, fontWeight: 'bold', fontSize: 16 },
});
