/**
 * NotificationSettings Component
 *
 * Settings component for managing all notification preferences.
 * Includes toggles for match, message, and spark notifications.
 *
 * @example
 * ```tsx
 * <NotificationSettings />
 * ```
 */

import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNotificationSettings } from '../../hooks/useNotificationSettings'
import { useSparkNotificationSettings } from '../../hooks/useSparkNotificationSettings'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

// ============================================================================
// Types
// ============================================================================

interface NotificationSettingsProps {
  /** Custom styles for container */
  style?: object
}

// ============================================================================
// Component
// ============================================================================

export function NotificationSettings({ style }: NotificationSettingsProps) {
  const {
    matchNotificationsEnabled,
    messageNotificationsEnabled,
    toggleMatchNotifications,
    toggleMessageNotifications,
    isLoading: coreLoading,
    isSaving: coreSaving,
  } = useNotificationSettings()

  const {
    sparkNotificationsEnabled,
    toggleSparkNotifications,
    isLoading: sparkLoading,
    isSaving: sparkSaving,
  } = useSparkNotificationSettings()

  const isLoading = coreLoading || sparkLoading
  const isSaving = coreSaving || sparkSaving

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF6B47" />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="notifications" size={24} color="#FF6B47" />
        </View>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {/* Match Notifications */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <View style={styles.settingIconContainer}>
            <Ionicons name="heart-outline" size={20} color="#FF2D55" />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Match Notifications</Text>
            <Text style={styles.settingDescription}>
              Get notified when someone matches with your posts
            </Text>
          </View>
        </View>
        <Switch
          value={matchNotificationsEnabled}
          onValueChange={() => { toggleMatchNotifications() }}
          disabled={isSaving}
          trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: colors.primary[400] }}
          thumbColor={matchNotificationsEnabled ? colors.primary[500] : darkTheme.textMuted}
        />
      </View>

      {/* Message Notifications */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <View style={styles.settingIconContainer}>
            <Ionicons name="chatbubble-outline" size={20} color="#5856D6" />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Message Notifications</Text>
            <Text style={styles.settingDescription}>
              Get notified when you receive new messages
            </Text>
          </View>
        </View>
        <Switch
          value={messageNotificationsEnabled}
          onValueChange={() => { toggleMessageNotifications() }}
          disabled={isSaving}
          trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: colors.accent[400] }}
          thumbColor={messageNotificationsEnabled ? colors.accent[500] : darkTheme.textMuted}
        />
      </View>

      {/* Spark Notifications */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <View style={styles.settingIconContainer}>
            <Ionicons name="sparkles" size={20} color="#F59E0B" />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Spark Notifications</Text>
            <Text style={styles.settingDescription}>
              Get notified when someone posts at your frequent locations
            </Text>
          </View>
        </View>
        <Switch
          value={sparkNotificationsEnabled}
          onValueChange={() => { toggleSparkNotifications() }}
          disabled={isSaving}
          trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: '#FCD34D' }}
          thumbColor={sparkNotificationsEnabled ? '#F59E0B' : darkTheme.textMuted}
        />
      </View>

      {/* Saving Indicator */}
      {isSaving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color="#FF6B47" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
    </View>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: darkTheme.textPrimary,
  },
  settingDescription: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginTop: 2,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  savingText: {
    fontSize: 13,
    color: darkTheme.textMuted,
  },
})

export default NotificationSettings
