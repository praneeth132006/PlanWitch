import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Platform,
    Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import GOOGLE_MAPS_CONFIG, { MAP_DEFAULTS, DAWN_MAP_STYLE, DUSK_MAP_STYLE } from '../config/googleMaps';

/**
 * PlacesAutocomplete Component
 * Google Places Autocomplete for destination search (Web only)
 * Integrated with an interactive Google Map
 */
const PlacesAutocomplete = ({
    value,
    onPlaceSelect,
    placeholder = 'Search destination...',
    style,
    showMap = false,
    clearOnSelect = false,
}) => {
    const { colors, isDark } = useTheme();
    const [query, setQuery] = useState(value || '');
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const autocompleteService = useRef(null);
    const placesService = useRef(null);
    const geocoder = useRef(null);
    const mapInstance = useRef(null);
    const markerInstance = useRef(null);
    const debounceTimer = useRef(null);
    const mapRef = useRef(null);

    // Load Google Maps script dynamically and initialize services
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_CONFIG.apiKey;

        const loadGoogleMapsScript = () => {
            return new Promise((resolve, reject) => {
                if (window.google && window.google.maps && window.google.maps.places) {
                    resolve();
                    return;
                }

                const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
                if (existingScript) {
                    existingScript.addEventListener('load', resolve);
                    return;
                }

                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    // console.log('Google Maps script loaded');
                    resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        };

        const initGoogleServices = () => {
            if (window.google && window.google.maps && window.google.maps.places) {
                autocompleteService.current = new window.google.maps.places.AutocompleteService();
                const dummyDiv = document.createElement('div');
                placesService.current = new window.google.maps.places.PlacesService(dummyDiv);
                geocoder.current = new window.google.maps.Geocoder();

                // Initialize Map if ref is ready
                if (mapRef.current && !mapInstance.current) {
                    mapInstance.current = new window.google.maps.Map(mapRef.current, {
                        ...MAP_DEFAULTS,
                        disableDefaultUI: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        streetViewControl: false,
                        styles: isDark ? DUSK_MAP_STYLE : DAWN_MAP_STYLE,
                    });

                    // Add click listener to map
                    mapInstance.current.addListener('click', (e) => {
                        handleMapClick(e.latLng);
                    });
                }

                // console.log('Google Services initialized successfully');
                return true;
            }
            return false;
        };

        let checkInterval;
        let checkTimeout;

        loadGoogleMapsScript()
            .then(() => {
                checkInterval = setInterval(() => {
                    if (initGoogleServices()) {
                        clearInterval(checkInterval);
                    }
                }, 100);
                checkTimeout = setTimeout(() => clearInterval(checkInterval), 5000);
            })
            .catch((error) => {
                console.error('Failed to load Google Maps script:', error);
            });

        return () => {
            if (checkInterval) clearInterval(checkInterval);
            if (checkTimeout) clearTimeout(checkTimeout);
        };
    }, []);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    const handleMapClick = (latLng) => {
        if (!geocoder.current) return;

        // Add marker immediately
        updateMapMarker(latLng);

        // Geocode to get address
        geocoder.current.geocode({ location: latLng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const place = results[0];
                const address = place.formatted_address;

                // Extract city name roughly if possible, or use address
                let mainText = address;

                // Call onPlaceSelect with geocoded result
                const selectedPlace = {
                    name: mainText,
                    fullAddress: address,
                    placeId: place.place_id,
                    latitude: latLng.lat(),
                    longitude: latLng.lng(),
                };

                setQuery(address);
                onPlaceSelect(selectedPlace);
            } else {
                // console.error('Geocoder failed due to: ' + status);
            }
        });
    };

    const updateMapMarker = (location) => {
        if (!mapInstance.current) return;

        if (markerInstance.current) {
            markerInstance.current.setMap(null);
        }

        markerInstance.current = new window.google.maps.Marker({
            position: location,
            map: mapInstance.current,
            animation: window.google.maps.Animation.DROP,
        });

        mapInstance.current.panTo(location);
        mapInstance.current.setZoom(12);
    };

    const searchPlaces = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 2) {
            setPredictions([]);
            setShowDropdown(false);
            return;
        }

        if (Platform.OS !== 'web') {
            setIsLoading(true);
            try {
                const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchQuery)}&key=${GOOGLE_MAPS_CONFIG.apiKey}&types=(cities)`;
                const response = await fetch(url, {
                    headers: {
                        'X-Ios-Bundle-Identifier': 'com.planwitch.app',
                        'X-Android-Package': 'com.planwitch.app',
                    }
                });
                const data = await response.json();
                setIsLoading(false);

                if (data.status === 'OK' && data.predictions) {
                    setPredictions(data.predictions.slice(0, 5));
                    setShowDropdown(true);
                } else if (data.status === 'REQUEST_DENIED') {
                    console.error('Places API Request Denied:', data.error_message);
                    Alert.alert('Places API Error', `Request Denied: ${data.error_message}\n\nPlease check if "Places API" is enabled in Google Cloud Console for this key.`);
                } else if (data.status === 'ZERO_RESULTS') {
                    setPredictions([]);
                } else if (data.status === 'OVER_QUERY_LIMIT') {
                    Alert.alert('API Limit', 'Google Maps API quota exceeded.');
                } else {
                    console.log('Places API Status:', data.status);
                    setPredictions([]);
                }
            } catch (error) {
                console.error('Places Search Fetch Error:', error);
                Alert.alert('Network Error', 'Failed to reach Google Places API. Ensure your API key is correct and "Places API" is enabled.');
                setIsLoading(false);
                setPredictions([]);
            }
            return;
        }

        if (!autocompleteService.current) {
            // console.log('Google Places not available');
            return;
        }

        setIsLoading(true);

        try {
            autocompleteService.current.getPlacePredictions(
                {
                    input: searchQuery,
                    types: ['(cities)'],
                },
                (results, status) => {
                    setIsLoading(false);
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                        setPredictions(results.slice(0, 5));
                        setShowDropdown(true);
                    } else {
                        // console.error('Places API Error Status:', status);
                        setPredictions([]);
                    }
                }
            );
        } catch (error) {
            // console.error('Places search error:', error);
            setIsLoading(false);
            setPredictions([]);
        }
    };

    const handleInputChange = (text) => {
        setQuery(text);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            searchPlaces(text);
        }, 300);
    };

    const handleSelectPlace = (prediction) => {
        if (!clearOnSelect) {
            setQuery(prediction.description);
        }
        setShowDropdown(false);
        setPredictions([]);

        if (Platform.OS !== 'web') {
            setIsLoading(true);
            fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_MAPS_CONFIG.apiKey}&fields=geometry,formatted_address,name,photos`,
                {
                    headers: {
                        'X-Ios-Bundle-Identifier': 'com.planwitch.app',
                        'X-Android-Package': 'com.planwitch.app',
                    }
                }
            )
                .then(res => res.json())
                .then(data => {
                    setIsLoading(false);
                    if (data.status === 'OK' && data.result) {
                        const place = data.result;
                        const location = place.geometry.location;

                        onPlaceSelect({
                            name: prediction.structured_formatting?.main_text || place.name,
                            fullAddress: prediction.description,
                            placeId: prediction.place_id,
                            latitude: location.lat,
                            longitude: location.lng,
                        });
                    } else {
                        onPlaceSelect({
                            name: prediction.structured_formatting?.main_text || prediction.description,
                            fullAddress: prediction.description,
                            placeId: prediction.place_id,
                        });
                    }
                })
                .catch(() => {
                    setIsLoading(false);
                    onPlaceSelect({
                        name: prediction.structured_formatting?.main_text || prediction.description,
                        fullAddress: prediction.description,
                        placeId: prediction.place_id,
                    });
                });

            if (clearOnSelect) {
                setQuery('');
            }
            return;
        }

        if (placesService.current) {
            placesService.current.getDetails(
                {
                    placeId: prediction.place_id,
                    fields: ['geometry', 'formatted_address', 'name', 'photos'],
                },
                (place, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                        const location = place.geometry.location;

                        updateMapMarker(location);

                        onPlaceSelect({
                            name: prediction.structured_formatting?.main_text || place.name,
                            fullAddress: prediction.description,
                            placeId: prediction.place_id,
                            latitude: location.lat(),
                            longitude: location.lng(),
                        });
                    } else {
                        onPlaceSelect({
                            name: prediction.structured_formatting?.main_text || prediction.description,
                            fullAddress: prediction.description,
                            placeId: prediction.place_id,
                        });
                    }
                }
            );
        } else {
            onPlaceSelect({
                name: prediction.structured_formatting?.main_text || prediction.description,
                fullAddress: prediction.description,
                placeId: prediction.place_id,
            });
        }

        if (clearOnSelect) {
            setQuery('');
        }
    };

    const styles = createStyles(colors);

    return (
        <View style={[styles.container, style]}>
            <View style={styles.inputContainer}>
                <View style={styles.iconContainer}>
                    <Icon name="location" size={20} color={colors.primary} />
                </View>
                <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={handleInputChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                />
                {isLoading && (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
                )}
                {query.length > 0 && !isLoading && (
                    <TouchableOpacity
                        onPress={() => {
                            setQuery('');
                            setPredictions([]);
                            setShowDropdown(false);
                            onPlaceSelect(null);
                        }}
                        style={styles.clearButton}
                    >
                        <Icon name="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {showDropdown && predictions.length > 0 && (
                <View style={styles.dropdown}>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        style={styles.dropdownScroll}
                    >
                        {predictions.map((prediction, index) => (
                            <TouchableOpacity
                                key={prediction.place_id}
                                style={[
                                    styles.predictionItem,
                                    index === predictions.length - 1 && styles.lastItem,
                                ]}
                                onPress={() => handleSelectPlace(prediction)}
                            >
                                <Icon name="location" size={16} color={colors.textMuted} style={styles.predictionIcon} />
                                <View style={styles.predictionText}>
                                    <Text style={styles.predictionMain} numberOfLines={1}>
                                        {prediction.structured_formatting?.main_text || prediction.description}
                                    </Text>
                                    <Text style={styles.predictionSecondary} numberOfLines={1}>
                                        {prediction.structured_formatting?.secondary_text || ''}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View style={styles.poweredBy}>
                        <Text style={styles.poweredByText}>Powered by Google</Text>
                    </View>
                </View>
            )}

            {/* Google Map Container - Only visible on web and if showMap is true */}
            {Platform.OS === 'web' && showMap && (
                <View style={styles.mapContainer}>
                    <div
                        ref={mapRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '14px'
                        }}
                    />
                </View>
            )}
        </View>
    );
};

const createStyles = (colors) =>
    StyleSheet.create({
        container: {
            position: 'relative',
            zIndex: 1000,
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.primaryBorder,
            padding: 2, // More compact
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
            marginBottom: 16, // Add margin for spacing above map
        },
        iconContainer: {
            width: 32, // Smaller
            height: 32, // Smaller
            borderRadius: 10,
            backgroundColor: colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            margin: 4,
        },
        input: {
            flex: 1,
            fontSize: 14, // Smaller font
            color: colors.text,
            paddingVertical: 10, // More compact
            paddingHorizontal: 8,
            outlineStyle: 'none',
        },
        loader: {
            marginRight: 12,
        },
        clearButton: {
            padding: 12,
        },
        dropdown: {
            position: 'absolute',
            top: '100%',
            marginTop: 4,
            left: 0,
            right: 0,
            zIndex: 9999, // Ensure it sits on top of everything
            backgroundColor: colors.card, // Ensure solid background
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.primaryBorder,
            // Stronger shadow for depth
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 10,
            elevation: 10,
            maxHeight: 250,
            overflow: 'hidden',
        },
        dropdownScroll: {
            maxHeight: 200,
        },
        predictionItem: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.primaryBorder,
        },
        lastItem: {
            borderBottomWidth: 0,
        },
        predictionIcon: {
            marginRight: 12,
        },
        predictionText: {
            flex: 1,
        },
        predictionMain: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.text,
        },
        predictionSecondary: {
            fontSize: 13,
            color: colors.textMuted,
            marginTop: 2,
        },
        poweredBy: {
            padding: 8,
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: colors.primaryBorder,
            backgroundColor: colors.cardLight,
        },
        poweredByText: {
            fontSize: 11,
            color: colors.textMuted,
        },
        mapContainer: {
            height: 300,
            borderRadius: 14,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.primaryBorder,
            marginTop: 8,
        },
    });

export default PlacesAutocomplete;
