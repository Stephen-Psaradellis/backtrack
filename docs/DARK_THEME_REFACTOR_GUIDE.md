# Dark Theme Refactor Guide

This guide provides instructions for refactoring screens and components to use the new modern dark theme with glassmorphism styling.

## Overview

The new design system introduces:
- **Dark backgrounds** instead of white
- **Glassmorphism cards** with subtle transparency
- **Gradient accents** (coral-to-violet)
- **Consistent typography** with proper contrast
- **Modern button styles** with gradient fills

---

## Quick Start

### 1. Import the Design System

```tsx
import {
  darkTheme,
  darkGradients,
  glassStyles,
  darkButtonStyles,
  darkTypography,
  darkLayout,
} from '../constants/glassStyles';
import { colors } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
```

### 2. Update Container Background

```tsx
// Before
container: {
  flex: 1,
  backgroundColor: '#FFFFFF',
}

// After
container: {
  flex: 1,
  backgroundColor: darkTheme.background, // #0F0F13
}
```

### 3. Add StatusBar Configuration

```tsx
import { StatusBar } from 'react-native';

// In your render
<View style={styles.container}>
  <StatusBar barStyle="light-content" />
  {/* ... */}
</View>
```

---

## Color Reference

### Background Colors

| Use Case | Color | Value |
|----------|-------|-------|
| Main background | `darkTheme.background` | `#0F0F13` |
| Alternate background | `darkTheme.backgroundAlt` | `#16161D` |
| Card/Surface | `darkTheme.surface` | `#1C1C24` |
| Elevated surface | `darkTheme.surfaceElevated` | `#242430` |

### Text Colors

| Use Case | Color | Value |
|----------|-------|-------|
| Primary text | `darkTheme.textPrimary` | `#FFFFFF` |
| Secondary text | `darkTheme.textSecondary` | `rgba(255,255,255,0.7)` |
| Muted text | `darkTheme.textMuted` | `rgba(255,255,255,0.5)` |
| Disabled text | `darkTheme.textDisabled` | `rgba(255,255,255,0.3)` |

### Accent Colors

| Use Case | Color | Value |
|----------|-------|-------|
| Primary accent | `colors.primary[400]` | `#FF8C6B` (coral) |
| Primary main | `colors.primary[500]` | `#FF6B47` (coral) |
| Accent/Secondary | `colors.accent[500]` | `#8B5CF6` (violet) |

---

## Component Patterns

### Section Headers

Replace plain text titles with icon + title rows:

```tsx
// Before
<Text style={styles.sectionTitle}>Profile Information</Text>

// After
<View style={styles.sectionHeader}>
  <Ionicons name="person-outline" size={20} color={colors.primary[400]} />
  <Text style={styles.sectionTitle}>Profile Information</Text>
</View>
```

**Styles:**
```tsx
sectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginBottom: 16,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: darkTheme.textPrimary,
},
```

### Glass Cards

Wrap section content in glassmorphism cards:

```tsx
// Before
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Settings</Text>
  {/* content */}
</View>

// After
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Ionicons name="settings-outline" size={20} color={colors.primary[400]} />
    <Text style={styles.sectionTitle}>Settings</Text>
  </View>
  <View style={[glassStyles.card, styles.glassCard]}>
    {/* content */}
  </View>
</View>
```

**Styles:**
```tsx
glassCard: {
  padding: 20,
},
```

### Gradient Headers

For screens with hero sections:

```tsx
<LinearGradient
  colors={[colors.primary[500], colors.accent[600]]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.heroGradient}
>
  {/* Decorative circles (optional) */}
  <View style={styles.heroDecor1} />
  <View style={styles.heroDecor2} />

  {/* Content */}
  <Text style={styles.heroTitle}>Title</Text>
</LinearGradient>
```

**Styles:**
```tsx
heroGradient: {
  paddingTop: 60,
  paddingBottom: 32,
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',
},
heroDecor1: {
  position: 'absolute',
  top: -50,
  right: -50,
  width: 150,
  height: 150,
  borderRadius: 75,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
},
heroDecor2: {
  position: 'absolute',
  bottom: -30,
  left: -30,
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
},
heroTitle: {
  fontSize: 28,
  fontWeight: '700',
  color: '#FFFFFF',
},
```

### Buttons

#### Primary Gradient Button

