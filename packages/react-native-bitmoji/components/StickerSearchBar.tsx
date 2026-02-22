/**
 * StickerSearchBar - Search input for filtering stickers
 *
 * Features:
 * - Real-time search as you type
 * - Clear button
 * - Search suggestions (tags)
 * - Debounced search for performance
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  ScrollView,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface StickerSearchBarProps {
  /** Current search query */
  value?: string;
  /** Callback when search query changes */
  onChangeText?: (text: string) => void;
  /** Callback when search is submitted */
  onSubmit?: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Popular/suggested tags to show */
  suggestedTags?: string[];
  /** Callback when a suggested tag is selected */
  onTagSelect?: (tag: string) => void;
  /** Show suggestions below search bar */
  showSuggestions?: boolean;
  /** Debounce delay in ms */
  debounceDelay?: number;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Test ID */
  testID?: string;
}

// ============================================================================
// CUSTOM HOOK FOR DEBOUNCE
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StickerSearchBar({
  value = '',
  onChangeText,
  onSubmit,
  placeholder = 'Search stickers...',
  suggestedTags = [],
  onTagSelect,
  showSuggestions = true,
  debounceDelay = 300,
  autoFocus = false,
  testID,
}: StickerSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Debounce the local value
  const debouncedValue = useDebounce(localValue, debounceDelay);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Trigger onChangeText when debounced value changes
  useEffect(() => {
    onChangeText?.(debouncedValue);
  }, [debouncedValue, onChangeText]);

  // Handle text change
  const handleChangeText = useCallback((text: string) => {
    setLocalValue(text);
  }, []);

  // Handle clear
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChangeText?.('');
    inputRef.current?.focus();
  }, [onChangeText]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    onSubmit?.(localValue);
  }, [localValue, onSubmit]);

  // Handle tag selection
  const handleTagSelect = useCallback(
    (tag: string) => {
      setLocalValue(tag);
      onChangeText?.(tag);
      onTagSelect?.(tag);
    },
    [onChangeText, onTagSelect]
  );

  // Filter suggested tags based on current input
  const filteredTags = suggestedTags.filter(
    tag =>
      tag.toLowerCase().includes(localValue.toLowerCase()) &&
      tag.toLowerCase() !== localValue.toLowerCase()
  );

  const shouldShowSuggestions =
    showSuggestions && isFocused && filteredTags.length > 0 && localValue.length > 0;

  return (
    <View style={styles.container} testID={testID}>
      {/* Search Input */}
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <Text style={styles.searchIcon}>Q</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={localValue}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          placeholderTextColor="#9e9e9e"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={autoFocus}
        />
        {localValue.length > 0 && (
          <Pressable
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={8}
          >
            <Text style={styles.clearIcon}>X</Text>
          </Pressable>
        )}
      </View>

      {/* Suggestions */}
      {shouldShowSuggestions && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {filteredTags.slice(0, 10).map(tag => (
              <Pressable
                key={tag}
                style={styles.suggestionChip}
                onPress={() => handleTagSelect(tag)}
              >
                <Text style={styles.suggestionText}>{tag}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Popular Tags (when empty and focused) */}
      {showSuggestions && isFocused && localValue.length === 0 && suggestedTags.length > 0 && (
        <View style={styles.popularContainer}>
          <Text style={styles.popularTitle}>Popular:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {suggestedTags.slice(0, 8).map(tag => (
              <Pressable
                key={tag}
                style={styles.popularChip}
                onPress={() => handleTagSelect(tag)}
              >
                <Text style={styles.popularChipText}>{tag}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputContainerFocused: {
    borderColor: '#2196f3',
    backgroundColor: '#ffffff',
  },
  searchIcon: {
    fontSize: 16,
    color: '#9e9e9e',
    marginRight: 8,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#212121',
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 14,
    color: '#9e9e9e',
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionsScroll: {
    paddingHorizontal: 4,
  },
  suggestionChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  suggestionText: {
    color: '#1976d2',
    fontSize: 14,
  },
  popularContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularTitle: {
    fontSize: 12,
    color: '#757575',
    marginRight: 8,
  },
  popularChip: {
    backgroundColor: '#eeeeee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  popularChipText: {
    color: '#616161',
    fontSize: 12,
  },
});

export default StickerSearchBar;
