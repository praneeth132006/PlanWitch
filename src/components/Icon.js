import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

// Icon paths mapping - VERIFIED PNG FILENAMES
const ICON_PATHS = {
    // Navigation/General
    logo: require('../../assets/icons/mycollection/png/routemate_logo.png'), // NEW LOGO
    home: require('../../assets/icons/mycollection/png/001-travel.png'),
    budget: require('../../assets/icons/mycollection/png/062-budget.png'),
    expenses: require('../../assets/icons/mycollection/png/060-expenses.png'),
    packing: require('../../assets/icons/mycollection/png/206-packing.png'),
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
    location: require('../../assets/icons/mycollection/png/081-location.png'),
    flight_takeoff: require('../../assets/icons/mycollection/png/188-airplane.png'),
    flight_land: require('../../assets/icons/mycollection/png/188-airplane.png'),
    map: require('../../assets/icons/mycollection/png/121-map.png'),
    task: require('../../assets/icons/mycollection/png/107-schedule.png'),
    check: require('../../assets/icons/mycollection/png/049-link.png'),
    like: require('../../assets/icons/mycollection/png/020-stars.png'),
    heart: require('../../assets/icons/mycollection/png/020-stars.png'),
    message: require('../../assets/icons/mycollection/png/036-email.png'),

    // Trip Types
    solo: require('../../assets/icons/mycollection/png/185-traveller.png'), // User explicitly requested change from gear
    friends: require('../../assets/icons/mycollection/png/032-group.png'), // Friend group
    family: require('../../assets/icons/mycollection/png/007-family.png'),
    couple: require('../../assets/icons/mycollection/png/couple.png'),
    business: require('../../assets/icons/mycollection/png/065-financial.png'), // More specific business icon

    // Itinerary/Transport
    flight: require('../../assets/icons/mycollection/png/188-airplane.png'),
    airplane: require('../../assets/icons/mycollection/png/188-airplane.png'),
    train: require('../../assets/icons/mycollection/png/180-train.png'),
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

    // Fallbacks
    other: require('../../assets/icons/mycollection/png/012-leaning-tower-of-pisa.png'),
    user: require('../../assets/icons/mycollection/png/057-user.png'),
    group: require('../../assets/icons/mycollection/png/048-boy.png'),
    money: require('../../assets/icons/mycollection/png/061-dollar.png'),

    // Welcome Screen Animation Icons
    v012: require('../../assets/icons/mycollection/png/012-leaning-tower-of-pisa.png'),
    v182: require('../../assets/icons/mycollection/png/182-burj-arab.png'),
    v183: require('../../assets/icons/mycollection/png/183-statue-of-liberty.png'),
    v184: require('../../assets/icons/mycollection/png/184-paris.png'),
    v187: require('../../assets/icons/mycollection/png/187-taj-mahal.png'),
    v189: require('../../assets/icons/mycollection/png/189-washington.png'),
    v190: require('../../assets/icons/mycollection/png/190-romanian-athenaeum.png'),
    tour_guide: require('../../assets/icons/mycollection/png/tour-guide.png'),
};

/**
 * Icon Component - Renders PNG icons
 */
const Icon = ({ name, size = 24, color, style }) => {
    // Default to 'other' if key not found
    const iconSource = ICON_PATHS[name] || ICON_PATHS.other;

    return (
        <Image
            source={iconSource}
            style={[
                { width: size, height: size },
                // Disable tint for new PNGs to show full color
                // color && { tintColor: color }, 
                // name === 'close' && { transform: [{ rotate: '45deg' }] }, // Disable rotation
                style
            ]}
            resizeMode="contain"
        />
    );
};

export default Icon;

export const IconNames = Object.keys(ICON_PATHS);
