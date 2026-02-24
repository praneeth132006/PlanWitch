import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    SafeAreaView,
    StatusBar,
    Image
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';
import PremiumBackButton from '../components/PremiumBackButton';

export default function JoinSelectionScreen({ trip, onBack, onJoinComplete }) {
    const { colors, isDark } = useTheme();
    const { joinTripByCode, joinAsNewTraveler, isLoading } = useTravelContext();

    const [selectedParticipantId, setSelectedParticipantId] = useState(null);
    const [joiningAsNew, setJoiningAsNew] = useState(false);
    const [newTravelerName, setNewTravelerName] = useState('');
    const [selectedFamilyGroup, setSelectedFamilyGroup] = useState(null);

    // Get unique family groups from participants
    const familyGroups = useMemo(() => {
        if (!trip?.participants) return [];
        const groups = new Set();
        trip.participants.forEach(p => {
            if (p.familyGroup) groups.add(p.familyGroup);
        });
        return Array.from(groups);
    }, [trip]);

    const handleConfirmJoin = async () => {
        if (joiningAsNew) {
            if (!newTravelerName.trim()) {
                Alert.alert('Required', 'Please enter your name');
                return;
            }

            if (trip.tripType === 'family' && !selectedFamilyGroup) {
                Alert.alert('Selection Required', 'Please choose which family you belong to or join as a new family');
                return;
            }

            let finalFamilyGroup = selectedFamilyGroup;
            if (isFamilyTrip && selectedFamilyGroup === 'New Family') {
                const existingFamilyNumbers = familyGroups
                    .map(g => {
                        const match = g.match(/Family (\d+)/);
                        return match ? parseInt(match[1]) : 0;
                    })
                    .filter(n => n > 0);
                const nextNumber = existingFamilyNumbers.length > 0 ? Math.max(...existingFamilyNumbers) + 1 : familyGroups.length + 1;
                finalFamilyGroup = `Family ${nextNumber}`;
            }

            const result = await joinAsNewTraveler(trip, newTravelerName, finalFamilyGroup);
            if (result.success) {
                onJoinComplete(result.trip);
            } else {
                Alert.alert('Error', result.error || 'Failed to join trip');
            }
        } else if (selectedParticipantId) {
            const result = await joinTripByCode(trip.tripCode, selectedParticipantId);
            if (result.success) {
                onJoinComplete(result.trip);
            } else {
                Alert.alert('Error', result.error || 'Failed to join trip');
            }
        } else {
            Alert.alert('Selection Required', 'Please select who you are or join as a new traveler');
        }
    };

    const isFamilyTrip = trip?.tripType === 'family';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <PremiumBackButton onPress={onBack} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Identity Selection</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.iconContainer}>
                    <View style={[styles.iconBg, { backgroundColor: colors.primaryMuted }]}>
                        <Icon name="profile" size={32} color={colors.primary} />
                    </View>
                </View>

                <Text style={[styles.title, { color: colors.text }]}>Who are you?</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    Select your name from the travelers list or join as a new person
                </Text>

                <View style={styles.listContainer}>
                    {/* Join as New Option */}
                    <Pressable
                        style={[
                            styles.card,
                            { backgroundColor: colors.card, borderColor: colors.primaryBorder },
                            joiningAsNew && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                        ]}
                        onPress={() => {
                            setJoiningAsNew(true);
                            setSelectedParticipantId(null);
                        }}
                    >
                        <View style={styles.cardContent}>
                            <Icon name="add" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                            <Text style={[styles.cardName, { color: colors.text }]}>Join as new traveler</Text>
                        </View>
                        {joiningAsNew && <View style={[styles.radioActive, { backgroundColor: colors.primary }]} />}
                    </Pressable>

                    {joiningAsNew && (
                        <View style={styles.newTravelerForm}>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.primaryBorder }]}
                                placeholder="Enter your name"
                                placeholderTextColor={colors.textMuted}
                                value={newTravelerName}
                                onChangeText={setNewTravelerName}
                                autoFocus
                            />

                            {isFamilyTrip && (
                                <View style={styles.familySelectionSection}>
                                    <Text style={[styles.selectionLabel, { color: colors.text }]}>Which family do you belong to?</Text>
                                    <View style={styles.familyOptionsGrid}>
                                        {familyGroups.map(group => (
                                            <Pressable
                                                key={group}
                                                style={[
                                                    styles.familyOption,
                                                    { backgroundColor: colors.card, borderColor: colors.primaryBorder },
                                                    selectedFamilyGroup === group && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                                                ]}
                                                onPress={() => setSelectedFamilyGroup(group)}
                                            >
                                                <Text style={[styles.familyOptionText, { color: selectedFamilyGroup === group ? colors.primary : colors.text }]}>
                                                    {group}
                                                </Text>
                                            </Pressable>
                                        ))}
                                        <Pressable
                                            style={[
                                                styles.familyOption,
                                                { backgroundColor: colors.card, borderColor: colors.primaryBorder },
                                                selectedFamilyGroup === 'New Family' && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                                            ]}
                                            onPress={() => setSelectedFamilyGroup('New Family')}
                                        >
                                            <Text style={[styles.familyOptionText, { color: selectedFamilyGroup === 'New Family' ? colors.primary : colors.text }]}>
                                                + New Family
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.divider}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.primaryBorder }]} />
                        <Text style={[styles.dividerText, { color: colors.textMuted }]}>Existing Travelers</Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.primaryBorder }]} />
                    </View>

                    {/* Existing Participants */}
                    {trip?.participants?.map((p) => {
                        const isClaimed = !!p.userId;
                        const isSelected = selectedParticipantId === p.id;

                        return (
                            <Pressable
                                key={p.id}
                                style={[
                                    styles.card,
                                    { backgroundColor: colors.card, borderColor: colors.primaryBorder },
                                    isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                                    isClaimed && { opacity: 0.5, backgroundColor: colors.bg }
                                ]}
                                onPress={() => {
                                    if (!isClaimed) {
                                        setSelectedParticipantId(p.id);
                                        setJoiningAsNew(false);
                                    } else {
                                        Alert.alert('Already Claimed', `${p.name} is already taken by another user.`);
                                    }
                                }}
                                disabled={isClaimed}
                            >
                                <View style={styles.cardContent}>
                                    <Icon name="profile" size={24} color={colors.text} style={{ marginRight: 16 }} />
                                    <View>
                                        <Text style={[styles.cardName, { color: colors.text }]}>{p.name}</Text>
                                        <Text style={[styles.statusText, { color: colors.textMuted }]}>
                                            {isClaimed ? 'Occupied' : (p.familyGroup || 'Traveler')}
                                        </Text>
                                    </View>
                                </View>
                                {isSelected && <View style={[styles.radioActive, { backgroundColor: colors.primary }]} />}
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.primaryBorder }]}>
                <Pressable
                    style={[
                        styles.joinButton,
                        { backgroundColor: colors.primary },
                        (!selectedParticipantId && !joiningAsNew) && { opacity: 0.5 }
                    ]}
                    onPress={handleConfirmJoin}
                    disabled={(!selectedParticipantId && !joiningAsNew) || isLoading}
                >
                    <Text style={styles.joinButtonText}>{isLoading ? 'Joining...' : 'Confirm & Join Trip'}</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    backButton: { padding: 5 },
    backButtonText: { fontSize: 16, fontWeight: '600' },
    content: { padding: 24, paddingBottom: 100 },
    iconContainer: { alignItems: 'center', marginBottom: 24 },
    iconBg: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 40 },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    listContainer: { width: '100%' },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        marginBottom: 12
    },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    cardEmoji: { fontSize: 24, marginRight: 16 },
    cardName: { fontSize: 18, fontWeight: 'bold' },
    radioActive: { width: 20, height: 20, borderRadius: 10, borderWidth: 4, borderColor: '#FFFFFF' },
    statusText: { fontSize: 12, marginTop: 2 },
    input: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        fontSize: 16,
    },
    newTravelerForm: {
        marginBottom: 20
    },
    familySelectionSection: {
        marginTop: 20,
    },
    selectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
        opacity: 0.8
    },
    familyOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    familyOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    familyOptionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { marginHorizontal: 16, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    footer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1
    },
    joinButton: {
        width: '100%',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center'
    },
    joinButtonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' }
});
