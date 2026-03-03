/**
 * Google AdSense Configuration for Web
 * 
 * INSTRUCTIONS:
 * 1. Sign up at https://adsense.google.com
 * 2. Replace YOUR_PUBLISHER_ID with your ca-pub-XXXXXXXXXX ID
 * 3. Create ad units in AdSense dashboard and paste their slot IDs below
 */

// Replace with your actual AdSense publisher ID (format: ca-pub-XXXXXXXXXX)
export const ADSENSE_PUBLISHER_ID = 'ca-pub-YOUR_PUBLISHER_ID';

// Replace with your actual ad slot IDs from AdSense dashboard
export const AD_SLOTS = {
    BANNER_HOME: 'YOUR_SLOT_ID',      // Display ad - Home screen
    BANNER_TRIP: 'YOUR_SLOT_ID',      // Display ad - Trip details
    IN_FEED: 'YOUR_SLOT_ID',          // In-feed ad - Between list items
};

// Ad formats
export const AD_FORMATS = {
    AUTO: 'auto',                     // Responsive - recommended
    HORIZONTAL: 'horizontal',         // Fixed horizontal banner
    RECTANGLE: 'rectangle',           // Medium rectangle (300x250)
    FLUID: 'fluid',                   // In-feed native style
};
