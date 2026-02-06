import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Share, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import { useAlert } from '../context/AlertContext';

export default function DashboardScreen({ navigation, onBack }) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { tripInfo, getTotalExpenses, currency, packingItems, expenses, itinerary } = useTravelContext();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Copy trip code to clipboard
  const handleCopyCode = async () => {
    if (tripInfo?.tripCode) {
      try {
        await Clipboard.setStringAsync(tripInfo.tripCode);
        showAlert('Trip code copied to clipboard!', 'success');
      } catch (error) {
        Alert.alert('Trip Code', tripInfo.tripCode);
      }
    } else {
      Alert.alert('No Code', 'This trip does not have a code yet.');
    }
  };

  // Share trip code
  const handleShareCode = async () => {
    if (tripInfo?.tripCode) {
      try {
        await Share.share({
          message: `Join my trip to ${tripInfo.destination}! 🌍📍\n\nUse this code in RouteMate: ${tripInfo.tripCode}`,
        });
      } catch (error) {
        console.log('Share error:', error);
      }
    } else {
      Alert.alert('No Code', 'This trip does not have a code yet.');
    }
  };

  const totalExpenses = getTotalExpenses();
  const packedCount = packingItems.filter(i => i.packed).length;
  const totalItems = packingItems.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{tripInfo?.destination || 'My Trip'}</Text>
            <Text style={styles.headerSubtitle}>
              {typeof tripInfo?.startDate === 'string' ? tripInfo?.startDate : tripInfo?.startDate?.toLocaleDateString()} - {typeof tripInfo?.endDate === 'string' ? tripInfo?.endDate : tripInfo?.endDate?.toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Share Code Section - Using dynamic tripCode */}
        <View style={styles.shareCodeSection}>
          <View style={styles.shareCodeHeader}>
            <Text style={styles.shareCodeTitle}>🔗 Share Your Trip</Text>
            <Text style={styles.shareCodeSubtitle}>Invite friends to join</Text>
          </View>

          <View style={styles.shareCodeCard}>
            <View style={styles.shareCodeLeft}>
              <Text style={styles.shareCodeLabel}>Trip Code</Text>
              <Text style={styles.shareCodeValue}>
                {tripInfo?.tripCode || 'NO CODE'}
              </Text>
            </View>

            <View style={styles.shareCodeActions}>
              <Pressable
                style={({ pressed }) => [styles.codeActionBtn, pressed && { opacity: 0.7 }]}
                onPress={handleCopyCode}
              >
                <Text style={styles.codeActionIcon}>📋</Text>
                <Text style={styles.codeActionText}>Copy</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.codeActionBtn, styles.shareBtn, pressed && { opacity: 0.7 }]}
                onPress={handleShareCode}
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
              { icon: '💰', label: 'Budget', value: `${currency.symbol}${tripInfo?.budget || 0}` },
              { icon: '💳', label: 'Spent', value: `${currency.symbol}${totalExpenses}` },
              { icon: '🎒', label: 'Packing', value: `${packedCount}/${totalItems}` },
              { icon: '🗺️', label: 'Itinerary', value: `${itinerary.length} days` },
            ].map((item, index) => (
              <View key={index} style={styles.quickActionCard}>
                <Text style={styles.quickActionIcon}>{item.icon}</Text>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
                <Text style={styles.quickActionValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Add more dashboard sections here */}

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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Share Code Section
  shareCodeSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  shareCodeHeader: {
    marginBottom: 12,
  },
  shareCodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  shareCodeSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  shareCodeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  shareCodeLeft: {
    flex: 1,
  },
  shareCodeLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  shareCodeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 3,
  },
  shareCodeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  codeActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  shareBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  codeActionIcon: {
    fontSize: 16,
    marginBottom: 2,
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
    marginBottom: 12,
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
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
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
