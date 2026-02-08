import React, { useMemo } from 'react';
import { View, Text, Pressable, Share, Alert, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';

export default function TripDashboardScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { tripInfo, getTotalExpenses, currency, packingItems, itinerary } = useTravelContext();

  // Get trip data passed from WelcomeScreen OR use tripInfo from context
  const { trip: routeTrip, tripIndex } = route?.params || {};
  const trip = routeTrip || tripInfo;

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Copy trip code to clipboard
  const handleCopyTripCode = async () => {
    if (!trip?.tripCode) {
      Alert.alert('No Code', 'This trip does not have a code yet.');
      return;
    }

    try {
      await Clipboard.setStringAsync(trip.tripCode);
      Alert.alert('Copied!', `Trip code ${trip.tripCode} copied to clipboard`);
    } catch (error) {
      Alert.alert('Trip Code', trip.tripCode);
    }
  };

  // Share trip code function
  const handleShareTripCode = async () => {
    if (!trip?.tripCode) {
      Alert.alert('No Code', 'This trip does not have a code yet.');
      return;
    }

    try {
      await Share.share({
        message: `Join my trip to ${trip.destination}! 🌍📍\n\nUse this code in TravelWitch: ${trip.tripCode}`,
        title: 'Share Trip Code',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share trip code');
    }
  };

  const totalExpenses = getTotalExpenses();
  const packedCount = packingItems?.filter(i => i.packed).length || 0;
  const totalItems = packingItems?.length || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip Header */}
        <View style={styles.tripHeader}>
          <View style={styles.tripHeaderLeft}>
            <Text style={styles.tripBadge}>🧳 CURRENT TRIP</Text>
            <Text style={styles.tripName}>{trip?.destination || 'My Trip'}</Text>
            {trip?.startDate && trip?.endDate && (
              <Text style={styles.tripDates}>{typeof trip.startDate === 'string' ? trip.startDate : trip.startDate?.toLocaleDateString()} - {typeof trip.endDate === 'string' ? trip.endDate : trip.endDate?.toLocaleDateString()}</Text>
            )}
          </View>
        </View>

        {/* Share Code Section - Using dynamic tripCode */}
        <View style={styles.shareCodeSection}>
          <View style={styles.shareCodeHeader}>
            <Text style={styles.shareCodeTitle}>🔗 Share Your Trip</Text>
            <Text style={styles.shareCodeSubtitle}>Invite friends to join your adventure</Text>
          </View>

          <View style={styles.shareCodeCard}>
            <View style={styles.shareCodeLeft}>
              <Text style={styles.shareCodeLabel}>TRIP CODE</Text>
              <Text style={styles.shareCodeValue}>
                {trip?.tripCode || 'NO CODE'}
              </Text>
            </View>

            <View style={styles.shareCodeActions}>
              <Pressable
                style={({ pressed }) => [styles.codeActionBtn, pressed && { opacity: 0.7 }]}
                onPress={handleCopyTripCode}
              >
                <Text style={styles.codeActionIcon}>📋</Text>
                <Text style={styles.codeActionText}>Copy</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.codeActionBtn, styles.shareBtn, pressed && { opacity: 0.7 }]}
                onPress={handleShareTripCode}
              >
                <Text style={styles.codeActionIcon}>📤</Text>
                <Text style={styles.codeActionTextWhite}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {[
              { icon: '💰', label: 'Budget', value: `${currency?.symbol || '$'}${trip?.budget || 0}` },
              { icon: '💳', label: 'Spent', value: `${currency?.symbol || '$'}${totalExpenses}` },
              { icon: '🎒', label: 'Packing', value: `${packedCount}/${totalItems}` },
              { icon: '🗺️', label: 'Itinerary', value: `${itinerary?.length || 0} days` },
            ].map((item, index) => (
              <Pressable key={index} style={styles.quickActionCard}>
                <Text style={styles.quickActionIcon}>{item.icon}</Text>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
                <Text style={styles.quickActionValue}>{item.value}</Text>
              </Pressable>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Trip Header
  tripHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryBorder,
  },
  tripHeaderLeft: {},
  tripBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  tripName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
  },
  tripDates: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Share Code Section
  shareCodeSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  shareCodeHeader: {
    marginBottom: 14,
  },
  shareCodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  shareCodeSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  shareCodeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  shareCodeLeft: {
    flex: 1,
  },
  shareCodeLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  shareCodeValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 4,
  },
  shareCodeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  codeActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    minWidth: 60,
  },
  shareBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  codeActionIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  codeActionText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  codeActionTextWhite: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 14,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  quickActionIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  quickActionLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  quickActionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
});
