import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import GOOGLE_MAPS_CONFIG, { MAP_DEFAULTS, DAWN_MAP_STYLE, DUSK_MAP_STYLE } from '../config/googleMaps';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from './MapLib';

/**
 * TripMap Component
 * Visualizes the trip Start, Visit, and End points on a read-only map.
 */
const TripMap = ({ start, origin, visit, end, destination, stops, mode, style, borderRadius = 0 }) => {
    const { colors, isDark } = useTheme();
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef([]);
    const bounds = useRef(null);
    const directionsService = useRef(null);
    const directionsRenderer = useRef(null);
    const geocoder = useRef(null);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        // Load Google Maps script dynamically
        const loadGoogleMapsScript = () => {
            return new Promise((resolve, reject) => {
                if (window.google && window.google.maps) {
                    resolve();
                    return;
                }

                const GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_CONFIG.apiKey;
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
                    // console.log('Google Maps script loaded in TripMap');
                    resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        };

        // Web Initialization with Retry
        const checkGoogleMaps = () => {
            if (window.google && window.google.maps) {
                if (mapRef.current && !mapInstance.current) {
                    mapInstance.current = new window.google.maps.Map(mapRef.current, {
                        ...MAP_DEFAULTS,
                        disableDefaultUI: true,
                        zoomControl: false,
                        gestureHandling: 'greedy',
                        keyboardShortcuts: false,
                        clickableIcons: false,
                        mapTypeId: 'roadmap',
                        styles: isDark ? DUSK_MAP_STYLE : DAWN_MAP_STYLE,
                        mapId: '330d727194d831d02de90356', // User provided Map ID
                    });

                    bounds.current = new window.google.maps.LatLngBounds();

                    directionsService.current = new window.google.maps.DirectionsService();
                    directionsRenderer.current = new window.google.maps.DirectionsRenderer({
                        map: mapInstance.current,
                        suppressMarkers: true,
                        preserveViewport: false,
                        polylineOptions: {
                            strokeColor: '#000000',
                            strokeWeight: 5,
                            strokeOpacity: 0.8,
                        }
                    });

                    updateMapContents();
                }
                return true;
            }
            return false;
        };

        loadGoogleMapsScript()
            .then(() => {
                if (!checkGoogleMaps()) {
                    const interval = setInterval(() => {
                        if (checkGoogleMaps()) {
                            clearInterval(interval);
                        }
                    }, 500);

                    // Stop checking after 10 seconds
                    setTimeout(() => clearInterval(interval), 10000);
                }
            })
            .catch(error => {
                console.error('Failed to load Google Maps script in TripMap:', error);
            });
    }, []);

    // Extract update logic to function so we can call it from init
    const updateMapContents = async () => {
        if (!mapInstance.current || !window.google) return;

        // Clear existing markers
        markers.current.forEach(m => m.setMap(null));
        markers.current = [];

        bounds.current = new window.google.maps.LatLngBounds();

        // Helper to resolve coordinates
        const resolveLocation = async (item) => {
            if (item.latitude && item.longitude) {
                return { lat: item.latitude, lng: item.longitude, name: item.name };
            }
            if (item.location || item.name) {
                const query = item.location || item.name;
                // Simple cache could be added here if needed
                return new Promise((resolve) => {
                    // Check if geocoder is initialized, if not initialize it
                    if (!geocoder.current) {
                        geocoder.current = new window.google.maps.Geocoder();
                    }
                    geocoder.current.geocode({ address: query }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            resolve({
                                lat: results[0].geometry.location.lat(),
                                lng: results[0].geometry.location.lng(),
                                name: item.name || query
                            });
                        } else {
                            // console.warn('Geocoding failed for:', query);
                            resolve(null);
                        }
                    });
                });
            }
            return null;
        };

        // 1. Collect all points in order with their logical label
        const allPoints = [];
        let labelCounter = 1;

        // Start
        const startPoint = origin || start;
        if (startPoint) {
            const resolved = await resolveLocation({ ...startPoint, name: startPoint.name || 'Start' });
            if (resolved) {
                allPoints.push({
                    type: 'start',
                    position: { lat: resolved.lat, lng: resolved.lng },
                    label: (labelCounter++).toString(),
                    name: resolved.name
                });
            }
        }

        // Stops
        if (stops && stops.length > 0) {
            // Process sequentially to maintain order labels
            for (let i = 0; i < stops.length; i++) {
                const stop = stops[i];
                const resolved = await resolveLocation({ ...stop, name: stop.name || `Stop ${i + 1}` });
                if (resolved) {
                    allPoints.push({
                        type: 'stop',
                        position: { lat: resolved.lat, lng: resolved.lng },
                        label: (labelCounter++).toString(),
                        name: resolved.name
                    });
                }
            }
        }

        // Visit (Legacy)
        if (visit && (!stops || stops.length === 0)) {
            const resolved = await resolveLocation({ ...visit, name: visit.name || 'Visit' });
            if (resolved) {
                allPoints.push({
                    type: 'visit',
                    position: { lat: resolved.lat, lng: resolved.lng },
                    label: (labelCounter++).toString(),
                    name: resolved.name
                });
            }
        }

        // End
        const endPoint = destination || end;
        if (endPoint) {
            const resolved = await resolveLocation({ ...endPoint, name: endPoint.name || 'End' });
            if (resolved) {
                allPoints.push({
                    type: 'end',
                    position: { lat: resolved.lat, lng: resolved.lng },
                    label: (labelCounter++).toString(),
                    name: resolved.name
                });
            }
        }

        if (allPoints.length === 0) return;

        // 2. Group collinear points for Markers
        // We use a simple string key of lat,lng to detect duplicates
        const uniqueParams = {}; // "lat,lng" -> { position, labels[], title }

        allPoints.forEach(p => {
            const key = `${p.position.lat},${p.position.lng}`;
            if (!uniqueParams[key]) {
                uniqueParams[key] = {
                    position: p.position,
                    labels: [p.label],
                    title: p.name
                };
            } else {
                uniqueParams[key].labels.push(p.label);
                // Append title if different? Usually keep first or append
                if (!uniqueParams[key].title.includes(p.name)) {
                    uniqueParams[key].title += ` & ${p.name}`;
                }
            }
            bounds.current.extend(p.position);
        });

        // 3. Create Markers from groups
        Object.values(uniqueParams).forEach(group => {
            markers.current.push(new window.google.maps.Marker({
                position: group.position,
                map: mapInstance.current,
                label: group.labels.join(', '), // "1, 3"
                title: group.title,
            }));
        });

        // 4. Calculate Route (Use ALL points in sequence)
        if (directionsService.current && directionsRenderer.current) {
            if (allPoints.length >= 2) {
                const routeOrigin = allPoints[0].position;
                const routeDestination = allPoints[allPoints.length - 1].position;

                // Waypoints are everything in between
                // Limit to 23 waypoints (Google limit is 25 total including origin and destination)
                let intermediatePoints = allPoints.slice(1, -1);
                if (intermediatePoints.length > 23) {
                    console.warn(`Too many waypoints (${intermediatePoints.length}). Sampling to 23 to avoid MAX_WAYPOINTS_EXCEEDED.`);
                    const sampled = [];
                    const step = intermediatePoints.length / 23;
                    for (let i = 0; i < 23; i++) {
                        sampled.push(intermediatePoints[Math.floor(i * step)]);
                    }
                    intermediatePoints = sampled;
                }

                const waypoints = intermediatePoints.map(p => ({ location: p.position, stopover: true }));

                directionsService.current.route({
                    origin: routeOrigin,
                    destination: routeDestination,
                    waypoints,
                    optimizeWaypoints: false,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                }, (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        directionsRenderer.current.setDirections(result);
                    } else {
                        console.warn('Directions request failed due to ' + status);
                        mapInstance.current.fitBounds(bounds.current);
                    }
                });
            } else {
                directionsRenderer.current.setDirections({ routes: [] });
                if (allPoints.length > 0) {
                    mapInstance.current.fitBounds(bounds.current);
                    if (bounds.current.getNorthEast().equals(bounds.current.getSouthWest())) {
                        mapInstance.current.setZoom(10);
                    }
                }
            }
        }
    };

    // Update markers and route when points change
    useEffect(() => {
        updateMapContents();
    }, [start, origin, visit, end, destination, stops]);

    const styles = createStyles(colors);

    // Native Rendering with react-native-maps
    if (Platform.OS !== 'web') {
        const nativePoints = [];
        const startPoint = origin || start;
        if (startPoint && typeof startPoint.latitude === 'number' && typeof startPoint.longitude === 'number' && !isNaN(startPoint.latitude)) {
            nativePoints.push({ ...startPoint, type: 'start' });
        }
        if (stops && stops.length > 0) {
            stops.forEach((s, i) => {
                if (s.latitude && s.longitude) {
                    nativePoints.push({ ...s, type: 'stop', index: i + 1 });
                }
            });
        }
        const endPoint = destination || end;
        if (endPoint && endPoint.latitude && endPoint.longitude) {
            nativePoints.push({ ...endPoint, type: 'end' });
        }

        const coordinates = nativePoints.map(p => ({
            latitude: parseFloat(p.latitude),
            longitude: parseFloat(p.longitude)
        }));

        return (
            <View style={[styles.container, style, { borderRadius, overflow: 'hidden' }]}>
                <MapView
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    style={StyleSheet.absoluteFill}
                    initialRegion={{
                        latitude: (coordinates.length > 0 && typeof coordinates[0].latitude === 'number' && !isNaN(coordinates[0].latitude)) ? coordinates[0].latitude : MAP_DEFAULTS.center.lat,
                        longitude: (coordinates.length > 0 && typeof coordinates[0].longitude === 'number' && !isNaN(coordinates[0].longitude)) ? coordinates[0].longitude : MAP_DEFAULTS.center.lng,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    }}
                    customMapStyle={isDark ? DUSK_MAP_STYLE : DAWN_MAP_STYLE}
                >
                    {nativePoints.map((p, i) => (
                        <Marker
                            key={`${p.placeId || i}`}
                            coordinate={{
                                latitude: parseFloat(p.latitude),
                                longitude: parseFloat(p.longitude)
                            }}
                            title={p.name}
                            description={p.fullAddress}
                        >
                            <View style={[
                                styles.markerBadge,
                                { backgroundColor: p.type === 'start' ? colors.success : p.type === 'end' ? colors.error : colors.primary }
                            ]}>
                                <Text style={styles.markerText}>{p.index || (p.type === 'start' ? 'A' : p.type === 'end' ? 'B' : '')}</Text>
                            </View>
                        </Marker>
                    ))}
                    {coordinates.length > 1 && (
                        <Polyline
                            coordinates={coordinates}
                            strokeColor={colors.primary}
                            strokeWidth={4}
                            lineDashPattern={[1]}
                        />
                    )}
                </MapView>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <div
                ref={mapRef}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: borderRadius,
                    overflow: 'hidden'
                }}
            />
        </View>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'hidden',
        backgroundColor: colors.cardLight,
    },
    markerBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    markerText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    }
});

export default TripMap;
