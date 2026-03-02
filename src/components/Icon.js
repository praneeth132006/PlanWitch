import React from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';

// Icon paths mapping - VERIFIED PNG FILENAMES
const ICON_PATHS = {
    // Navigation/General
    logo: require('../../assets/icons/mycollection/png/app icon no bg.png'), // UPDATED LOGO
    app_icon: require('../../assets/icons/mycollection/png/app_icon.png'), // ADDED APP ICON
    app_icon_no_bg: require('../../assets/icons/mycollection/png/app icon no bg.png'), // NO BACKGROUND VERSION
    home: require('../../assets/icons/mycollection/png/001-travel.png'),
    budget: require('../../assets/icons/mycollection/png/062-budget.png'),
    expenses: require('../../assets/icons/mycollection/png/060-expenses.png'),
    packing: require('../../assets/icons/mycollection/png/181-travel-bag-3.png'), // Updated as requested
    travel_bag: require('../../assets/icons/mycollection/png/181-travel-bag-3.png'), // Added alias
    itinerary: require('../../assets/icons/mycollection/png/102-calendar.png'),
    calendar: require('../../assets/icons/mycollection/png/102-calendar.png'),
    profile: require('../../assets/icons/mycollection/png/056-profile-avatar.png'),
    settings: require('../../assets/icons/mycollection/png/042-gear.png'),

    // Actions
    add: require('../../assets/icons/mycollection/png/105-add-event.png'),
    close: require('../../assets/icons/mycollection/png/047-cross.png'), // Explicit X/Exit
    x: require('../../assets/icons/mycollection/png/047-cross.png'), // Alias for close
    check: require('../../assets/icons/mycollection/png/051-check.png'),
    delete: require('../../assets/icons/mycollection/png/106-deleted.png'),
    done: require('../../assets/icons/mycollection/png/051-check.png'),
    finish: require('../../assets/icons/mycollection/png/051-check.png'),
    link: require('../../assets/icons/mycollection/png/049-link.png'), // Better link icon
    edit: require('../../assets/icons/mycollection/png/104-edit.png'),
    back: require('../../assets/icons/mycollection/png/217-arrow-left.png'),
    arrow_left: require('../../assets/icons/mycollection/png/217-arrow-left.png'),
    search: require('../../assets/icons/mycollection/png/155-binoculars.png'),
    quick: require('../../assets/icons/mycollection/png/route.png'),
    lock: require('../../assets/icons/mycollection/png/115-password.png'),
    logout: require('../../assets/icons/mycollection/png/118-logout.png'),
    notification: require('../../assets/icons/mycollection/png/041-notification-alert.png'),
    calendar: require('../../assets/icons/mycollection/png/102-calendar.png'),
    clock: require('../../assets/icons/mycollection/png/148-hourglass.png'),
    hourglass: require('../../assets/icons/mycollection/png/148-hourglass.png'), // Added alias
    location: require('../../assets/icons/mycollection/png/081-location.png'),
    compass: require('../../assets/icons/mycollection/png/086-compass-5.png'), // Added compass
    flight_takeoff: require('../../assets/icons/mycollection/png/188-airplane.png'),
    flight_land: require('../../assets/icons/mycollection/png/188-airplane.png'),
    map: require('../../assets/icons/mycollection/png/121-map.png'),
    task: require('../../assets/icons/mycollection/png/107-schedule.png'),
    check: require('../../assets/icons/mycollection/png/051-check.png'),
    flag: 'emoji_🏁', // REMOVED PISA ICON
    checkered_flag: 'emoji_🏁',
    like: require('../../assets/icons/mycollection/png/020-stars.png'),
    heart: require('../../assets/icons/mycollection/png/020-stars.png'),
    star: require('../../assets/icons/mycollection/png/020-stars.png'), // Added alias
    sparkles: require('../../assets/icons/mycollection/png/020-stars.png'), // Added alias
    message: require('../../assets/icons/mycollection/png/036-email.png'),
    'arrow-back': require('../../assets/icons/mycollection/png/217-arrow-left.png'), // Added alias
    crown: require('../../assets/icons/mycollection/png/020-stars.png'), // Using stars/sparkles as crown placeholder for now

    // Trip Types
    solo: require('../../assets/icons/mycollection/png/185-traveller.png'),
    friends: require('../../assets/icons/mycollection/png/032-group.png'),
    family: require('../../assets/icons/mycollection/png/191-family.png'),
    couple: require('../../assets/icons/mycollection/png/couple.png'),
    business: require('../../assets/icons/mycollection/png/065-financial.png'),

    // Itinerary/Transport
    flight: require('../../assets/icons/mycollection/png/188-airplane.png'),
    airplane: require('../../assets/icons/mycollection/png/188-airplane.png'),
    train: require('../../assets/icons/mycollection/png/180-train.png'),
    pen: require('../../assets/icons/mycollection/png/pen.png'),
    bus: require('../../assets/icons/mycollection/png/173-bus.png'),
    car: require('../../assets/icons/mycollection/png/009-road-trip.png'),
    taxi: require('../../assets/icons/mycollection/png/168-motorcycle.png'),
    ship: require('../../assets/icons/mycollection/png/120-ship.png'),
    truck: require('../../assets/icons/mycollection/png/158-jeep.png'),
    bike: require('../../assets/icons/mycollection/png/172-bicycle-1.png'),

    // Categories
    hotel: require('../../assets/icons/mycollection/png/030-hotel.png'),
    food: require('../../assets/icons/mycollection/png/202-food.png'),
    activities: require('../../assets/icons/mycollection/png/150-climbing.png'), // Mountain climbing requested
    shopping: require('../../assets/icons/mycollection/png/002-travel-bag.png'),
    health: require('../../assets/icons/mycollection/png/125-healthy-food.png'),
    hospital: require('../../assets/icons/mycollection/png/142-hotel-2.png'),
    mobile: require('../../assets/icons/mycollection/png/208-webcam.png'),
    ticket: require('../../assets/icons/mycollection/png/214-plane-ticket.png'),
    passport: require('../../assets/icons/mycollection/png/034-passport.png'),
    camera: require('../../assets/icons/mycollection/png/036-camera.png'),
    nature: require('../../assets/icons/mycollection/png/021-hiking.png'),
    beach: require('../../assets/icons/mycollection/png/179-beach-chair.png'),
    museum: require('../../assets/icons/mycollection/png/186-temple.png'),
    nightlife: require('../../assets/icons/mycollection/png/020-stars.png'),
    coffee: require('../../assets/icons/mycollection/png/135-hot-drink.png'),
    music: require('../../assets/icons/mycollection/png/028-creativity.png'),
    bulb: require('../../assets/icons/mycollection/png/028-creativity.png'),
    stay: require('../../assets/icons/mycollection/png/030-hotel.png'),
    checkin: require('../../assets/icons/mycollection/png/137-check-in.png'), // Specific Check-in
    checkout: require('../../assets/icons/mycollection/png/140-check-out.png'), // Specific Check-out
    breakfast: require('../../assets/icons/mycollection/png/135-hot-drink.png'), // Coffee/Breakfast
    lunch: require('../../assets/icons/mycollection/png/133-hot-dog.png'), // Specific meal
    dinner: require('../../assets/icons/mycollection/png/127-pizza.png'), // Pizza/Dinner
    cafe: require('../../assets/icons/mycollection/png/135-hot-drink.png'),
    attraction: require('../../assets/icons/mycollection/png/014-tourism.png'),
    accommodation: require('../../assets/icons/mycollection/png/030-hotel.png'),
    transport: require('../../assets/icons/mycollection/png/009-road-trip.png'),

    // Avatars
    man1: require('../../assets/icons/mycollection/png/037-man.png'),
    woman1: require('../../assets/icons/mycollection/png/038-woman.png'),
    man2: require('../../assets/icons/mycollection/png/041-man-1.png'),
    woman2: require('../../assets/icons/mycollection/png/042-woman-1.png'),
    man3: require('../../assets/icons/mycollection/png/043-man-2.png'),
    woman3: require('../../assets/icons/mycollection/png/044-woman-2.png'),
    boy: require('../../assets/icons/mycollection/png/048-boy.png'),
    girl: require('../../assets/icons/mycollection/png/049-girl.png'),
    profile_avatar: require('../../assets/icons/mycollection/png/054-man-7.png'),
    man7: require('../../assets/icons/mycollection/png/054-man-7.png'),
    v054: require('../../assets/icons/mycollection/png/054-man-7.png'),
    v185: require('../../assets/icons/mycollection/png/185-traveller.png'),
    user_circle: require('../../assets/icons/mycollection/png/057-user.png'),
    helping_hand: require('../../assets/icons/mycollection/png/043-helping-hand.png'),
    route: require('../../assets/icons/mycollection/png/route.png'),
    email: require('../../assets/icons/mycollection/png/email.png'),
    password: require('../../assets/icons/mycollection/png/password.png'),
    bathtub: require('../../assets/icons/mycollection/png/bathtub.png'),
    card: require('../../assets/icons/mycollection/png/035-credit-card.png'),

    // New Avatars
    boy_1: require('../../assets/icons/mycollection/png/010-boy-1.png'),
    girl_1: require('../../assets/icons/mycollection/png/011-girl-1.png'),
    boy_2: require('../../assets/icons/mycollection/png/015-boy-2.png'),
    girl_2: require('../../assets/icons/mycollection/png/014-girl-2.png'),
    man_1: require('../../assets/icons/mycollection/png/019-man-1.png'),
    woman_1: require('../../assets/icons/mycollection/png/038-woman.png'),
    man_2: require('../../assets/icons/mycollection/png/043-man-2.png'),
    woman_2: require('../../assets/icons/mycollection/png/044-woman-2.png'),

    // System/UI
    sort: require('../../assets/icons/mycollection/png/102-calendar.png'),
    eye: require('../../assets/icons/mycollection/png/155-binoculars.png'),
    eye_off: require('../../assets/icons/mycollection/png/155-binoculars.png'),
    eye_hide: require('../../assets/icons/mycollection/png/155-binoculars.png'),

    // Fallbacks
    other: null,
    user: require('../../assets/icons/mycollection/png/057-user.png'),
    group: require('../../assets/icons/mycollection/png/048-boy.png'),
    money: require('../../assets/icons/mycollection/png/061-dollar.png'),
    flag: 'emoji_🏁',
    finish: 'emoji_🏁',
};

/**
 * Icon Component - Renders PNG icons or Emojis
 */
const Icon = ({ name, size = 24, color, style }) => {
    // Check if it's an emoji-based icon
    const iconPath = ICON_PATHS[name] || name;

    if (typeof iconPath === 'string' && iconPath.startsWith('emoji_')) {
        const emoji = iconPath.replace('emoji_', '');
        return (
            <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
                <Text style={{ fontSize: size * 0.8 }}>{emoji}</Text>
            </View>
        );
    }

    // Resolve source
    const iconSource = ICON_PATHS[name];

    // If no icon found, don't render anything or render a small placeholder
    if (!iconSource) {
        return <View style={{ width: size, height: size }} />;
    }

    return (
        <Image
            source={iconSource}
            style={[
                { width: size, height: size },
                style
            ]}
            resizeMode="contain"
        />
    );
};

export default Icon;

export const IconNames = Object.keys(ICON_PATHS);
