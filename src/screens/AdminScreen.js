import React, { useState, useEffect, useMemo } from 'react';
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
    StatusBar,
    Dimensions,
    TextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import PremiumBackButton from '../components/PremiumBackButton';
import { subscribeToFeedback, deleteFeedback, updateFeedbackReadStatus } from '../services/databaseService';
import { createCoupon, subscribeToCoupons, updateCoupon, deleteCoupon } from '../services/couponService';
import crashlytics from '@react-native-firebase/crashlytics';
import perf from '@react-native-firebase/perf';

const { width } = Dimensions.get('window');

/**
 * Helper to format date for display
 */
const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export default function AdminScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('feedback'); // feedback, coupons
    const [feedbackList, setFeedbackList] = useState([]);
    const [couponList, setCouponList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // feedback: all, read, unread | coupons: all, active, expired
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest

    // Coupon Form State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [couponForm, setCouponForm] = useState({
        code: '',
        discount: '',
        maxJoiners: '',
        validFrom: '',
        validTo: '',
    });

    useEffect(() => {
        const unsubscribeFeedback = subscribeToFeedback((data) => {
            setFeedbackList(data);
            if (activeTab === 'feedback') setLoading(false);
        });

        const unsubscribeCoupons = subscribeToCoupons((data) => {
            setCouponList(data);
            if (activeTab === 'coupons') setLoading(false);
        });

        return () => {
            unsubscribeFeedback();
            unsubscribeCoupons();
        };
    }, [activeTab]);

    // Calculate Feedback Stats
    const feedbackStats = useMemo(() => {
        if (!feedbackList.length) return { total: 0, avg: 0, fiveStar: 0, unread: 0 };
        const total = feedbackList.length;
        const sum = feedbackList.reduce((acc, curr) => acc + (curr.rating || 0), 0);
        const avg = (sum / total).toFixed(1);
        const fiveStar = feedbackList.filter(f => f.rating === 5).length;
        const unread = feedbackList.filter(f => !f.isRead).length;
        return { total, avg, fiveStar, unread };
    }, [feedbackList]);

    // Calculate Coupon Stats
    const couponStats = useMemo(() => {
        if (!couponList.length) return { total: 0, active: 0, used: 0 };
        const total = couponList.length;
        const now = Date.now();
        const active = couponList.filter(c => c.isActive && (!c.validTo || c.validTo > now)).length;
        const used = couponList.reduce((acc, curr) => acc + (curr.usageCount || 0), 0);
        return { total, active, used };
    }, [couponList]);

    const filteredFeedback = useMemo(() => {
        let result = [...feedbackList];
        if (filter === 'read') result = result.filter(f => f.isRead);
        else if (filter === 'unread') result = result.filter(f => !f.isRead);

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f =>
                (f.userName || '').toLowerCase().includes(query) ||
                (f.message || '').toLowerCase().includes(query) ||
                (f.userEmail || '').toLowerCase().includes(query)
            );
        }

        result.sort((a, b) => sortBy === 'newest' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0));
        return result;
    }, [feedbackList, searchQuery, filter, sortBy]);

    const filteredCoupons = useMemo(() => {
        let result = [...couponList];
        const now = Date.now();

        if (filter === 'active') result = result.filter(c => c.isActive && (!c.validTo || c.validTo > now));
        else if (filter === 'expired') result = result.filter(c => !c.isActive || (c.validTo && c.validTo < now));

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c => (c.code || '').toLowerCase().includes(query));
        }

        result.sort((a, b) => sortBy === 'newest' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0));
        return result;
    }, [couponList, searchQuery, filter, sortBy]);

    const handleMarkAsRead = async (id, currentStatus) => {
        try {
            await updateFeedbackReadStatus(id, !currentStatus);
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadItems = feedbackList.filter(f => !f.isRead);
        if (unreadItems.length === 0) {
            Alert.alert('No Unread', 'All feedback are already marked as read.');
            return;
        }

        Alert.alert(
            'Mark All as Read',
            `Are you sure you want to mark all ${unreadItems.length} unread items as read?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            const promises = unreadItems.map(item => updateFeedbackReadStatus(item.id, true));
                            await Promise.all(promises);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to update some items');
                        }
                    }
                }
            ]
        );
    };

    const handleReply = (feedback) => {
        if (!feedback.userEmail || feedback.userEmail === 'anonymous') {
            Alert.alert('No Email', 'This feedback was submitted anonymously.');
            return;
        }

        const subject = 'Re: Your PlanWitch Feedback';
        const body = `Hi ${feedback.userName || 'there'},\n\nThanks for your feedback!\n\n> "${feedback.message}"\n\n`;

        if (Platform.OS === 'web') {
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${feedback.userEmail}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(gmailUrl, '_blank');
        } else {
            Linking.openURL(`mailto:${feedback.userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        }
    };

    const handleDeleteFeedback = (id) => {
        Alert.alert(
            'Delete Feedback',
            'This action is permanent.',
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

    const handleToggleCoupon = async (id, currentStatus) => {
        try {
            await updateCoupon(id, { isActive: !currentStatus });
        } catch (error) {
            Alert.alert('Error', 'Failed to update coupon');
        }
    };

    const handleDeleteCoupon = (id) => {
        Alert.alert(
            'Delete Coupon',
            'This will permanently remove the coupon.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCoupon(id);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete coupon');
                        }
                    }
                }
            ]
        );
    };

    const handleCreateCoupon = async () => {
        const { code, discount, maxJoiners, validFrom, validTo } = couponForm;

        if (!code || !discount) {
            Alert.alert('Error', 'Please enter at least code and discount amount.');
            return;
        }

        try {
            const data = {
                code: code.toUpperCase().trim(),
                discount: parseFloat(discount),
                maxJoiners: maxJoiners ? parseInt(maxJoiners) : null,
                validFrom: validFrom ? new Date(validFrom).getTime() : null,
                validTo: validTo ? new Date(validTo).getTime() : null,
            };

            await createCoupon(data);
            setShowCreateModal(false);
            setCouponForm({ code: '', discount: '', maxJoiners: '', validFrom: '', validTo: '' });
            Alert.alert('Success', 'Coupon created successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to create coupon: ' + error.message);
        }
    };

    const GlassCard = ({ children, style }) => {
        return (
            <View style={[
                styles.glassCard,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)' },
                style
            ]}>
                {children}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F9FAFB' }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Premium Header */}
            <View style={styles.header}>
                <PremiumBackButton onPress={() => navigation.goBack()} />
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerSubtitle, { color: colors.primary }]}>ADMIN PANEL</Text>
                    <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>Dashboard</Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.statusText, { color: colors.textMuted }]}>System Live</Text>
                </View>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'feedback' && styles.activeTab]}
                    onPress={() => {
                        setActiveTab('feedback');
                        setFilter('all');
                    }}
                >
                    <Icon name="message" size={18} color={activeTab === 'feedback' ? colors.primary : colors.textMuted} />
                    <Text style={[styles.tabText, { color: activeTab === 'feedback' ? colors.primary : colors.textMuted }]}>Feedback</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'coupons' && styles.activeTab]}
                    onPress={() => {
                        setActiveTab('coupons');
                        setFilter('all');
                    }}
                >
                    <Icon name="link" size={18} color={activeTab === 'coupons' ? colors.primary : colors.textMuted} />
                    <Text style={[styles.tabText, { color: activeTab === 'coupons' ? colors.primary : colors.textMuted }]}>Coupons</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'feedback' ? (
                    <>
                        {/* Statistics Row - Feedback */}
                        <View style={styles.statsRow}>
                            <GlassCard style={styles.statItem}>
                                <Icon name="message" size={20} color={colors.primary} />
                                <Text style={styles.statValue}>{feedbackStats.total}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </GlassCard>
                            <GlassCard style={styles.statItem}>
                                <Icon name="notification" size={20} color={feedbackStats.unread > 0 ? colors.warning : colors.success} />
                                <Text style={styles.statValue}>{feedbackStats.unread}</Text>
                                <Text style={styles.statLabel}>Unread</Text>
                            </GlassCard>
                            <GlassCard style={styles.statItem}>
                                <Icon name="star" size={20} color="#F59E0B" />
                                <Text style={styles.statValue}>{feedbackStats.avg}</Text>
                                <Text style={styles.statLabel}>Rating</Text>
                            </GlassCard>
                        </View>

                        {/* Filters & Actions */}
                        <View style={styles.filterSection}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                                {['all', 'unread', 'read'].map((f) => (
                                    <TouchableOpacity
                                        key={f}
                                        style={[
                                            styles.filterChip,
                                            filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setFilter(f)}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            { color: isDark ? '#FFF' : '#000' },
                                            filter === f && { color: isDark ? '#000' : '#FFF' }
                                        ]}>
                                            {f.charAt(0).toUpperCase() + f.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.sortToggle}
                                onPress={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
                            >
                                <Icon name="sort" size={16} color={colors.primary} />
                                <Text style={[styles.sortText, { color: colors.primary }]}>
                                    {sortBy === 'newest' ? 'Newest' : 'Oldest'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Section Header */}
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#111' }]}>
                                {filter === 'unread' ? 'Unread Feedback' : filter === 'read' ? 'Read Feedback' : 'All Feedback'}
                            </Text>
                            {filter !== 'read' && feedbackStats.unread > 0 && (
                                <TouchableOpacity onPress={handleMarkAllAsRead}>
                                    <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all as read</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {filteredFeedback.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="chat" size={64} color={isDark ? '#333' : '#CCC'} />
                                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                    {searchQuery ? 'No matching feedback' : `No ${filter} feedback found`}
                                </Text>
                            </View>
                        ) : (
                            filteredFeedback.map((item) => (
                                <GlassCard
                                    key={item.id}
                                    style={[
                                        styles.feedbackCard,
                                        !item.isRead && { borderColor: colors.primary + '40', borderWidth: 1.5 }
                                    ]}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={styles.userInfo}>
                                            <View style={[styles.avatar, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
                                                <Text style={[styles.avatarText, { color: colors.primary }]}>
                                                    {(item.userName || 'A')[0].toUpperCase()}
                                                </Text>
                                            </View>
                                            <View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={[styles.userName, { color: isDark ? '#FFF' : '#111' }]}>{item.userName || 'Anonymous'}</Text>
                                                    {!item.isRead && (
                                                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]} />
                                                    )}
                                                </View>
                                                <Text style={[styles.userEmail, { color: colors.textMuted }]}>{item.userEmail || 'no-email@anonymous.com'}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.ratingContainer, { backgroundColor: '#F59E0B15' }]}>
                                            <Icon name="star" size={12} color="#F59E0B" />
                                            <Text style={styles.ratingText}>{item.rating}</Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.message, { color: isDark ? '#E5E7EB' : '#374151' }]}>{item.message}</Text>

                                    <View style={styles.cardFooter}>
                                        <Text style={[styles.date, { color: colors.textLight }]}>
                                            {formatDate(item.createdAt)} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <View style={styles.cardActions}>
                                            <TouchableOpacity
                                                style={[styles.miniAction, { backgroundColor: colors.primary + '15' }]}
                                                onPress={() => handleMarkAsRead(item.id, item.isRead)}
                                            >
                                                <Icon name={item.isRead ? 'eye_off' : 'eye'} size={16} color={colors.primary} />
                                                <Text style={[styles.miniActionText, { color: colors.primary }]}>
                                                    {item.isRead ? 'Unread' : 'Read'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.miniAction, { backgroundColor: colors.primary + '15' }]}
                                                onPress={() => handleReply(item)}
                                            >
                                                <Icon name="email" size={16} color={colors.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.miniAction, { backgroundColor: '#EF444415' }]}
                                                onPress={() => handleDeleteFeedback(item.id)}
                                            >
                                                <Icon name="delete" size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </GlassCard>
                            ))
                        )}

                        {/* System Diagnostics */}
                        <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#111' }]}>System Diagnostics</Text>
                        </View>

                        <GlassCard style={styles.diagnosticsCard}>
                            <Text style={[styles.diagnosticsTitle, { color: colors.primary }]}>Firebase Analytics Setup</Text>
                            <Text style={[styles.diagnosticsText, { color: isDark ? '#CCC' : '#666' }]}>
                                Analytics data (Crashlytics & Performance) only appears in the console when the app is running as a <Text style={{ fontWeight: 'bold' }}>Development Client</Text> or <Text style={{ fontWeight: 'bold' }}>Build</Text>.
                            </Text>

                            <View style={styles.diagnosticsActions}>
                                <TouchableOpacity
                                    style={[styles.diagButton, { backgroundColor: '#EF4444' }]}
                                    onPress={() => {
                                        Alert.alert('Test Crash', 'This will force the app to crash.', [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Crash Now', onPress: () => crashlytics().crash() }
                                        ]);
                                    }}
                                >
                                    <Icon name="close" size={16} color="#FFF" />
                                    <Text style={styles.diagButtonText}>Test Crash</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.diagButton, { backgroundColor: colors.primary }]}
                                    onPress={async () => {
                                        const trace = await perf().newTrace('test_trace');
                                        await trace.start();
                                        setTimeout(async () => {
                                            await trace.stop();
                                            Alert.alert('Success', 'Performance trace "test_trace" sent.');
                                        }, 2000);
                                    }}
                                >
                                    <Icon name="clock" size={16} color="#000" />
                                    <Text style={[styles.diagButtonText, { color: '#000' }]}>Test Trace</Text>
                                </TouchableOpacity>
                            </View>
                        </GlassCard>
                    </>
                ) : (
                    <>
                        {/* Statistics Row - Coupons */}
                        <View style={styles.statsRow}>
                            <GlassCard style={styles.statItem}>
                                <Icon name="link" size={20} color={colors.primary} />
                                <Text style={styles.statValue}>{couponStats.total}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </GlassCard>
                            <GlassCard style={styles.statItem}>
                                <Icon name="location" size={20} color={colors.success} />
                                <Text style={styles.statValue}>{couponStats.active}</Text>
                                <Text style={styles.statLabel}>Active</Text>
                            </GlassCard>
                            <GlassCard style={styles.statItem}>
                                <Icon name="friends" size={20} color="#F59E0B" />
                                <Text style={styles.statValue}>{couponStats.used}</Text>
                                <Text style={styles.statLabel}>Redeemed</Text>
                            </GlassCard>
                        </View>

                        {/* Filters & Actions - Coupons */}
                        <View style={styles.filterSection}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                                {['all', 'active', 'expired'].map((f) => (
                                    <TouchableOpacity
                                        key={f}
                                        style={[
                                            styles.filterChip,
                                            filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }
                                        ]}
                                        onPress={() => setFilter(f)}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            { color: isDark ? '#FFF' : '#000' },
                                            filter === f && { color: isDark ? '#000' : '#FFF' }
                                        ]}>
                                            {f.charAt(0).toUpperCase() + f.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity
                                style={[styles.diagButton, { backgroundColor: colors.primary, flex: 0, paddingHorizontal: 15 }]}
                                onPress={() => setShowCreateModal(true)}
                            >
                                <Icon name="add" size={18} color="#000" />
                                <Text style={[styles.diagButtonText, { color: '#000' }]}>Create</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Section Header */}
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#111' }]}>
                                {filter === 'active' ? 'Active Coupons' : filter === 'expired' ? 'Expired Coupons' : 'All Coupons'}
                            </Text>
                        </View>

                        {filteredCoupons.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="link" size={64} color={isDark ? '#333' : '#CCC'} />
                                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                    {searchQuery ? 'No matching coupons' : `No ${filter} coupons found`}
                                </Text>
                            </View>
                        ) : (
                            filteredCoupons.map((coupon) => {
                                const isActuallyExpired = coupon.validTo && coupon.validTo < Date.now();
                                return (
                                    <GlassCard
                                        key={coupon.id}
                                        style={[
                                            styles.feedbackCard,
                                            (!coupon.isActive || isActuallyExpired) && { opacity: 0.6 }
                                        ]}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View style={styles.userInfo}>
                                                <View style={[styles.avatar, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40', borderRadius: 10 }]}>
                                                    <Icon name="link" size={24} color={colors.primary} />
                                                </View>
                                                <View>
                                                    <Text style={[styles.userName, { color: isDark ? '#FFF' : '#111', fontSize: 18, letterSpacing: 1 }]}>
                                                        {coupon.code}
                                                    </Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <View style={[styles.statusDot, { backgroundColor: coupon.isActive && !isActuallyExpired ? colors.success : '#EF4444', height: 8, width: 8 }]} />
                                                        <Text style={[styles.userEmail, { color: colors.textMuted, marginLeft: 6 }]}>
                                                            {coupon.isActive && !isActuallyExpired ? 'Active' : (isActuallyExpired ? 'Expired' : 'Disabled')}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={[styles.ratingContainer, { backgroundColor: colors.primary + '20' }]}>
                                                <Text style={[styles.ratingText, { color: colors.primary }]}>{coupon.discount}{coupon.discount <= 100 ? '%' : ''} OFF</Text>
                                            </View>
                                        </View>

                                        <View style={styles.couponStatsGrid}>
                                            <View style={styles.couponStatBox}>
                                                <Text style={[styles.couponStatLabel, { color: colors.textMuted }]}>Usage</Text>
                                                <Text style={[styles.couponStatValue, { color: isDark ? '#FFF' : '#000' }]}>
                                                    {coupon.usageCount || 0} / {coupon.maxJoiners || '∞'}
                                                </Text>
                                            </View>
                                            <View style={styles.couponStatBox}>
                                                <Text style={[styles.couponStatLabel, { color: colors.textMuted }]}>Valid From</Text>
                                                <Text style={[styles.couponStatValue, { color: isDark ? '#FFF' : '#000' }]}>{formatDate(coupon.validFrom)}</Text>
                                            </View>
                                            <View style={styles.couponStatBox}>
                                                <Text style={[styles.couponStatLabel, { color: colors.textMuted }]}>Valid To</Text>
                                                <Text style={[styles.couponStatValue, { color: isDark ? '#FFF' : '#000' }]}>
                                                    {coupon.validTo ? formatDate(coupon.validTo) : 'Forever'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.cardFooter}>
                                            <Text style={[styles.date, { color: colors.textLight }]}>
                                                Created: {formatDate(coupon.createdAt)}
                                            </Text>
                                            <View style={styles.cardActions}>
                                                <TouchableOpacity
                                                    style={[styles.miniAction, { backgroundColor: colors.primary + '15' }]}
                                                    onPress={() => handleToggleCoupon(coupon.id, coupon.isActive)}
                                                >
                                                    <Icon name={coupon.isActive ? 'eye_off' : 'eye'} size={16} color={colors.primary} />
                                                    <Text style={[styles.miniActionText, { color: colors.primary }]}>
                                                        {coupon.isActive ? 'Disable' : 'Enable'}
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.miniAction, { backgroundColor: '#EF444415' }]}
                                                    onPress={() => handleDeleteCoupon(coupon.id)}
                                                >
                                                    <Icon name="delete" size={16} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </GlassCard>
                                );
                            })
                        )}
                    </>
                )}
            </ScrollView>

            {/* Create Coupon Modal */}
            <Modal
                visible={showCreateModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.fullScreenOverlay}>
                    <View style={[styles.dialogContainer, { width: '90%', maxWidth: 450 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : '#000' }]}>Create New Coupon</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Icon name="close" size={24} color={isDark ? '#FFF' : '#000'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: colors.textMuted }]}>COUPON CODE</Text>
                                <TextInput
                                    style={[styles.formInput, { color: colors.text, borderColor: colors.primaryBorder }]}
                                    placeholder="e.g. WELCOME50"
                                    placeholderTextColor={colors.textMuted}
                                    value={couponForm.code}
                                    onChangeText={(text) => setCouponForm({ ...couponForm, code: text })}
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: colors.textMuted }]}>DISCOUNT (% or Fixed)</Text>
                                <TextInput
                                    style={[styles.formInput, { color: colors.text, borderColor: colors.primaryBorder }]}
                                    placeholder="e.g. 50"
                                    placeholderTextColor={colors.textMuted}
                                    value={couponForm.discount}
                                    onChangeText={(text) => setCouponForm({ ...couponForm, discount: text })}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: colors.textMuted }]}>MAX USAGES (Joiners)</Text>
                                <TextInput
                                    style={[styles.formInput, { color: colors.text, borderColor: colors.primaryBorder }]}
                                    placeholder="e.g. 10 (Leave blank for unlimited)"
                                    placeholderTextColor={colors.textMuted}
                                    value={couponForm.maxJoiners}
                                    onChangeText={(text) => setCouponForm({ ...couponForm, maxJoiners: text })}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: colors.textMuted }]}>VALID FROM (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={[styles.formInput, { color: colors.text, borderColor: colors.primaryBorder }]}
                                    placeholder="e.g. 2026-03-01"
                                    placeholderTextColor={colors.textMuted}
                                    value={couponForm.validFrom}
                                    onChangeText={(text) => setCouponForm({ ...couponForm, validFrom: text })}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.formLabel, { color: colors.textMuted }]}>VALID TO (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={[styles.formInput, { color: colors.text, borderColor: colors.primaryBorder }]}
                                    placeholder="e.g. 2026-04-01"
                                    placeholderTextColor={colors.textMuted}
                                    value={couponForm.validTo}
                                    onChangeText={(text) => setCouponForm({ ...couponForm, validTo: text })}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowCreateModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                                onPress={handleCreateCoupon}
                            >
                                <Text style={styles.modalSubmitText}>Create Coupon</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: 20,
        height: 80,
        paddingTop: 10,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 15,
    },
    headerSubtitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 10,
        gap: 10,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 8,
    },
    activeTab: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.2)',
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 25,
    },
    statItem: {
        width: (width - 60) / 3,
        height: 100,
        borderRadius: 20,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: {
                backgroundColor: 'rgba(255,255,255,0.03)',
                padding: 12,
            }
        })
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 8,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 10,
        color: '#888',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 20,
        paddingHorizontal: 5,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    glassCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    feedbackCard: {
        ...Platform.select({
            ios: { padding: 20 },
            android: { padding: 20 },
        })
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
    },
    avatarText: {
        fontWeight: '700',
        fontSize: 18,
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 12,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    ratingText: {
        color: '#F59E0B',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 4,
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 15,
    },
    date: {
        fontSize: 11,
        fontWeight: '500',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    miniAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    miniActionText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        opacity: 0.6,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        fontWeight: '500',
    },
    filterSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    filterContainer: {
        gap: 8,
        paddingRight: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    sortToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        gap: 6,
    },
    sortText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    unreadBadge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    markAllText: {
        fontSize: 13,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    diagnosticsCard: {
        marginTop: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    diagnosticsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    diagnosticsText: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 20,
    },
    diagnosticsActions: {
        flexDirection: 'row',
        gap: 12,
    },
    diagButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    diagButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    fullScreenOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dialogContainer: {
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 8,
    },
    formInput: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        gap: 12,
    },
    modalCancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    modalCancelText: {
        color: '#888',
        fontWeight: 'bold',
    },
    modalSubmitBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    modalSubmitText: {
        color: '#000',
        fontWeight: 'bold',
    },
    couponStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 15,
    },
    couponStatBox: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 12,
        borderRadius: 12,
    },
    couponStatLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    couponStatValue: {
        fontSize: 13,
        fontWeight: 'bold',
    }
});
