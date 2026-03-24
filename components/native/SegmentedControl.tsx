import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing, typography } from '../../constants/theme';

export interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md';
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  selectedIndex,
  onChange,
  style,
  size = 'md',
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorPosition = useRef(new Animated.Value(0)).current;

  // Validate segments count
  if (segments.length < 2 || segments.length > 5) {
    if (__DEV__) console.warn('SegmentedControl: segments should have 2-5 items');
  }

  // Calculate indicator width and position
  const segmentWidth = containerWidth > 0 ? (containerWidth - 4) / segments.length : 0;
  const targetPosition = selectedIndex * segmentWidth + 2;

  // Animate indicator on selectedIndex change
  useEffect(() => {
    if (containerWidth > 0) {
      Animated.spring(indicatorPosition, {
        toValue: targetPosition,
        useNativeDriver: false,
        stiffness: 200,
        damping: 20,
      }).start();
    }
  }, [selectedIndex, containerWidth, targetPosition, indicatorPosition]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  const handlePress = (index: number) => {
    if (index !== selectedIndex) {
      // Haptic feedback
      try {
        Haptics.selectionAsync();
      } catch (error) {
        // Silently fail if haptics not available
      }
      onChange(index);
    }
  };

  // Size-specific styles
  const height = size === 'sm' ? 36 : 44;
  const fontSize = size === 'sm' ? 13 : 14;

  return (
    <View
      style={[
        styles.container,
        { height, borderRadius: borderRadius.lg },
        style,
      ]}
      onLayout={handleLayout}
      accessibilityRole="tablist"
    >
      {/* Animated sliding indicator */}
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segmentWidth - 4,
              height: height - 4,
              borderRadius: borderRadius.md,
              transform: [{ translateX: indicatorPosition }],
            },
          ]}
        />
      )}

      {/* Segments */}
      {segments.map((segment, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Pressable
            key={`${segment}-${index}`}
            style={[styles.segment, { height }]}
            onPress={() => handlePress(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={segment}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  fontSize,
                  color: isSelected ? colors.text.primary : colors.text.muted,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
            >
              {segment}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    padding: 2,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    left: 0,
    backgroundColor: colors.surface.overlay,
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensure text is above indicator
  },
  segmentText: {
    textAlign: 'center',
  },
});

export default SegmentedControl;
export { SegmentedControl };
