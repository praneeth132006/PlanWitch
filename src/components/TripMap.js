import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import GOOGLE_MAPS_CONFIG, { MAP_DEFAULTS } from '../config/googleMaps';

/**
 * TripMap Component
 * Visualizes the trip Start, Visit, and End points on a read-only map.
 */
const TripMap = ({ start, origin, visit, end, destination, stops, mode, style, borderRadius = 0 }) => {
    const { colors } = useTheme();
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef([]);
    const bounds = useRef(null);
    const directionsService = useRef(null);
    const directionsRenderer = useRef(null);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        // Web Initialization with Retry
        const checkGoogleMaps = () => {
            if (window.google && window.google.maps) {
                if (mapRef.current && !mapInstance.current) {
                    mapInstance.current = new window.google.maps.Map(mapRef.current, {
                        ...MAP_DEFAULTS,
                        disableDefaultUI: true,
                        zoomControl: false,
                        gestureHandling: 'none',
                        keyboardShortcuts: false,
                        clickableIcons: false,
                    });

                    bounds.current = new window.google.maps.LatLngBounds();

                    directionsService.current = new window.google.maps.DirectionsService();
                    directionsRenderer.current = new window.google.maps.DirectionsRenderer({
                        map: mapInstance.current,
                        suppressMarkers: true,
                        preserveViewport: false,
                        polylineOptions: {
                            strokeColor: '#FFD2AD',
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

        if (!checkGoogleMaps()) {
            const interval = setInterval(() => {
                if (checkGoogleMaps()) {
                    clearInterval(interval);
                }
            }, 500);

            // Stop checking after 10 seconds
            setTimeout(() => clearInterval(interval), 10000);
            return () => clearInterval(interval);
        }
    }, []);

    // Extract update logic to function so we can call it from init
    const updateMapContents = () => {
        if (!mapInstance.current || !window.google) return;

        // Clear existing markers
        markers.current.forEach(m => m.setMap(null));
        markers.current = [];

        bounds.current = new window.google.maps.LatLngBounds();

        // 1. Collect all points in order with their logical label
        const allPoints = [];
        let labelCounter = 1;

        // Start
        const startPoint = origin || start;
        if (startPoint && startPoint.latitude && startPoint.longitude) {
            allPoints.push({
                type: 'start',
                position: { lat: startPoint.latitude, lng: startPoint.longitude },
                label: (labelCounter++).toString(),
                name: startPoint.name || 'Start'
            });
        }

        // Stops
        if (stops && stops.length > 0) {
            stops.forEach((stop, index) => {
                if (stop && stop.latitude && stop.longitude) {
                    allPoints.push({
                        type: 'stop',
                        position: { lat: stop.latitude, lng: stop.longitude },
                        label: (labelCounter++).toString(),
                        name: stop.name || `Stop ${index + 1}`
                    });
                }
            });
        }

        // Visit (Legacy)
        if (visit && (!stops || stops.length === 0) && visit.latitude && visit.longitude) {
            allPoints.push({
                type: 'visit',
                position: { lat: visit.latitude, lng: visit.longitude },
                label: (labelCounter++).toString(),
                name: visit.name || 'Visit'
            });
        }

        // End
        const endPoint = destination || end;
        if (endPoint && endPoint.latitude && endPoint.longitude) {
            allPoints.push({
                type: 'end',
                position: { lat: endPoint.latitude, lng: endPoint.longitude },
                label: (labelCounter++).toString(),
                name: endPoint.name || 'End'
            });
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
                const waypoints = allPoints.length > 2
                    ? allPoints.slice(1, -1).map(p => ({ location: p.position, stopover: true }))
                    : [];

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

    // Native Fallback - since we don't have react-native-maps installed
    if (Platform.OS !== 'web') {
        return (
            <View style={[styles.container, style, { alignItems: 'center', justifyContent: 'center' }]}>
                {/* Fallback View for Native */}
                <View style={{ width: '100%', height: '100%', backgroundColor: colors.cardLight, alignItems: 'center', justifycontent: 'center' }}>
                    {/* Placeholder content if needed, e.g. static image or nothing */}
                </View>
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
        height: 300,
        width: '100%',
        overflow: 'hidden',
        backgroundColor: colors.cardLight,
    },
});

export default TripMap;
