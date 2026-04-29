/**
 * TimePickerModal
 *
 * Pure-JS time picker using @react-native-picker/picker (already in native build).
 * Renders three wheel columns: Hour (1-12), Minute (00-59), AM/PM.
 * Used instead of @react-native-community/datetimepicker to avoid requiring
 * a native rebuild — this component is fully OTA-deployable.
 */

import React, { memo, useCallback, useEffect, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// ============================================================================
// TYPES
// ============================================================================

export interface TimePickerModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (date: Date) => void
  /** Current time value used to initialize the wheels */
  value: Date
  /** Minimum allowed time (clamped on confirm) */
  minimumDate?: Date | null
  /** Maximum allowed time (clamped on confirm) */
  maximumDate?: Date | null
  title?: string
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1) // 1-12
const MINUTES = Array.from({ length: 60 }, (_, i) => i)   // 0-59

const COLORS = {
  backdrop: 'rgba(0, 0, 0, 0.5)',
  sheet: '#1A1A2E',
  surface: '#16213E',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  accent: '#FF6B47',
  border: 'rgba(255, 255, 255, 0.1)',
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TimePickerModal = memo(function TimePickerModal({
  visible,
  onClose,
  onConfirm,
  value,
  minimumDate,
  maximumDate,
  title = 'Select Time',
  testID,
}: TimePickerModalProps) {
  const insets = useSafeAreaInsets()

  const [hour, setHour] = useState(12)
  const [minute, setMinute] = useState(0)
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM')

  // Initialize wheels from value when modal opens
  useEffect(() => {
    if (visible && value) {
      const h = value.getHours()
      setAmpm(h >= 12 ? 'PM' : 'AM')
      setHour(h % 12 || 12)
      setMinute(value.getMinutes())
    }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDone = useCallback(() => {
    const hours24 = ampm === 'AM'
      ? (hour === 12 ? 0 : hour)
      : (hour === 12 ? 12 : hour + 12)

    const result = new Date(value)
    result.setHours(hours24, minute, 0, 0)

    // Clamp to bounds
    if (minimumDate && result < minimumDate) {
      onConfirm(new Date(minimumDate))
      return
    }
    if (maximumDate && result > maximumDate) {
      onConfirm(new Date(maximumDate))
      return
    }

    onConfirm(result)
  }, [hour, minute, ampm, value, minimumDate, maximumDate, onConfirm])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>

      {/* Sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Picker row */}
        <View style={styles.pickerRow}>
          {/* Hour */}
          <View style={styles.pickerColumn}>
            <Text style={styles.columnLabel}>Hour</Text>
            <Picker
              selectedValue={hour}
              onValueChange={setHour}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              testID={testID ? `${testID}-hour` : undefined}
            >
              {HOURS.map((h) => (
                <Picker.Item key={h} label={String(h)} value={h} />
              ))}
            </Picker>
          </View>

          {/* Minute */}
          <View style={styles.pickerColumn}>
            <Text style={styles.columnLabel}>Min</Text>
            <Picker
              selectedValue={minute}
              onValueChange={setMinute}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              testID={testID ? `${testID}-minute` : undefined}
            >
              {MINUTES.map((m) => (
                <Picker.Item
                  key={m}
                  label={String(m).padStart(2, '0')}
                  value={m}
                />
              ))}
            </Picker>
          </View>

          {/* AM/PM */}
          <View style={styles.pickerColumnSmall}>
            <Text style={styles.columnLabel}>{' '}</Text>
            <Picker
              selectedValue={ampm}
              onValueChange={setAmpm}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              testID={testID ? `${testID}-ampm` : undefined}
            >
              <Picker.Item label="AM" value="AM" />
              <Picker.Item label="PM" value="PM" />
            </Picker>
          </View>
        </View>

        {/* Done button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          activeOpacity={0.8}
          testID={testID ? `${testID}-done` : undefined}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
  },
  sheet: {
    backgroundColor: COLORS.sheet,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  pickerColumn: {
    flex: 2,
    alignItems: 'center',
  },
  pickerColumnSmall: {
    flex: 1.5,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  picker: {
    width: '100%',
    height: 150,
  },
  pickerItem: {
    color: COLORS.text,
    fontSize: 20,
  },
  doneButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
