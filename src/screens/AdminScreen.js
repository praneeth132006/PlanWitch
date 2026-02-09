import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
    Platform,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { subscribeToFeedback, deleteFeedback } from '../services/databaseService';

export default function AdminScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const [feedbackList, setFeedbackList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToFeedback((data) => {
            setFeedbackList(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleReply = (feedback) => {
        if (!feedback.userEmail || feedback.userEmail === 'anonymous') {
            Alert.alert('No Email', 'This feedback was submitted anonymously.');
            return;
        }

        const subject = 'Re: Your TravelWitch Feedback';
        const body = `Hi ${feedback.userName || 'there'},\n\nThanks for your feedback!\n\n> "${feedback.message}"\n\n`;

        if (Platform.OS === 'web') {
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${feedback.userEmail}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            Linking.openURL(gmailUrl);
        } else {
            Linking.openURL(`mailto:${feedback.userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Delete Feedback',
            'Are you sure you want to delete this feedback?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteFeedback(id);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete feedback');
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Dashboard</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>User Feedback ({feedbackList.length})</Text>

                {feedbackList.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="chat" size={48} color={colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No feedback yet</Text>
                    </View>
                ) : (
                    feedbackList.map((item) => (
                        <View key={item.id} style={[styles.card, { backgroundColor: isDark ? '#1F2937' : '#fff', borderColor: isDark ? '#374151' : '#eee' }]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.userInfo}>
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                                        <Text style={styles.avatarText}>{(item.userName || 'A')[0].toUpperCase()}</Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.userName, { color: colors.text }]}>{item.userName || 'Anonymous'}</Text>
                                        <Text style={[styles.userEmail, { color: colors.textMuted }]}>{item.userEmail || 'No email'}</Text>
                                    </View>
                                </View>
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>⭐ {item.rating}</Text>
                                </View>
                            </View>

                            <Text style={[styles.message, { color: colors.text }]}>{item.message}</Text>
                            <Text style={[styles.date, { color: colors.textMuted }]}>
                                {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString()}
                            </Text>

                            <View style={[styles.actions, { borderTopColor: isDark ? '#374151' : '#f3f4f6' }]}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                                    onPress={() => handleReply(item)}
                                >
                                    <Icon name="email" size={18} color={colors.primary} />
                                    <Text style={[styles.actionText, { color: colors.primary }]}>Reply</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#EF444415' }]}
                                    onPress={() => handleDelete(item.id)}
                                >
                                    <Icon name="delete" size={18} color="#EF4444" />
                                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 60,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 18,
    },
    userName: {
        fontWeight: '600',
        fontSize: 16,
    },
    userEmail: {
        fontSize: 12,
    },
    ratingBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    ratingText: {
        color: '#D97706',
        fontWeight: '700',
        fontSize: 14,
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 12,
    },
    date: {
        fontSize: 12,
        marginBottom: 16,
    },
    actions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 12,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    actionText: {
        fontWeight: '600',
        fontSize: 14,
    }
});
