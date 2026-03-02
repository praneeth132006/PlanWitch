import {
    database,
    ref,
    push,
    set,
    serverTimestamp,
    query,
    orderByChild,
    limitToLast,
    onValue,
    off,
    get
} from '../config/firebase';

/**
 * Log levels for systematic categorization
 */
export const LogLevel = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    SECURITY: 'SECURITY'
};

/**
 * Event types for grouping logs
 */
export const LogType = {
    AUTH: 'AUTH',
    COUPON: 'COUPON',
    TRIP: 'TRIP',
    SYSTEM: 'SYSTEM',
    SECURITY: 'SECURITY'
};

/**
 * Log a system event
 * @param {Object} logData - { type, level, message, userId, email, metadata }
 */
export const logEvent = async ({ type, level = LogLevel.INFO, message, userId = 'system', email = 'system', metadata = {} }) => {
    try {
        const logsRef = ref(database, 'systemLogs');
        const newLogRef = push(logsRef);

        await set(newLogRef, {
            type,
            level,
            message,
            userId,
            email,
            metadata,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error('Failed to log event:', error);
    }
};

/**
 * Specialized security logger
 */
export const logSecurityEvent = (message, userId, email, metadata = {}) => {
    return logEvent({
        type: LogType.SECURITY,
        level: LogLevel.SECURITY,
        message,
        userId,
        email,
        metadata
    });
};

/**
 * Subscribe to recent system logs
 * @param {function} callback - Called with log array
 * @param {number} limit - Number of logs to fetch
 */
export const subscribeToLogs = (callback, limit = 50) => {
    const logsRef = ref(database, 'systemLogs');
    const logsQuery = query(logsRef, orderByChild('timestamp'), limitToLast(limit));

    const unsubscribe = onValue(logsQuery, (snapshot) => {
        const logs = [];
        snapshot.forEach((child) => {
            logs.unshift({ id: child.key, ...child.val() });
        });
        callback(logs);
    });

    return () => off(logsRef, 'value', unsubscribe);
};

/**
 * Fetch system statistics for the admin dashboard
 */
export const getSystemStats = async () => {
    try {
        // This is a simplified version. A real app might use cloud functions 
        // or a dedicated stats node to avoid fetching whole collections.
        const usersSnapshot = await get(ref(database, 'users'));
        const tripsSnapshot = await get(ref(database, 'sharedTrips'));
        const couponsSnapshot = await get(ref(database, 'coupons'));

        return {
            totalUsers: usersSnapshot.exists() ? Object.keys(usersSnapshot.val()).length : 0,
            totalTrips: tripsSnapshot.exists() ? Object.keys(tripsSnapshot.val()).length : 0,
            totalCoupons: couponsSnapshot.exists() ? Object.keys(couponsSnapshot.val()).length : 0,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Failed to fetch system stats:', error);
        return { totalUsers: 0, totalTrips: 0, totalCoupons: 0, timestamp: Date.now() };
    }
};
