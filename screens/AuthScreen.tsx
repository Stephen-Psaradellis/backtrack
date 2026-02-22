/**
 * AuthScreen
 *
 * Authentication screen with login and signup forms using Supabase email auth.
 * Provides email/password input fields with toggle between login and signup modes.
 *
 * Features:
 * - Email and password input fields
 * - Toggle between login and signup modes
 * - Confirm password validation for signup
 * - Age verification (18+) for signup
 * - Terms and privacy policy acceptance for signup
 * - Email verification flow for new accounts
 * - Form validation
 * - Loading state during authentication
 * - Error display
 * - Forgot password navigation
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

import { useAuth } from '../contexts/AuthContext'
import { Button, GhostButton } from '../components/Button'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { TermsModal } from '../components/TermsModal'
import { SocialLoginButton } from '../components/SocialLoginButton'
import { useSocialAuth } from '../hooks/useSocialAuth'
import { successFeedback, errorFeedback } from '../lib/haptics'
import { trackEvent, AnalyticsEvent } from '../lib/analytics'
import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import type { AuthStackNavigationProp } from '../navigation/types'

// ============================================================================
// TYPES
// ============================================================================

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}

type AuthMode = 'login' | 'signup'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * RFC 5322 compliant email regex
 * Validates:
 * - Local part: alphanumeric, dots, underscores, hyphens, plus signs
 * - Domain: valid domain name with TLD (2+ characters)
 * - Prevents common invalid patterns like double dots, leading/trailing dots
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

/**
 * Minimum password length for security
 * NIST recommends 8+ characters minimum for user-generated passwords
 */
const MIN_PASSWORD_LENGTH = 8

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AuthScreen - Login screen with Supabase email authentication
 *
 * @example
 * // Used in navigation
 * <Stack.Screen name="Login" component={AuthScreen} />
 */
