import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import GOOGLE_MAPS_CONFIG, { MAP_DEFAULTS, DAWN_MAP_STYLE, DUSK_MAP_STYLE } from '../config/googleMaps';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from './MapLib';

/**
 * TripMap Component
 * Visualizes the trip Start, Visit, and End points on a read-only map.
 */
const TripMap = ({ start, origin, visit, end, destination, stops, mode, style, borderRadius = 0, showDetailedMarkers = true }) => {
    const { colors, isDark } = useTheme();
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef([]);
    const bounds = useRef(null);
    const directionsService = useRef(null);
    const directionsRenderer = useRef(null);
    const geocoder = useRef(null);
    const updateCallId = useRef(0);
    const updateTimeout = useRef(null);
    const [nativeRoute, setNativeRoute] = React.useState([]);
    const [isNativeRouteFallback, setIsNativeRouteFallback] = React.useState(false);

    const decodePolyline = (encoded) => {
        if (!encoded) return [];
        let points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;
        while (index < len) {
            let b, shift = 0, result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            shift = 0; result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
        }
        return points;
    };

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

    const fallbackPolyline = useRef(null);

    // Extract update logic to function so we can call it from init
    const updateMapContents = async () => {
        if (!mapInstance.current || !window.google) return;

        // Debounce logic
        if (updateTimeout.current) clearTimeout(updateTimeout.current);
        updateTimeout.current = setTimeout(async () => {
            const currentCallId = ++updateCallId.current;

            // Clear existing markers
            markers.current.forEach(m => m.setMap(null));
            markers.current = [];

            // Clear fallback polyline if it exists
            if (fallbackPolyline.current) {
                fallbackPolyline.current.setMap(null);
                fallbackPolyline.current = null;
            }

            bounds.current = new window.google.maps.LatLngBounds();

            // Helper to resolve coordinates
            const resolveLocation = async (item) => {
                if (item.latitude && item.longitude) {
                    return { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude), name: item.name };
                }
                if (item.location || item.name) {
                    const query = item.location || item.name;
                    return new Promise((resolve) => {
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
                                resolve(null);
                            }
                        });
                    });
                }
                return null;
            };

            // 1. Collect all points in order
            const allPoints = [];
            let labelCounter = 1;

            // Start
            const startPoint = origin || start;
            if (startPoint) {
                const resolved = await resolveLocation({ ...startPoint, name: startPoint.name || 'Start' });
                if (currentCallId !== updateCallId.current) return;
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
                const stopPromises = stops.map((stop, i) => resolveLocation({ ...stop, name: stop.name || `Stop ${i + 1}` }));
                const resolvedStops = await Promise.all(stopPromises);
                if (currentCallId !== updateCallId.current) return;

                resolvedStops.forEach((resolved) => {
                    if (resolved) {
                        allPoints.push({
                            type: 'stop',
                            position: { lat: resolved.lat, lng: resolved.lng },
                            label: (labelCounter++).toString(),
                            name: resolved.name
                        });
                    }
                });
            }

            // visit & end logic...
            if (visit && (!stops || stops.length === 0)) {
                const resolved = await resolveLocation({ ...visit, name: visit.name || 'Visit' });
                if (currentCallId !== updateCallId.current) return;
                if (resolved) {
                    allPoints.push({
                        type: 'visit',
                        position: { lat: resolved.lat, lng: resolved.lng },
                        label: (labelCounter++).toString(),
                        name: resolved.name
                    });
                }
            }

            const endPoint = destination || end;
            if (endPoint) {
                const resolved = await resolveLocation({ ...endPoint, name: endPoint.name || 'End' });
                if (currentCallId !== updateCallId.current) return;
                if (resolved) {
                    allPoints.push({
                        type: 'end',
                        position: { lat: resolved.lat, lng: resolved.lng },
                        label: (labelCounter++).toString(),
                        name: resolved.name
                    });
                }
            }

            if (allPoints.length === 0 || currentCallId !== updateCallId.current) return;

            // 2. Group collinear points and draw Markers
            const uniqueParams = {};
            allPoints.forEach(p => {
                const key = `${p.position.lat},${p.position.lng}`;
                if (!uniqueParams[key]) {
                    uniqueParams[key] = { position: p.position, labels: [p.label], title: p.name };
                } else {
                    uniqueParams[key].labels.push(p.label);
                    if (!uniqueParams[key].title.includes(p.name)) uniqueParams[key].title += ` & ${p.name}`;
                }
                bounds.current.extend(p.position);
            });

            Object.values(uniqueParams).forEach(group => {
                let label = showDetailedMarkers ?
                    (group.labels.length > 3 ? `${group.labels[0]}-${group.labels[group.labels.length - 1]}` : group.labels.join(', ')) :
                    group.labels[0];

                const marker = new window.google.maps.Marker({
                    position: group.position,
                    map: mapInstance.current,
                    label: label,
                    title: group.title,
                });
                markers.current.push(marker);
            });

            // 4. Calculate Route or Fallback
            if (directionsService.current && directionsRenderer.current) {
                if (allPoints.length >= 2) {
                    const routeOrigin = allPoints[0].position;
                    const routeDestination = allPoints[allPoints.length - 1].position;
                    const intermediatePoints = allPoints.slice(1, -1);
                    const waypoints = intermediatePoints.slice(0, 23).map(p => ({ location: p.position, stopover: true }));

                    directionsService.current.route({
                        origin: routeOrigin,
                        destination: routeDestination,
                        waypoints,
                        optimizeWaypoints: false,
                        travelMode: window.google.maps.TravelMode.DRIVING,
                    }, (result, status) => {
                        if (currentCallId !== updateCallId.current) return;

                        if (status === window.google.maps.DirectionsStatus.OK) {
                            directionsRenderer.current.setDirections(result);
                        } else {
                            // FALLBACK: Draw dashed lines if Google Routing fails
                            console.warn('Directions failed (' + status + '). Using fallback Polyline.');
                            directionsRenderer.current.setDirections({ routes: [] });

                            const polylinePath = allPoints.map(p => p.position);
                            fallbackPolyline.current = new window.google.maps.Polyline({
                                path: polylinePath,
                                map: mapInstance.current,
                                strokeColor: '#000000',
                                strokeWeight: 3,
                                strokeOpacity: 0.5,
                                icons: [{
                                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 },
                                    offset: '0',
                                    repeat: '20px'
                                }]
                            });

                            mapInstance.current.fitBounds(bounds.current);
                        }
                    });
                } else {
                    directionsRenderer.current.setDirections({ routes: [] });
                    if (allPoints.length > 0) mapInstance.current.fitBounds(bounds.current);
                }
            }
        }, 400);
    };

    const updateNativeMap = async () => {
        const currentCallId = ++updateCallId.current;
        const nativePoints = [];
        const startPoint = origin || start;
        if (startPoint) nativePoints.push({ ...startPoint, type: 'start' });
        if (stops && stops.length > 0) stops.forEach((s, i) => nativePoints.push({ ...s, type: 'stop', index: i + 1 }));
        const endPoint = destination || end;
        if (endPoint) nativePoints.push({ ...endPoint, type: 'end' });

        if (nativePoints.length < 2) {
            setNativeRoute([]);
            setIsNativeRouteFallback(false);
            return;
        }

        try {
            const originStr = `${nativePoints[0].latitude},${nativePoints[0].longitude}`;
            const destStr = `${nativePoints[nativePoints.length - 1].latitude},${nativePoints[nativePoints.length - 1].longitude}`;
            const waypoints = nativePoints.slice(1, -1).map(p => `${p.latitude},${p.longitude}`).join('|');

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&waypoints=${waypoints}&key=${GOOGLE_MAPS_CONFIG.apiKey}`
            );
            const data = await response.json();

            if (currentCallId === updateCallId.current) {
                if (data.routes && data.routes[0]) {
                    const points = decodePolyline(data.routes[0].overview_polyline.points);
                    setNativeRoute(points);
                    setIsNativeRouteFallback(false);
                } else {
                    // Success API call but no route found (e.g. across ocean or no roads)
                    setNativeRoute(nativePoints.map(p => ({ latitude: parseFloat(p.latitude), longitude: parseFloat(p.longitude) })));
                    setIsNativeRouteFallback(true);
                }
            }
        } catch (error) {
            console.error('Native directions error:', error);
            // Fallback to straight lines
            setNativeRoute(nativePoints.map(p => ({ latitude: parseFloat(p.latitude), longitude: parseFloat(p.longitude) })));
            setIsNativeRouteFallback(true);
        }
    };

    // Update markers and route when points change
    useEffect(() => {
        if (Platform.OS === 'web') {
            updateMapContents();
        } else {
            updateNativeMap();
        }
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
                    {nativeRoute.length > 1 && (
                        <Polyline
                            coordinates={nativeRoute}
                            strokeColor={isNativeRouteFallback ? "#666666" : "#000000"}
                            strokeWidth={isNativeRouteFallback ? 3 : 4}
                            lineDashPattern={isNativeRouteFallback ? [5, 10] : undefined}
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
