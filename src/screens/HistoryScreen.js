import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { tripHistory, deleteTripFromHistory, formatCurrency, currency } = useTravelContext();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Calculate stats from real trip history
  const totalTrips = tripHistory.length;
  const totalDays = tripHistory.reduce((sum, t) => {
    const days = t.days || calculateTripDays(t.startDate, t.endDate);
    return sum + days;
  }, 0);
  const totalSpent = tripHistory.reduce((sum, t) => sum + (t.totalSpent || t.totalExpenses || 0), 0);

  // Helper to calculate trip days
  const calculateTripDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    try {
      const parts1 = startDate.split(' ');
      const parts2 = endDate.split(' ');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const start = new Date(parseInt(parts1[2]), months.indexOf(parts1[1]), parseInt(parts1[0]));
      const end = new Date(parseInt(parts2[2]), months.indexOf(parts2[1]), parseInt(parts2[0]));
      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  };

  // Get trip type icon
  const getTripTypeIcon = (tripType) => {
    const types = {
      solo: 'profile',
      friends: 'group',
      family: 'family',
      couple: 'couple',
      business: 'business',
    };
    return types[tripType] || 'map';
  };

  // Handle delete trip from history
  const handleDeleteTrip = () => {
    if (selectedTrip) {
      deleteTripFromHistory(selectedTrip.id);
      setShowDeleteModal(false);
      setSelectedTrip(null);
    }
  };

  // Confirm delete
  const confirmDelete = (trip) => {
    setSelectedTrip(trip);
    setShowDeleteModal(true);
  };

  // DEBUG: Log trip history
  useEffect(() => {
    console.log('=== HistoryScreen Debug ===');
    console.log('tripHistory length:', tripHistory?.length || 0);
    console.log('tripHistory:', JSON.stringify(tripHistory, null, 2));
  }, [tripHistory]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trip History</Text>
          <Text style={styles.subtitle}>Your past adventures</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="airplane" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>{totalTrips}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="calendar" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>{totalDays}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="budget" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>

        {/* Past Trips */}
        <Text style={styles.sectionTitle}>Past Trips</Text>

        {tripHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="map" size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No past trips yet</Text>
            <Text style={styles.emptyText}>Complete or end a trip to see it here</Text>
          </View>
        ) : (
          tripHistory.map((trip) => {
            const tripDays = trip.days || calculateTripDays(trip.startDate, trip.endDate);
            const tripSpent = trip.totalSpent || trip.totalExpenses || 0;

            return (
              <TouchableOpacity
                key={trip.id}
                style={styles.tripCard}
                activeOpacity={0.8}
                onLongPress={() => confirmDelete(trip)}
              >
                <View style={styles.tripIcon}>
                  <Icon name={getTripTypeIcon(trip.tripType)} size={24} color={colors.primary} />
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripName}>{trip.name || trip.destination}</Text>
                  <Text style={styles.tripDestination}>{trip.destination}</Text>
                  <View style={styles.tripMeta}>
                    <Icon name="calendar" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.tripDate}>{typeof (trip.completedDate || trip.startDate) === 'string' ? (trip.completedDate || trip.startDate) : (trip.completedDate || trip.startDate)?.toLocaleDateString()}</Text>
                    {tripDays > 0 && <Text style={styles.tripDays}>• {tripDays} days</Text>}
                  </View>
                  {trip.tripCode && (
                    <Text style={styles.tripCode}>Code: {trip.tripCode}</Text>
                  )}
                </View>
                <View style={styles.tripSpentContainer}>
                  <Text style={styles.tripSpentValue}>{formatCurrency(tripSpent)}</Text>
                  <Text style={styles.tripSpentLabel}>spent</Text>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(trip)}
                  >
                    <Icon name="delete" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Tip */}
        {tripHistory.length > 0 && (
          <View style={styles.tipContainer}>
            <Icon name="bulb" size={18} color={colors.primary} />
            <Text style={styles.tipText}>Long press on a trip to delete it from history</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconBg}>
              <Icon name="delete" size={36} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete from History?</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete this trip? All data will be removed, but the Trip Code will remain valid for others.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable style={styles.confirmCancelBtn} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmActionBtn} onPress={handleDeleteTrip}>
                <Text style={styles.confirmActionText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  header: { paddingTop: 20, marginBottom: 24 },
  title: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.primaryBorder },
  statEmoji: { fontSize: 24, marginBottom: 8 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  tripIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tripEmoji: { fontSize: 24 },
  tripInfo: { flex: 1, marginLeft: 14 },
  tripName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  tripDestination: { color: colors.primary, fontSize: 13, marginTop: 2 },
  tripMeta: { flexDirection: 'row', marginTop: 6 },
  tripDate: { color: colors.textMuted, fontSize: 12 },
  tripDays: { color: colors.textMuted, fontSize: 12, marginLeft: 4 },
  tripCode: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
  },
  tripSpentContainer: { alignItems: 'flex-end' },
  tripSpentValue: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  tripSpentLabel: { color: colors.textMuted, fontSize: 11 },
  deleteBtn: {
    marginTop: 8,
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 8, textAlign: 'center' },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  tipEmoji: { fontSize: 18 },
  tipText: { color: colors.primary, fontSize: 13, flex: 1 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  confirmIconBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EF444420',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  confirmIcon: { fontSize: 36 },
  confirmTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  confirmText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  confirmCancelText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  confirmActionBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  confirmActionText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
