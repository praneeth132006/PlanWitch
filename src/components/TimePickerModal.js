import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

export default function TimePickerModal({ visible, onClose, onSelect, selectedTime, title }) {
  const { colors } = useTheme();

  // Parse existing time or default
  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: 9, minute: '00', period: 'AM' };
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      return { hour: parseInt(match[1]), minute: match[2], period: match[3].toUpperCase() };
    }
    return { hour: 9, minute: '00', period: 'AM' };
  };

  const parsed = parseTime(selectedTime);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleConfirm = () => {
    const formatted = `${hour.toString().padStart(2, '0')}:${minute} ${period}`;
    onSelect(formatted);
    onClose();
  };

  const getTimeDisplay = () => `${hour.toString().padStart(2, '0')}:${minute} ${period}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title || 'Select Time'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Clock Display */}
          <View style={styles.clockDisplay}>
            <Text style={styles.clockIcon}>🕐</Text>
            <Text style={styles.clockTime}>{getTimeDisplay()}</Text>
          </View>

          {/* Time Picker */}
          <View style={styles.pickerContainer}>
            {/* Hour Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.pickerItem, hour === h && styles.pickerItemActive]}
                    onPress={() => setHour(h)}
                  >
                    <Text style={[styles.pickerItemText, hour === h && styles.pickerItemTextActive]}>
                      {h.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Separator */}
            <View style={styles.pickerSeparator}>
              <Text style={styles.separatorText}>:</Text>
            </View>

            {/* Minute Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Min</Text>
              <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pickerItem, minute === m && styles.pickerItemActive]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[styles.pickerItemText, minute === m && styles.pickerItemTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Period Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>AM/PM</Text>
              <View style={styles.periodContainer}>
                {PERIODS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodItem, period === p && styles.periodItemActive]}
                    onPress={() => setPeriod(p)}
                  >
                    <Text style={[styles.periodItemText, period === p && styles.periodItemTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Quick Select */}
          <View style={styles.quickSelect}>
            <Text style={styles.quickSelectLabel}>Quick Select</Text>
            <View style={styles.quickSelectGrid}>
              {[
                { label: '🌅 6 AM', h: 6, m: '00', p: 'AM' },
                { label: '☀️ 9 AM', h: 9, m: '00', p: 'AM' },
                { label: '🌞 12 PM', h: 12, m: '00', p: 'PM' },
                { label: '🌤️ 3 PM', h: 3, m: '00', p: 'PM' },
                { label: '🌆 6 PM', h: 6, m: '00', p: 'PM' },
                { label: '🌙 9 PM', h: 9, m: '00', p: 'PM' },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickSelectItem}
                  onPress={() => { setHour(item.h); setMinute(item.m); setPeriod(item.p); }}
                >
                  <Text style={styles.quickSelectText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Set Time</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 24,
  },
  clockDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  clockIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  clockTime: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: 'bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pickerScroll: {
    maxHeight: 150,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerItemActive: {
    backgroundColor: colors.primary,
  },
  pickerItemText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  pickerItemTextActive: {
    color: colors.bg,
    fontWeight: 'bold',
  },
  pickerSeparator: {
    paddingTop: 40,
    paddingHorizontal: 4,
  },
  separatorText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  periodContainer: {
    gap: 8,
  },
  periodItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  periodItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodItemText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  periodItemTextActive: {
    color: colors.bg,
  },
  quickSelect: {
    marginBottom: 16,
  },
  quickSelectLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  quickSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSelectItem: {
    backgroundColor: colors.cardLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  quickSelectText: {
    color: colors.text,
    fontSize: 12,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
