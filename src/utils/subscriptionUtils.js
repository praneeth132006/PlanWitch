export const checkFeatureAccess = (feature, userPlan, currentCount = 0, activeTripsCount = 0, CONSTANTS) => {
    if (userPlan === 'pro') return { allowed: true };

    switch (feature) {
        case 'ai_planning':
            return { allowed: false, reason: 'AI Planning is a Pro feature.' };
        case 'new_trip':
            if (activeTripsCount >= CONSTANTS.FREE_TRIP_LIMIT) {
                return { allowed: false, reason: `Free limit reached (${CONSTANTS.FREE_TRIP_LIMIT} active trips). Upgrade to create more.` };
            }
            return { allowed: true };
        case 'add_traveler':
            if (currentCount >= CONSTANTS.FREE_TRAVELER_LIMIT) {
                return { allowed: false, reason: `Free limit reached (${CONSTANTS.FREE_TRAVELER_LIMIT} travelers). Upgrade to add more.` };
            }
            return { allowed: true };
        default:
            return { allowed: true };
    }
};