export function AuthScreen(): React.ReactNode {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<AuthStackNavigationProp>()
  const { signIn, signUp, isLoading: authLoading } = useAuth()
  const {
    signInWithApple,
    signInWithGoogle,
    isAppleAvailable,
    isGoogleConfigured,
    appleLoading,
    googleLoading,
  } = useSocialAuth()

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isOver18, setIsOver18] = useState(false)

  // ---------------------------------------------------------------------------
  // ANIMATION VALUES
  // ---------------------------------------------------------------------------

  // Header animations
  const titleOpacity = useRef(new Animated.Value(0)).current
  const titleTranslateY = useRef(new Animated.Value(-30)).current
  const subtitleOpacity = useRef(new Animated.Value(0)).current

  // Input animations
  const emailOpacity = useRef(new Animated.Value(0)).current
  const emailTranslateY = useRef(new Animated.Value(20)).current
  const passwordOpacity = useRef(new Animated.Value(0)).current
  const passwordTranslateY = useRef(new Animated.Value(20)).current
  const confirmPasswordOpacity = useRef(new Animated.Value(0)).current
  const confirmPasswordTranslateY = useRef(new Animated.Value(20)).current

  // Button animations
  const buttonOpacity = useRef(new Animated.Value(0)).current
  const buttonTranslateY = useRef(new Animated.Value(20)).current

  // Error shake animation
  const errorShakeX = useRef(new Animated.Value(0)).current

  // Social login section animations
  const socialOpacity = useRef(new Animated.Value(0)).current
  const socialTranslateY = useRef(new Animated.Value(20)).current

  // ---------------------------------------------------------------------------
  // ANIMATION EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Entrance animation sequence on mount
   */
  useEffect(() => {
    // Reset all values to initial state
    titleOpacity.setValue(0)
    titleTranslateY.setValue(-30)
    subtitleOpacity.setValue(0)
    emailOpacity.setValue(0)
    emailTranslateY.setValue(20)
    passwordOpacity.setValue(0)
    passwordTranslateY.setValue(20)
    confirmPasswordOpacity.setValue(0)
    confirmPasswordTranslateY.setValue(20)
    buttonOpacity.setValue(0)
    buttonTranslateY.setValue(20)
    socialOpacity.setValue(0)
    socialTranslateY.setValue(20)

    // Create entrance animation sequence
    Animated.sequence([
      // 1. Logo/title: fade in + slide down
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 2. Subtitle: fade in after 200ms delay (already delayed by title animation)
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
      // 3. Stagger input fields
      Animated.stagger(100, [
        // Email field
        Animated.parallel([
          Animated.timing(emailOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(emailTranslateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Password field
        Animated.parallel([
          Animated.timing(passwordOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(passwordTranslateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Confirm password (if in signup mode)
        ...(mode === 'signup'
          ? [
              Animated.parallel([
                Animated.timing(confirmPasswordOpacity, {
                  toValue: 1,
                  duration: 400,
                  useNativeDriver: true,
                }),
                Animated.timing(confirmPasswordTranslateY, {
                  toValue: 0,
                  duration: 400,
                  useNativeDriver: true,
                }),
              ]),
            ]
          : []),
      ]),
      // 4. Buttons: fade in + slide up
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 5. Social login section: fade in + slide up
      Animated.parallel([
        Animated.timing(socialOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(socialTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [
    mode,
    titleOpacity,
    titleTranslateY,
    subtitleOpacity,
    emailOpacity,
    emailTranslateY,
    passwordOpacity,
    passwordTranslateY,
    confirmPasswordOpacity,
    confirmPasswordTranslateY,
    buttonOpacity,
    buttonTranslateY,
    socialOpacity,
    socialTranslateY,
  ])

  /**
   * Error shake animation when errors.general changes
   */
  useEffect(() => {
    if (errors.general) {
      // Reset shake position
      errorShakeX.setValue(0)

      // Shake animation: 0 → 10 → -10 → 10 → -10 → 0
      Animated.sequence([
        Animated.timing(errorShakeX, {
          toValue: 10,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeX, {
          toValue: -10,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeX, {
          toValue: 10,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeX, {
          toValue: -10,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeX, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [errors.general, errorShakeX])

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  /**
   * Validate form inputs
   * @returns true if valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    }

    // Confirm password validation (signup only)
    if (mode === 'signup') {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0

    // Trigger error haptic feedback on validation failures
    if (!isValid) {
      errorFeedback()
    }

    return isValid
  }, [email, password, confirmPassword, mode])

  /**
   * Clear error for a specific field when user starts typing
   */
  const clearFieldError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      delete newErrors.general
      return newErrors
    })
  }, [])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle login button press
   */
  const handleLogin = useCallback(async () => {
    // Validate form
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const { error } = await signIn(email.trim(), password)

      if (error) {
        // Map Supabase error messages to user-friendly messages
        let errorMessage = 'An error occurred during login. Please try again.'
        let errorType = 'unknown'

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
          errorType = 'invalid_credentials'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before logging in. Check your inbox for a verification link.'
          errorType = 'email_not_confirmed'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.'
          errorType = 'rate_limited'
        } else if (error.message) {
          errorMessage = error.message
        }

        // Track auth error (no PII - just error type)
        trackEvent(AnalyticsEvent.AUTH_ERROR, { error_type: errorType, source: 'login' })

        // Trigger error haptic feedback on auth API errors
        await errorFeedback()
        setErrors({ general: errorMessage })
      } else {
        // Track successful login
        trackEvent(AnalyticsEvent.LOGIN)
        // Trigger success haptic feedback on successful login
        await successFeedback()
      }
      // Success case: AuthContext listener will handle navigation
    } catch {
      // Trigger error haptic feedback on unexpected errors
      await errorFeedback()
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [email, password, signIn, validateForm])

  /**
   * Handle forgot password navigation
   */
  const handleForgotPassword = useCallback(() => {
    navigation.navigate('ForgotPassword')
  }, [navigation])

  /**
   * Handle signup button press
   * First validates form, then shows terms modal if not yet accepted
   */
  const handleSignup = useCallback(async () => {
    // Validate form first
    if (!validateForm()) {
      return
    }

    // If terms not yet accepted, show terms modal
    if (!termsAccepted) {
      setShowTermsModal(true)
      return
    }

    // Proceed with actual signup
    await performSignup()
  }, [validateForm, termsAccepted])

  /**
   * Perform the actual signup after terms acceptance
   */
  const performSignup = useCallback(async () => {
    setIsSubmitting(true)
    setErrors({})

    try {
      const { error } = await signUp(email.trim(), password)

      if (error) {
        // Map Supabase error messages to user-friendly messages
        let errorMessage = 'An error occurred during signup. Please try again.'
        let errorType = 'unknown'

        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.'
          errorType = 'user_exists'
        } else if (error.message.includes('Password should be')) {
          errorMessage = 'Password does not meet security requirements. Please use a stronger password.'
          errorType = 'weak_password'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.'
          errorType = 'invalid_email'
        } else if (error.message.includes('Signup is disabled')) {
          errorMessage = 'Signup is currently disabled. Please try again later.'
          errorType = 'signup_disabled'
        } else if (error.message) {
          errorMessage = error.message
        }

        // Track auth error (no PII - just error type)
        trackEvent(AnalyticsEvent.AUTH_ERROR, { error_type: errorType, source: 'signup' })

        // Trigger error haptic feedback on auth API errors
        await errorFeedback()
        setErrors({ general: errorMessage })
      } else {
        // Track successful signup
        trackEvent(AnalyticsEvent.SIGN_UP)
        // Trigger success haptic feedback on successful signup (before showing verification message)
        await successFeedback()
        // Success - show verification message
        setSignupSuccess(true)
      }
    } catch {
      // Trigger error haptic feedback on unexpected errors
      await errorFeedback()
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [email, password, signUp])

  /**
   * Handle terms acceptance from modal
   */
  const handleTermsAccept = useCallback(() => {
    setTermsAccepted(true)
    setShowTermsModal(false)
    // Proceed with signup after accepting terms
    performSignup()
  }, [performSignup])

  /**
   * Handle terms decline from modal
   */
  const handleTermsDecline = useCallback(() => {
    setShowTermsModal(false)
  }, [])

  /**
   * Toggle between login and signup modes
   */
  const toggleMode = useCallback(() => {
    // Reset form state when switching modes
    setErrors({})
    setSignupSuccess(false)
    setConfirmPassword('')
    setTermsAccepted(false)
    setShowTermsModal(false)
    setShowPassword(false)
    setIsOver18(false)
    setMode((prevMode) => (prevMode === 'login' ? 'signup' : 'login'))
  }, [])

  /**
   * Handle form submission based on current mode
   */
  const handleSubmit = useCallback(() => {
    if (mode === 'login') {
      handleLogin()
    } else {
      handleSignup()
    }
  }, [mode, handleLogin, handleSignup])

  /**
   * Handle Apple Sign In
   */
  const handleAppleSignIn = useCallback(async () => {
    setErrors({})
    const { success, error } = await signInWithApple()

    if (!success && error) {
      await errorFeedback()
      setErrors({ general: error })
    } else if (success) {
      trackEvent(AnalyticsEvent.LOGIN, { method: 'apple' })
      await successFeedback()
    }
  }, [signInWithApple])

  /**
   * Handle Google Sign In
   */
  const handleGoogleSignIn = useCallback(async () => {
    setErrors({})
    const { success, error } = await signInWithGoogle()

    if (!success && error) {
      await errorFeedback()
      setErrors({ general: error })
    } else if (success) {
      trackEvent(AnalyticsEvent.LOGIN, { method: 'google' })
      await successFeedback()
    }
  }, [signInWithGoogle])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Show loading if auth is still initializing
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
        <LoadingSpinner message="Loading..." fullScreen />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Text style={styles.title}>
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </Text>
          </Animated.View>
          <Animated.View
            style={{
              opacity: subtitleOpacity,
            }}
          >
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Sign in to continue to Backtrack'
                : 'Sign up to start using Backtrack'}
            </Text>
          </Animated.View>
        </View>

        {/* Signup Success Message */}
        {signupSuccess ? (
          <View style={styles.successContainer} testID="auth-signup-success">
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>Check Your Email</Text>
              <Text style={styles.successText}>
                We've sent a verification link to{'\n'}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <Text style={styles.successSubtext}>
                Please check your inbox and click the link to verify your account.
                Then come back here to sign in.
              </Text>
            </View>
            <Button
              title="Back to Sign In"
              onPress={() => {
                setSignupSuccess(false)
                setMode('login')
                setEmail('')
                setPassword('')
                setConfirmPassword('')
              }}
              fullWidth
              testID="auth-back-to-login"
            />
          </View>
        ) : (
          /* Form */
          <View style={styles.formContainer}>
            {/* Social Login Section */}
            <Animated.View
              style={{
                opacity: socialOpacity,
                transform: [{ translateY: socialTranslateY }],
              }}
            >
              {/* Apple Sign In (iOS only) */}
              {isAppleAvailable && (
                <SocialLoginButton
                  provider="apple"
                  onPress={handleAppleSignIn}
                  loading={appleLoading}
                  disabled={isSubmitting || googleLoading}
                  testID="auth-apple-button"
                />
              )}

              {/* Google Sign In */}
              {isGoogleConfigured && (
                <SocialLoginButton
                  provider="google"
                  onPress={handleGoogleSignIn}
                  loading={googleLoading}
                  disabled={isSubmitting || appleLoading}
                  testID="auth-google-button"
                />
              )}

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </Animated.View>

            {/* General Error */}
            {errors.general && (
              <Animated.View
                style={[
                  styles.errorBanner,
                  {
                    transform: [{ translateX: errorShakeX }],
                  },
                ]}
                testID="login-error"
              >
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </Animated.View>
            )}

            {/* Email Input */}
            <Animated.View
              style={[
                styles.inputGroup,
                {
                  opacity: emailOpacity,
                  transform: [{ translateY: emailTranslateY }],
                },
              ]}
            >
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  clearFieldError('email')
                }}
                placeholder="Enter your email"
                placeholderTextColor={darkTheme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                editable={!isSubmitting}
                testID="email-input"
                accessibilityLabel="Email address"
                accessibilityHint="Enter your email address"
              />
              {errors.email && (
                <Text style={styles.errorText} testID="email-error">
                  {errors.email}
                </Text>
              )}
            </Animated.View>

            {/* Password Input */}
            <Animated.View
              style={[
                styles.inputGroup,
                {
                  opacity: passwordOpacity,
                  transform: [{ translateY: passwordTranslateY }],
                },
              ]}
            >
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text)
                    clearFieldError('password')
                  }}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                  placeholderTextColor={darkTheme.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete={mode === 'login' ? 'password' : 'new-password'}
                  returnKeyType={mode === 'signup' ? 'next' : 'done'}
                  editable={!isSubmitting}
                  onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
                  testID="password-input"
                  accessibilityLabel="Password"
                  accessibilityHint={mode === 'login' ? 'Enter your password' : 'Create a password with at least 8 characters'}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword((prev) => !prev)}
                  testID="password-visibility-toggle"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={darkTheme.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText} testID="password-error">
                  {errors.password}
                </Text>
              )}
            </Animated.View>

            {/* Confirm Password Input (Signup only) */}
            {mode === 'signup' && (
              <Animated.View
                style={[
                  styles.inputGroup,
                  {
                    opacity: confirmPasswordOpacity,
                    transform: [{ translateY: confirmPasswordTranslateY }],
                  },
                ]}
              >
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text)
                    clearFieldError('confirmPassword')
                  }}
                  placeholder="Confirm your password"
                  placeholderTextColor={darkTheme.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="done"
                  editable={!isSubmitting}
                  onSubmitEditing={handleSubmit}
                  testID="confirm-password-input"
                  accessibilityLabel="Confirm password"
                  accessibilityHint="Re-enter your password to confirm"
                />
                {errors.confirmPassword && (
                  <Text style={styles.errorText} testID="confirm-password-error">
                    {errors.confirmPassword}
                  </Text>
                )}
              </Animated.View>
            )}

            {/* Age Verification (Signup only) */}
            {mode === 'signup' && (
              <TouchableOpacity
                style={styles.ageVerificationRow}
                onPress={() => setIsOver18((prev) => !prev)}
                activeOpacity={0.7}
                testID="age-verification-checkbox"
                accessibilityRole="checkbox"
                accessibilityLabel="I confirm I am 18 years or older"
                accessibilityState={{ checked: isOver18 }}
              >
                <Ionicons
                  name={isOver18 ? 'checkbox' : 'checkbox-outline'}
                  size={22}
                  color={isOver18 ? darkTheme.primary : darkTheme.textMuted}
                />
                <Text style={styles.ageVerificationText}>
                  I confirm I am 18 years or older
                </Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <Animated.View
              style={{
                opacity: buttonOpacity,
                transform: [{ translateY: buttonTranslateY }],
              }}
            >
              <Button
                title={mode === 'login' ? 'Sign In' : 'Create Account'}
                onPress={handleSubmit}
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting || (mode === 'signup' && !isOver18)}
                testID="login-button"
              />

              {/* Forgot Password Link (Login only) */}
              {mode === 'login' && (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  testID="auth-forgot-password-button"
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password?"
                  accessibilityHint="Double tap to reset your password"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {/* Toggle Mode Link */}
              <View style={styles.toggleModeContainer}>
                <Text style={styles.toggleModeText}>
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                </Text>
                <TouchableOpacity
                  onPress={toggleMode}
                  testID="signup-link"
                  accessibilityRole="button"
                  accessibilityLabel={mode === 'login' ? 'Sign up for a new account' : 'Sign in to existing account'}
                >
                  <Text style={styles.toggleModeLink}>
                    {mode === 'login' ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}

        {/* Terms Modal */}
        <TermsModal
          visible={showTermsModal}
          onAccept={handleTermsAccept}
          onDecline={handleTermsDecline}
          testID="auth-terms-modal"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing[5],
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.background,
  },

  // Header
  headerContainer: {
    marginBottom: spacing[10],
    marginTop: spacing[5],
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: darkTheme.textSecondary,
    lineHeight: 22,
  },

  // Form
  formContainer: {
    marginBottom: spacing[10],
  },

  // Input Group
  inputGroup: {
    marginBottom: spacing[5],
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginBottom: spacing[2],
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    fontSize: 16,
    color: darkTheme.textPrimary,
    backgroundColor: darkTheme.cardBackground,
  },
  inputError: {
    borderColor: darkTheme.error,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  passwordContainer: {
    position: 'relative' as const,
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute' as const,
    right: spacing[3],
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  ageVerificationRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing[5],
    gap: spacing[2.5],
  },
  ageVerificationText: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    flex: 1,
  },

  // Error Messages
  errorText: {
    fontSize: 13,
    color: darkTheme.error,
    marginTop: spacing[1.5],
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.error,
    padding: spacing[3],
    borderRadius: 4,
    marginBottom: spacing[5],
  },
  errorBannerText: {
    fontSize: 14,
    color: darkTheme.error,
    fontWeight: '500',
  },

  // Success Banner
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  successBanner: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.success,
    padding: spacing[5],
    borderRadius: 8,
    marginBottom: spacing[6],
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.success,
    marginBottom: spacing[2],
  },
  successText: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  successEmail: {
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  successSubtext: {
    fontSize: 13,
    color: darkTheme.textMuted,
    lineHeight: 18,
  },

  // Buttons
  toggleModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[5],
  },
  toggleModeText: {
    fontSize: 14,
    color: darkTheme.textSecondary,
  },
  toggleModeLink: {
    fontSize: 14,
    color: darkTheme.accent,
    fontWeight: '600',
  },
  forgotPasswordLink: {
    fontSize: 14,
    color: darkTheme.accent,
    fontWeight: '600',
    marginTop: spacing[4],
    textAlign: 'center',
  },

  // Social Login
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[5],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: darkTheme.cardBorder,
  },
  dividerText: {
    fontSize: 14,
    color: darkTheme.textMuted,
    marginHorizontal: spacing[4],
    fontWeight: '500',
  },
})