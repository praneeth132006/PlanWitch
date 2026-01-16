// Helper to map AI response to Itinerary Items

const ACTIVITY_TYPE_MAPPING = {
    'hotel': 'checkin', // or hotel
    'accommodation': 'checkin',
    'check-in': 'checkin',
    'check-out': 'checkout',
    'flight': 'flight',
    'airport': 'flight',
    'train': 'train',
    'station': 'train',
    'bus': 'bus',
    'car': 'car',
    'taxi': 'car',
    'drive': 'car',
    'lunch': 'lunch',
    'dinner': 'dinner',
    'breakfast': 'breakfast',
    'cafe': 'cafe',
    'coffee': 'cafe',
    'snack': 'cafe',
    'museum': 'museum',
    'gallery': 'museum',
    'park': 'nature',
    'beach': 'beach',
    'hiking': 'nature',
    'shop': 'shopping',
    'mall': 'shopping',
    'market': 'shopping',
    'club': 'nightlife',
    'bar': 'nightlife',
    'pub': 'nightlife',
    'tour': 'tour',
    'attraction': 'attraction',
    'sightseeing': 'attraction'
};

export const mapAIResponseToItinerary = (aiResult, startDate) => {
    if (!aiResult || !aiResult.itinerary) return [];

    let allItems = [];
    const start = startDate ? new Date(startDate) : new Date();

    aiResult.itinerary.forEach((dayPlan) => {
        const dayNumber = dayPlan.day;

        // Calculate date for this day if startDate is provided
        // Not strictly needed if we rely on dayNumber, but good for "date" field if used
        const currentDayDate = new Date(start);
        currentDayDate.setDate(start.getDate() + (dayNumber - 1));

        if (dayPlan.activities && Array.isArray(dayPlan.activities)) {
            dayPlan.activities.forEach((activity, index) => {
                // Heuristic to determine type
                let type = 'attraction'; // Default
                const lowerTitle = activity.title.toLowerCase();
                const lowerDesc = (activity.description || '').toLowerCase();

                // Check mappings
                for (const [key, value] of Object.entries(ACTIVITY_TYPE_MAPPING)) {
                    if (lowerTitle.includes(key) || lowerDesc.includes(key)) {
                        type = value;
                        break;
                    }
                }

                allItems.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5) + index,
                    dayNumber: dayNumber,
                    name: activity.title,
                    notes: activity.description,
                    time: activity.time, // AI usually gives "10:00 AM", app expects string, so this works
                    cost: activity.cost ? activity.cost.replace(/[^0-9.]/g, '') : '', // strip non-numeric if possible, or keep text
                    location: '', // AI might not give address, detailed prompt needed or Place API lookup
                    type: type,
                    duration: '1-2h', // Default estimate
                    isAiGenerated: true
                });
            });
        }
    });

    return allItems;
};
