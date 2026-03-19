import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export const CalendarService = {
  /**
   * Request calendar permissions
   */
  requestPermissions: async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Find or create the dedicated PlanWitch calendar
   */
  getPlanWitchCalendar: async () => {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existing = calendars.find(c => c.title === 'PlanWitch');
    
    if (existing) return existing.id;

    // Create a new calendar if not found
    const defaultCalendarSource = 
      Platform.OS === 'ios'
        ? await Calendar.getDefaultCalendarSourceAsync()
        : { name: 'PlanWitch', type: 'LOCAL' };

    return await Calendar.createCalendarAsync({
      title: 'PlanWitch',
      color: '#8B5CF6', // Primary color
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendarSource.id,
      source: defaultCalendarSource,
      name: 'PlanWitchInternal',
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  },

  /**
   * Sync a trip and its itinerary to the calendar
   */
  syncTripToCalendar: async (tripInfo, itinerary = []) => {
    if (Platform.OS === 'web') {
      throw new Error('Calendar sync is only available on iOS and Android devices. It is not supported on Web.');
    }
    const hasPermission = await CalendarService.requestPermissions();
    if (!hasPermission) throw new Error('Calendar permission not granted');

    const calendarId = await CalendarService.getPlanWitchCalendar();

    // 1. Add the main trip event (start date to end date)
    if (tripInfo.startDate && tripInfo.endDate) {
      await Calendar.createEventAsync(calendarId, {
        title: `Trip to ${tripInfo.destination || 'Destination'} ✈️`,
        startDate: new Date(tripInfo.startDate),
        endDate: new Date(tripInfo.endDate),
        notes: tripInfo.aiDescription || 'Planned with PlanWitch',
        location: tripInfo.destination,
      });
    }

    // 2. Add individual itinerary items as events if they have times
    for (const item of itinerary) {
      if (item.startTime && item.date) {
        const itemDate = new Date(item.date);
        
        // Parse time (e.g., "10:30 AM")
        const [time, period] = item.startTime.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        const start = new Date(itemDate);
        start.setHours(hours, minutes, 0);

        const end = new Date(start);
        end.setHours(start.getHours() + 2); // Default 2-hour duration for activities

        await Calendar.createEventAsync(calendarId, {
          title: `${item.title || item.name || 'Activity'}`,
          startDate: start,
          endDate: end,
          notes: item.description || 'Activity in your trip',
          location: item.location || tripInfo.destination,
        });
      }
    }

    return true;
  }
};