```tsx
<TouchableOpacity style={styles.primaryButton} onPress={handlePress}>
  <LinearGradient
    colors={[colors.primary[500], colors.primary[600]]}
    style={styles.primaryButtonGradient}
  >
    <Text style={styles.primaryButtonText}>Button Text</Text>
  </LinearGradient>
</TouchableOpacity>
```

**Styles:**
```tsx
primaryButton: {
  overflow: 'hidden',
  borderRadius: 14,
},
primaryButtonGradient: {
  paddingVertical: 14,
  paddingHorizontal: 24,
  borderRadius: 14,
  alignItems: 'center',
},
primaryButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '600',
},
```

#### Ghost Button

```tsx
<TouchableOpacity
  style={[darkButtonStyles.ghost, darkButtonStyles.small]}
  onPress={handlePress}
>
  <Text style={[darkButtonStyles.ghostText, darkButtonStyles.smallText]}>
    Cancel
  </Text>
</TouchableOpacity>
```

#### Outline/Secondary Button

```tsx
<TouchableOpacity style={styles.outlineButton} onPress={handlePress}>
  <Text style={styles.outlineButtonText}>Secondary Action</Text>
</TouchableOpacity>
```

**Styles:**
```tsx
outlineButton: {
  borderRadius: 14,
  paddingVertical: 14,
  paddingHorizontal: 24,
  backgroundColor: 'transparent',
  borderWidth: 1.5,
  borderColor: colors.primary[500],
  alignItems: 'center',
},
outlineButtonText: {
  color: colors.primary[500],
  fontSize: 16,
  fontWeight: '600',
},
```

### Input Fields

```tsx
<TextInput
  style={[styles.input, hasError && styles.inputError]}
  value={value}
  onChangeText={setValue}
  placeholder="Enter text"
  placeholderTextColor={darkTheme.textMuted}
/>
```

**Styles:**
```tsx
input: {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderWidth: 1.5,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: darkTheme.textPrimary,
},
inputError: {
  borderColor: '#EF4444',
  backgroundColor: 'rgba(239, 68, 68, 0.05)',
},
```

### Dividers

```tsx
<View style={styles.divider} />
```

**Styles:**
```tsx
divider: {
  height: 1,
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
  marginVertical: 16,
},
```

### List Items / Rows

```tsx
<TouchableOpacity style={styles.listItem} onPress={handlePress}>
  <View style={styles.listItemContent}>
    <Ionicons name="icon-name" size={18} color={darkTheme.textSecondary} />
    <Text style={styles.listItemText}>Item Label</Text>
  </View>
  <Ionicons name="chevron-forward" size={18} color={darkTheme.textMuted} />
</TouchableOpacity>
```

**Styles:**
```tsx
listItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 14,
},
listItemContent: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},
listItemText: {
  fontSize: 15,
  color: darkTheme.textSecondary,
  fontWeight: '500',
},
```

### Empty States

```tsx
<View style={styles.emptyStateContainer}>
  <Ionicons name="icon-name" size={32} color={darkTheme.textMuted} />
  <Text style={styles.emptyText}>No items found</Text>
  <Text style={styles.emptySubtext}>Try adding something!</Text>
</View>
```

**Styles:**
```tsx
emptyStateContainer: {
  alignItems: 'center',
  paddingVertical: 24,
  gap: 8,
},
emptyText: {
  fontSize: 15,
  color: darkTheme.textSecondary,
  textAlign: 'center',
  fontWeight: '500',
},
emptySubtext: {
  fontSize: 13,
  color: darkTheme.textMuted,
  textAlign: 'center',
},
```

### RefreshControl

```tsx
<RefreshControl
  refreshing={isRefreshing}
  onRefresh={handleRefresh}
  tintColor={colors.primary[400]}
  progressBackgroundColor={darkTheme.surface}
/>
```

---

## Screen-by-Screen Refactor Checklist

### For Each Screen:

- [ ] Add imports for `darkTheme`, `glassStyles`, `colors`, `LinearGradient`, `Ionicons`
- [ ] Add `<StatusBar barStyle="light-content" />` at top of render
- [ ] Change container background to `darkTheme.background`
- [ ] Update all text colors to use `darkTheme.textPrimary/Secondary/Muted`
- [ ] Wrap sections in `glassStyles.card`
- [ ] Add section headers with icons
- [ ] Update buttons to gradient or ghost styles
- [ ] Update input fields with dark styling
- [ ] Update RefreshControl colors
- [ ] Replace any `#FFFFFF` backgrounds
- [ ] Replace any `#333333` or similar dark text colors

