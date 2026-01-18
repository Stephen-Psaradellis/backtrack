/**
 * LegalScreen
 *
 * Displays legal documents (Privacy Policy, Terms of Service) in a scrollable view.
 * Required for Apple App Store and Google Play Store compliance.
 *
 * @example
 * ```tsx
 * // Navigate to privacy policy
 * navigation.navigate('Legal', { type: 'privacy' })
 *
 * // Navigate to terms of service
 * navigation.navigate('Legal', { type: 'terms' })
 * ```
 */

import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  StatusBar,
} from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { darkTheme } from '../constants/glassStyles'
import { colors } from '../constants/theme'
import type { MainStackParamList } from '../navigation/types'

// ============================================================================
// Legal Content
// ============================================================================

const PRIVACY_POLICY = `
# Privacy Policy for Backtrack

**Last Updated: December 31, 2024**

## Introduction

Welcome to Backtrack ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience when using our location-based social app.

This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.

## Information We Collect

### Information You Provide

- **Account Information**: Email address, display name, and profile information
- **Avatar Data**: Custom avatar configurations for matching
- **Location Data**: Geographic coordinates when you create posts or search for connections
- **Photos**: Selfie verification photos and profile photos you choose to upload
- **Communications**: Messages you send through our platform

### Information Collected Automatically

- **Device Information**: Device type, operating system, unique device identifiers
- **Usage Data**: App interactions, features used, time spent in app
- **Location Data**: With your permission, we collect location data to enable our core features

## How We Use Your Information

We use your information to:

- Provide and maintain our services
- Match you with other users based on location and avatar descriptions
- Send push notifications about matches and messages
- Improve and personalize your experience
- Ensure safety and prevent abuse
- Comply with legal obligations

## Data Sharing

We do not sell your personal information. We may share data with:

- **Service Providers**: Cloud hosting, analytics, push notifications
- **Legal Requirements**: When required by law or to protect rights and safety
- **With Your Consent**: When you explicitly agree to sharing

## Data Retention

- Account data is retained while your account is active
- Posts expire after 7 days automatically
- You can delete your account and all data at any time

## Your Rights

You have the right to:

- Access your personal data
- Correct inaccurate data
- Delete your account and data
- Export your data
- Opt-out of marketing communications

## Security

We implement industry-standard security measures including:

- Encryption in transit (TLS/SSL)
- Secure data storage
- Access controls and authentication
- Regular security audits

## Children's Privacy

Backtrack is not intended for users under 18 years of age. We do not knowingly collect information from children.

## Changes to This Policy

We may update this policy periodically. We will notify you of significant changes via the app or email.

## Contact Us

If you have questions about this Privacy Policy, contact us at:

**Email**: privacy@backtrack.social
`

const TERMS_OF_SERVICE = `
# Terms of Service for Backtrack

**Last Updated: December 31, 2024**

## Agreement to Terms

By accessing or using Backtrack, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.

## Description of Service

Backtrack is a location-based social app that enables users to:

- Create anonymous posts about missed connections at physical locations
- Match with other users based on avatar descriptions
- Communicate through anonymous messaging

## Eligibility

You must be at least 18 years old to use the Service. By using the Service, you represent that you meet this age requirement.

## Account Registration

- You must provide accurate and complete information
- You are responsible for maintaining account security
- You are responsible for all activities under your account

## User Conduct

### Prohibited Activities

You agree NOT to:

1. Harass, bully, intimidate, or threaten other users
2. Impersonate any person or entity
3. Provide false or misleading information
4. Post illegal, harmful, or rights-violating content
5. Send unsolicited messages or advertisements
6. Attempt to manipulate the matching system
7. Collect data from other users without consent
8. Attempt to bypass security measures
9. Use the Service for unauthorized commercial purposes
10. Post any content involving minors

### Content Guidelines

- Posts must describe genuine missed connections
- Do not include personally identifiable information in public posts
- Do not post explicit sexual content
- Respect the privacy of others

## User Content

### Ownership

You retain ownership of content you create. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content in connection with the Service.

### Responsibility

You are solely responsible for your content and the consequences of posting it.

### Removal

We may remove content that violates these Terms at our discretion.

## Privacy

Your use of the Service is governed by our Privacy Policy, incorporated into these Terms by reference.

## Safety

### Reporting

Report users who violate these Terms using the in-app reporting feature.

### Blocking

You can block any user at any time.

### Meeting Safety

If you choose to meet someone in person:

- Meet in public places
- Tell someone you trust about your plans
- Trust your instincts

## Disclaimers

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.

We do not guarantee:

- The Service will be uninterrupted or error-free
- Any specific results from using the Service
- The accuracy of user-provided content
- The safety or conduct of other users

## Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, BACKTRACK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.

## Termination

### By You

You may terminate your account at any time through the app settings.

### By Us

We may suspend or terminate your account for:

- Violation of these Terms
- Conduct harmful to other users or the Service
- Any other reason at our discretion

## Dispute Resolution

Any disputes shall be resolved through binding arbitration, except for claims in small claims court.

## Changes to Terms

We may update these Terms periodically. Continued use after changes constitutes acceptance.

## Contact Us

If you have questions about these Terms, contact us at:

**Email**: legal@backtrack.social
`

