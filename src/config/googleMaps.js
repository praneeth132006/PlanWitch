// Google Maps Configuration
// This file contains the Google Maps API key and configuration

const GOOGLE_MAPS_CONFIG = {
    apiKey: 'AIzaSyANRzgIniwwjDbW31gDIJ38iGpKdLng0yk',
    libraries: ['places', 'geometry'],
    region: 'IN',
    language: 'en',
};

// Map default settings with standard light styling
export const MAP_DEFAULTS = {
    center: { lat: 20.5937, lng: 78.9629 }, // Center of India
    zoom: 5,
    styles: [], // Empty for standard light map
};

export default GOOGLE_MAPS_CONFIG;
