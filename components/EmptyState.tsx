/**
 * Empty State Component
 *
 * Reusable component for displaying empty states with icon, title, message,
 * and optional action button. Use this when there's no data to display.
 */

import React, { ReactNode } from 'react'
import { FileEdit, MessageSquare, Search, SearchX, AlertTriangle } from 'lucide-react-native'
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { Button, ButtonProps } from './Button'

// ============================================================================
// TYPES
// ============================================================================

export interface EmptyStateProps {
  /** Icon to display (emoji, text, or React node) */
  icon?: string | ReactNode
  /** Main title text */
  title: string
  /** Optional description message */
  message?: string
  /** Optional action button props */
  action?: {
    label: string
    onPress: () => void
    variant?: ButtonProps['variant']
  }
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Custom title style */
  titleStyle?: StyleProp<TextStyle>
  /** Custom message style */
  messageStyle?: StyleProp<TextStyle>
  /** Test ID for testing purposes */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EmptyState - Display when there's no content to show
 *
 * @example
 * // Basic usage
 * <EmptyState
 *   icon="📭"
 *   title="No posts yet"
 *   message="Be the first to create a post at this location!"
 * />
 *
 * @example
 * // With action button
 * <EmptyState
 *   icon={<MessageSquare size={48} strokeWidth={1.5} color="#8B5CF6" />}
 *   title="No conversations"
 *   message="Start chatting with someone who caught your eye"
 *   action={{
 *     label: "Browse Posts",
 *     onPress: () => navigation.navigate('Home'),
 *   }}
 * />
 *
 * @example
 * // Custom styling
 * <EmptyState
 *   title="No matches"
 *   message="Check back later"
 *   style={{ backgroundColor: '#F0F0F0' }}
 * />
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
  style,
  titleStyle,
  messageStyle,
  testID = 'empty-state',
}: EmptyStateProps): JSX.Element {
  return (
    <View style={[styles.container, style]} testID={testID}>
      {icon && (
        <View style={styles.iconContainer} testID={`${testID}-icon`}>
          {typeof icon === 'string' ? (
            <Text style={styles.icon}>{icon}</Text>
          ) : (
            icon
          )}
        </View>
      )}
      <Text style={[styles.title, titleStyle]} testID={`${testID}-title`}>
        {title}
      </Text>
      {message && (
        <Text style={[styles.message, messageStyle]} testID={`${testID}-message`}>
          {message}
        </Text>
      )}
      {action && (
        <View style={styles.actionContainer}>
          <Button
            title={action.label}
            onPress={action.onPress}
            variant={action.variant || 'primary'}
            testID={`${testID}-action`}
          />
        </View>
      )}
    </View>
  )
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Empty state for no posts at a location
 */
export function EmptyLedger({
  onCreatePost,
  ...props
}: Omit<EmptyStateProps, 'icon' | 'title' | 'message' | 'action'> & {
  onCreatePost?: () => void
}): JSX.Element {
  return (
    <EmptyState
      {...props}
      icon={<FileEdit size={48} strokeWidth={1.5} color="#FF6B47" />}
      title="No posts here yet"
      message="Be the first to post and notify Regulars immediately!"
      action={
        onCreatePost
          ? {
              label: 'Create Post',
              onPress: onCreatePost,
            }
          : undefined
      }
    />
  )
}

/**
 * Empty state for no conversations
 */
export function EmptyChats({
  onBrowsePosts,
  ...props
}: Omit<EmptyStateProps, 'icon' | 'title' | 'message' | 'action'> & {
  onBrowsePosts?: () => void
}): JSX.Element {
  return (
    <EmptyState
      {...props}
      icon={<MessageSquare size={48} strokeWidth={1.5} color="#8B5CF6" />}
      title="No conversations yet"
      message="When you connect with someone, your conversations will appear here."
      action={
        onBrowsePosts
          ? {
              label: 'Browse Posts',
              onPress: onBrowsePosts,
            }
          : undefined
      }
    />
  )
}

/**
 * Empty state for no matches found
 */
export function NoMatches({
  onRefresh,
  ...props
}: Omit<EmptyStateProps, 'icon' | 'title' | 'message' | 'action'> & {
  onRefresh?: () => void
}): JSX.Element {
  return (
    <EmptyState
      {...props}
      icon={<Search size={48} strokeWidth={1.5} color="#8E8E93" />}
      title="No matches found"
      message="Nobody has described someone matching your avatar yet. Check back later!"
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onPress: onRefresh,
              variant: 'outline',
            }
          : undefined
      }
    />
  )
}

/**
 * Empty state for search with no results
 */
export function NoSearchResults({
  query,
  onClear,
  ...props
}: Omit<EmptyStateProps, 'icon' | 'title' | 'message' | 'action'> & {
  query?: string
  onClear?: () => void
}): JSX.Element {
  return (
    <EmptyState
      {...props}
      icon={<SearchX size={48} strokeWidth={1.5} color="#8E8E93" />}
      title="No results found"
      message={
        query
          ? `We couldn't find any results for "${query}". Try a different search.`
          : 'No results match your search criteria.'
      }
      action={
        onClear
          ? {
              label: 'Clear Search',
              onPress: onClear,
              variant: 'outline',
            }
          : undefined
      }
    />
  )
}

/**
 * Empty state for errors
 */
export function ErrorState({
  error,
  onRetry,
  ...props
}: Omit<EmptyStateProps, 'icon' | 'title' | 'message' | 'action'> & {
  error?: string
  onRetry?: () => void
}): JSX.Element {
  return (
    <EmptyState
      {...props}
      icon={<AlertTriangle size={48} strokeWidth={1.5} color="#FF3B30" />}
      title="Something went wrong"
      message={error || 'An unexpected error occurred. Please try again.'}
      action={
        onRetry
          ? {
              label: 'Try Again',
              onPress: onRetry,
            }
          : undefined
      }
    />
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    backgroundColor: '#F2F2F7',
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionContainer: {
    marginTop: 24,
    width: '100%',
    maxWidth: 200,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default EmptyState
