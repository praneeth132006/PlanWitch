import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import GOOGLE_MAPS_CONFIG, { MAP_DEFAULTS } from '../config/googleMaps';

/**
 * TripMap Component
 * Visualizes the trip Start, Visit, and End points on a read-only map.
 */
const TripMap = ({ start, origin, visit, end, destination, stops, mode, style }) => {
    const { colors } = useTheme();
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef([]);
    const bounds = useRef(null);
    const directionsService = useRef(null);
    const directionsRenderer = useRef(null);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const initMap = () => {
            if (window.google && window.google.maps && mapRef.current && !mapInstance.current) {
                mapInstance.current = new window.google.maps.Map(mapRef.current, {
                    ...MAP_DEFAULTS,
                    disableDefaultUI: true,
                    zoomControl: false,
                    gestureHandling: 'none',
                    keyboardShortcuts: false,
                    clickableIcons: false,
                });

                bounds.current = new window.google.maps.LatLngBounds();

                // Initialize Directions Service
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
            }
        };

        setTimeout(initMap, 500);

    }, []);

    // Update markers and route when points change
    useEffect(() => {
        if (!mapInstance.current || !window.google) return;

        // Clear existing markers
        markers.current.forEach(m => m.setMap(null));
        markers.current = [];

        bounds.current = new window.google.maps.LatLngBounds();
        let validLocations = [];

        // Combine all potential points: Origin/Start -> Stops -> End/Destination
        const startPoint = origin || start;
        const endPoint = destination || end;

        // 1. Add Start Point
        if (startPoint && startPoint.latitude && startPoint.longitude) {
            const position = { lat: startPoint.latitude, lng: startPoint.longitude };
            validLocations.push(position);
            markers.current.push(new window.google.maps.Marker({
                position,
                map: mapInstance.current,
                label: 'A',
                title: startPoint.name || 'Start',
            }));
            bounds.current.extend(position);
        }

        // 2. Add Stops
        if (stops && stops.length > 0) {
            stops.forEach((stop, index) => {
                if (stop && stop.latitude && stop.longitude) {
                    const position = { lat: stop.latitude, lng: stop.longitude };
                    validLocations.push(position);
                    markers.current.push(new window.google.maps.Marker({
                        position,
                        map: mapInstance.current,
                        label: (index + 1).toString(),
                        title: stop.name || `Stop ${index + 1}`,
                    }));
                    bounds.current.extend(position);
                }
            });
        }

        // 3. Add Visit (Legacy single point)
        if (visit && (!stops || stops.length === 0)) {
            if (visit.latitude && visit.longitude) {
                const position = { lat: visit.latitude, lng: visit.longitude };
                validLocations.push(position);
                markers.current.push(new window.google.maps.Marker({
                    position,
                    map: mapInstance.current,
                    label: 'B',
                    title: visit.name || 'Visit',
                }));
                bounds.current.extend(position);
            }
        }

        // 4. Add End Point
        if (endPoint && endPoint.latitude && endPoint.longitude) {
            const position = { lat: endPoint.latitude, lng: endPoint.longitude };
            validLocations.push(position);
            markers.current.push(new window.google.maps.Marker({
                position,
                map: mapInstance.current,
                label: validLocations.length > 1 ? String.fromCharCode(65 + validLocations.length - 1) : 'B', // Dynamic label
                title: endPoint.name || 'End',
            }));
            bounds.current.extend(position);
        }

        // Calculate Route
        if (directionsService.current && directionsRenderer.current) {
            if (validLocations.length >= 2) {
                const origin = validLocations[0];
                const destination = validLocations[validLocations.length - 1];
                const waypoints = validLocations.length > 2
                    ? validLocations.slice(1, -1).map(loc => ({ location: loc, stopover: true }))
                    : [];

                directionsService.current.route({
                    origin,
                    destination,
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
                if (validLocations.length > 0) {
                    mapInstance.current.fitBounds(bounds.current);
                    if (bounds.current.getNorthEast().equals(bounds.current.getSouthWest())) {
                        mapInstance.current.setZoom(10);
                    }
                }
            }
        }
    }, [start, visit, end, stops]);

    const styles = createStyles(colors);

    if (Platform.OS !== 'web') return null;

    return (
        <View style={[styles.container, style]}>
            <div
                ref={mapRef}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '0px'
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
