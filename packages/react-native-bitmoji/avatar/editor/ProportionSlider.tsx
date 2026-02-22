/**
 * ProportionSlider Component
 *
 * A slider control for adjusting facial proportions.
 * Supports values from -1 to 1 with 0 as the default (neutral).
 * Uses a pure JS implementation to avoid native module compatibility issues.
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { colors, darkTheme } from '../../constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface ProportionSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  minLabel?: string;
  maxLabel?: string;
  step?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProportionSlider({
  label,
  value,
  onChange,
  minLabel = 'Less',
  maxLabel = 'More',
  step = 0.1,
}: ProportionSliderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const trackWidth = useRef(0);
  const trackX = useRef(0);

  const clampAndStep = useCallback(
    (raw: number) => {
      const clamped = Math.max(-1, Math.min(1, raw));
      return Math.round(clamped / step) * step;
    },
    [step]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.pageX - trackX.current;
        const ratio = x / trackWidth.current;
        const raw = ratio * 2 - 1;
        onChange(clampAndStep(raw));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.pageX - trackX.current;
        const ratio = x / trackWidth.current;
        const raw = ratio * 2 - 1;
        onChange(clampAndStep(raw));
      },
    })
  ).current;

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
    trackX.current = e.nativeEvent.layout.x;
  }, []);

  const onTrackRef = useCallback((ref: View | null) => {
    ref?.measureInWindow((x) => {
      trackX.current = x;
    });
  }, []);

  const fillPercent = ((value + 1) / 2) * 100;
  const minColor = isDark ? colors.primary[400] : colors.primary[500];
  const maxColor = isDark ? darkTheme.glassBorder : colors.neutral[300];

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
        <Text style={[styles.value, isDark && styles.valueDark]}>
          {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
        </Text>
      </View>
      <View
        ref={onTrackRef}
        style={styles.slider}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${fillPercent}%`, backgroundColor: minColor }]} />
          <View style={[styles.trackRemaining, { width: `${100 - fillPercent}%`, backgroundColor: maxColor }]} />
        </View>
        <View style={[styles.thumb, { left: `${fillPercent}%`, backgroundColor: minColor }]} />
      </View>
      <View style={styles.rangeLabels}>
        <Text style={[styles.rangeLabel, isDark && styles.rangeLabelDark]}>
          {minLabel}
        </Text>
        <Text style={[styles.rangeLabel, isDark && styles.rangeLabelDark]}>
          {maxLabel}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  labelDark: {
    color: darkTheme.textPrimary,
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
    minWidth: 40,
    textAlign: 'right',
  },
  valueDark: {
    color: colors.primary[400],
  },
  slider: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
  },
  trackRemaining: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    top: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  rangeLabel: {
    fontSize: 10,
    color: colors.neutral[400],
  },
  rangeLabelDark: {
    color: darkTheme.textMuted,
  },
});

export default ProportionSlider;
