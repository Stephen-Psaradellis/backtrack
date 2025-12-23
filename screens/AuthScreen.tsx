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

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { useAuth } from '../contexts/AuthContext'
import { Button, GhostButton } from '../components/Button'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { TermsModal } from '../components/TermsModal'
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

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
export function AuthScreen(): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<AuthStackNavigationProp>()
  const { signIn, signUp, isLoading: authLoading } = useAuth()

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
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

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
    return Object.keys(newErrors).length === 0
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

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before logging in. Check your inbox for a verification link.'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.'
        } else if (error.message) {
          errorMessage = error.message
        }

        setErrors({ general: errorMessage })
      }
      // Success case: AuthContext listener will handle navigation
    } catch {
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

        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.'
        } else if (error.message.includes('Password should be')) {
          errorMessage = 'Password does not meet security requirements. Please use a stronger password.'
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.'
        } else if (error.message.includes('Signup is disabled')) {
          errorMessage = 'Signup is currently disabled. Please try again later.'
        } else if (error.message) {
          errorMessage = error.message
        }

        setErrors({ general: errorMessage })
      } else {
        // Success - show verification message
        setSignupSuccess(true)
      }
    } catch {
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

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Show loading if auth is still initializing
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'Sign in to continue to Love Ledger'
              : 'Sign up to start using Love Ledger'}
          </Text>
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
            {/* General Error */}
            {errors.general && (
              <View style={styles.errorBanner} testID="auth-error-banner">
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  clearFieldError('email')
                }}
                placeholder="Enter your email"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                editable={!isSubmitting}
                testID="auth-email-input"
              />
              {errors.email && (
                <Text style={styles.errorText} testID="auth-email-error">
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  clearFieldError('password')
                }}
                placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'}
                placeholderTextColor="#8E8E93"
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'login' ? 'password' : 'new-password'}
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                editable={!isSubmitting}
                onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
                testID="auth-password-input"
              />
              {errors.password && (
                <Text style={styles.errorText} testID="auth-password-error">
                  {errors.password}
                </Text>
              )}
            </View>

            {/* Confirm Password Input (Signup only) */}
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text)
                    clearFieldError('confirmPassword')
                  }}
                  placeholder="Confirm your password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="done"
                  editable={!isSubmitting}
                  onSubmitEditing={handleSubmit}
                  testID="auth-confirm-password-input"
                />
                {errors.confirmPassword && (
                  <Text style={styles.errorText} testID="auth-confirm-password-error">
                    {errors.confirmPassword}
                  </Text>
                )}
              </View>
            )}

            {/* Forgot Password Link (Login only) */}
            {mode === 'login' && (
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={handleForgotPassword}
                disabled={isSubmitting}
                testID="auth-forgot-password"
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <Button
              title={mode === 'login' ? 'Sign In' : 'Create Account'}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              fullWidth
              testID={mode === 'login' ? 'auth-login-button' : 'auth-signup-button'}
            />
          </View>
        )}

        {/* Footer - Toggle Mode Link */}
        {!signupSuccess && (
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <GhostButton
              title={mode === 'login' ? 'Sign Up' : 'Sign In'}
              onPress={toggleMode}
              size="small"
              disabled={isSubmitting}
              testID={mode === 'login' ? 'auth-signup-link' : 'auth-login-link'}
            />
          </View>
        )}
      </ScrollView>

      {/* Terms Modal (shown during signup) */}
      <TermsModal
        visible={showTermsModal}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
        testID="auth-terms-modal"
      />
    </KeyboardAvoidingView>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  // Header
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Form
  formContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F9F9F9',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },

  // Error Banner
  errorBanner: {
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },

  // Forgot Password
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },

  // Footer
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // Success Banner (Signup Success)
  successContainer: {
    marginBottom: 32,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#388E3C',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  successEmail: {
    fontWeight: '600',
    color: '#1B5E20',
  },
  successSubtext: {
    fontSize: 14,
    color: '#66BB6A',
    textAlign: 'center',
    lineHeight: 20,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default AuthScreen