### Screens to Refactor:

| Screen | Priority | Notes |
|--------|----------|-------|
| `FeedScreen.tsx` | High | Main screen, needs glass cards for posts |
| `MySpotsScreen.tsx` | High | List view with cards |
| `MapSearchScreen.tsx` | High | Overlays need dark treatment |
| `ChatListScreen.tsx` | High | Conversation list |
| `ChatScreen.tsx` | High | Message bubbles |
| `CreatePostScreen.tsx` | Medium | Form inputs |
| `AuthScreen.tsx` | Medium | Login/signup |
| `LedgerScreen.tsx` | Medium | Location posts |
| `PostDetailScreen.tsx` | Medium | Post view |
| `FavoritesScreen.tsx` | Low | Favorites list |
| `AvatarCreatorScreen.tsx` | Low | Complex UI |

### Components to Update:

| Component | Priority | Notes |
|-----------|----------|-------|
| `GlobalHeader.tsx` | High | Should be dark/transparent |
| `AnimatedTabBar.tsx` | High | Dark background, gradient indicator |
| `PostCard.tsx` | High | Glass card styling |
| `Button.tsx` | High | Export dark variants |
| `LoadingSpinner.tsx` | Medium | Dark background support |
| `FloatingActionButtons.tsx` | Medium | Dark styling |
| Modals | Medium | Dark backgrounds |

---

## Common Migrations

### White Background to Dark

```tsx
// Before
backgroundColor: '#FFFFFF'
backgroundColor: '#FAFAF9'
backgroundColor: colors.white

// After
backgroundColor: darkTheme.background
backgroundColor: darkTheme.surface
backgroundColor: darkTheme.surfaceElevated
```

### Text Colors

```tsx
// Before
color: '#333333'
color: '#666666'
color: '#8E8E93'

// After
color: darkTheme.textPrimary     // was #333333
color: darkTheme.textSecondary   // was #666666
color: darkTheme.textMuted       // was #8E8E93
```

### Borders

```tsx
// Before
borderColor: '#F0F0F0'
borderColor: '#E5E5E5'

// After
borderColor: 'rgba(255, 255, 255, 0.06)'
borderColor: darkTheme.glassBorder
```

### Primary Color References

```tsx
// Keep these - they work on both light and dark
colors.primary[500]  // #FF6B47 - main coral
colors.primary[400]  // #FF8C6B - lighter coral (good for icons on dark)
colors.accent[500]   // #8B5CF6 - violet
colors.accent[400]   // #A78BFA - lighter violet
```

---

## Icon Recommendations

Use Ionicons consistently. Here are recommended icons by section:

| Section | Icon Name |
|---------|-----------|
| Profile | `person-outline` |
| Settings | `settings-outline` |
| Notifications | `notifications-outline` |
| Location | `location-outline` |
| Camera/Photos | `camera-outline` |
| Security/Privacy | `shield-outline` |
| Documents/Legal | `document-text-outline` |
| Streaks/Fire | `flame-outline` |
| People/Regulars | `people-outline` |
| Heart/Favorites | `heart-outline` |
| Chat | `chatbubble-outline` |
| Calendar | `calendar-outline` |
| Edit | `pencil` |
| Delete | `trash-outline` |
| Chevron | `chevron-forward` |
| Play | `play-circle-outline` |
| Code/Dev | `code-slash-outline` |

---

## Testing Your Changes

1. **Visual consistency**: All screens should have the same dark background
2. **Text contrast**: Ensure all text is readable (use WCAG contrast checker)
3. **Touch targets**: Buttons should be at least 44x44 points
4. **Loading states**: Should have dark backgrounds
5. **Error states**: Red (#EF4444) on dark background
6. **Success states**: Green (#10B981) on dark background

---

## Example: Minimal Screen Template

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme, glassStyles } from '../constants/glassStyles';
import { colors } from '../constants/theme';

export function ExampleScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Section Title</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <Text style={styles.bodyText}>Content goes here</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  glassCard: {
    padding: 20,
  },
  bodyText: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    lineHeight: 22,
  },
});
```

---

## Need Help?

Reference the completed `ProfileScreen.tsx` as the canonical example of the new design system.