// ============================================================================
// Types
// ============================================================================

type LegalScreenRouteProp = RouteProp<MainStackParamList, 'Legal'>

// ============================================================================
// Component
// ============================================================================

export function LegalScreen(): React.ReactNode {
  const navigation = useNavigation()
  const route = useRoute<LegalScreenRouteProp>()
  const { type } = route.params || { type: 'privacy' }

  const isPrivacy = type === 'privacy'
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service'
  const content = isPrivacy ? PRIVACY_POLICY : TERMS_OF_SERVICE

  const handleContactPress = () => {
    const email = isPrivacy ? 'privacy@backtrack.social' : 'legal@backtrack.social'
    Linking.openURL(`mailto:${email}`)
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          testID="legal-back-button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary[400]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator
      >
        {content.split('\n').map((line, index) => {
          // Heading 1
          if (line.startsWith('# ')) {
            return (
              <Text key={index} style={styles.heading1}>
                {line.substring(2)}
              </Text>
            )
          }
          // Heading 2
          if (line.startsWith('## ')) {
            return (
              <Text key={index} style={styles.heading2}>
                {line.substring(3)}
              </Text>
            )
          }
          // Heading 3
          if (line.startsWith('### ')) {
            return (
              <Text key={index} style={styles.heading3}>
                {line.substring(4)}
              </Text>
            )
          }
          // Bold text (simple handling)
          if (line.startsWith('**') && line.endsWith('**')) {
            return (
              <Text key={index} style={styles.boldText}>
                {line.slice(2, -2)}
              </Text>
            )
          }
          // List item
          if (line.startsWith('- ') || line.match(/^\d+\. /)) {
            return (
              <Text key={index} style={styles.listItem}>
                {line}
              </Text>
            )
          }
          // Empty line
          if (line.trim() === '') {
            return <View key={index} style={styles.spacer} />
          }
          // Regular paragraph
          return (
            <Text key={index} style={styles.paragraph}>
              {line}
            </Text>
          )
        })}

        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactPress}
        >
          <Text style={styles.contactButtonText}>Contact Us</Text>
        </TouchableOpacity>

        <Text style={styles.lastUpdated}>Last Updated: December 31, 2024</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  heading1: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    marginTop: 16,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 17,
    fontWeight: '600',
    color: darkTheme.textSecondary,
    marginTop: 16,
    marginBottom: 6,
  },
  boldText: {
    fontSize: 15,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginVertical: 4,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: darkTheme.textSecondary,
    marginVertical: 2,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 22,
    color: darkTheme.textSecondary,
    marginLeft: 8,
    marginVertical: 2,
  },
  spacer: {
    height: 8,
  },
  contactButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: 12,
    color: darkTheme.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
})

export default LegalScreen
