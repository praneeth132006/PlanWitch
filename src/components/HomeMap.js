import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';
import GOOGLE_MAPS_CONFIG, { MAP_DEFAULTS } from '../config/googleMaps';
import MapView, { Marker, PROVIDER_GOOGLE } from './MapLib';
import { useTheme } from '../context/ThemeContext';

const HomeMap = ({ destination, markers = [], style }) => {
    const { colors } = useTheme();
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const googleMarkers = useRef([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const loadGoogleMapsScript = () => {
            return new Promise((resolve, reject) => {
                if (window.google && window.google.maps) {
                    resolve();
                    return;
                }

                const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
                if (existingScript) {
                    existingScript.addEventListener('load', resolve);
                    return;
                }

                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=places,geometry`;
                script.async = true;
                script.defer = true;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        };

        const initMap = () => {
            if (!mapRef.current || !window.google || !window.google.maps) return false;

            if (!mapInstance.current) {
                mapInstance.current = new window.google.maps.Map(mapRef.current, {
                    ...MAP_DEFAULTS,
                    disableDefaultUI: true,
                    zoomControl: false,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    gestureHandling: 'cooperative', // Better for mobile/web scrolling
                    mapId: '330d727194d831d02de90356',
                });
                setIsLoaded(true);
            }
            return true;
        };

        loadGoogleMapsScript()
            .then(() => {
                const interval = setInterval(() => {
                    if (initMap()) clearInterval(interval);
                }, 100);
                setTimeout(() => clearInterval(interval), 5000);
            })
            .catch(err => console.error('Map loading error:', err));
    }, []);

    // Handle markers updating
    useEffect(() => {
        if (!isLoaded || !mapInstance.current) return;

        // Clear existing markers
        googleMarkers.current.forEach(m => m.setMap(null));
        googleMarkers.current = [];

        const bounds = new window.google.maps.LatLngBounds();
        let hasMarkers = false;

        // Add main destination marker if coordinates exist
        if (destination && destination.latitude && destination.longitude) {
            const pos = { lat: destination.latitude, lng: destination.longitude };
            const marker = new window.google.maps.Marker({
                position: pos,
                map: mapInstance.current,
                title: destination.name,
                animation: window.google.maps.Animation.DROP,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: '#8B5CF6',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#FFFFFF',
                    scale: 10,
                }
            });
            googleMarkers.current.push(marker);
            bounds.extend(pos);
            hasMarkers = true;
        }

        // Add additional markers (stops)
        markers.forEach((stop, index) => {
            if (stop.latitude && stop.longitude) {
                const pos = { lat: stop.latitude, lng: stop.longitude };
                const marker = new window.google.maps.Marker({
                    position: pos,
                    map: mapInstance.current,
                    title: stop.name,
                    label: {
                        text: (index + 1).toString(),
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold'
                    },
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: '#3B82F6',
                        fillOpacity: 1,
                        strokeWeight: 1,
                        strokeColor: '#FFFFFF',
                        scale: 8,
                    }
                });
                googleMarkers.current.push(marker);
                bounds.extend(pos);
                hasMarkers = true;
            }
        });

        if (hasMarkers) {
            mapInstance.current.fitBounds(bounds);
            // Don't zoom in too much if only one marker
            const listener = window.google.maps.event.addListener(mapInstance.current, "idle", () => {
                if (mapInstance.current.getZoom() > 14) mapInstance.current.setZoom(14);
                window.google.maps.event.removeListener(listener);
            });
        }
    }, [isLoaded, destination, markers]);

    return (
        <View style={[styles.container, style]}>
            {Platform.OS === 'web' ? (
                <div
                    ref={mapRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '24px',
                        overflow: 'hidden'
                    }}
                />
            ) : (
                <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}>
                    <MapView
                        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                        style={StyleSheet.absoluteFill}
                        initialRegion={{
                            latitude: destination?.latitude || MAP_DEFAULTS.center.lat,
                            longitude: destination?.longitude || MAP_DEFAULTS.center.lng,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        }}
                        customMapStyle={MAP_DEFAULTS.styles}
                    >
                        {destination?.latitude && destination?.longitude && (
                            <Marker
                                coordinate={{
                                    latitude: parseFloat(destination.latitude),
                                    longitude: parseFloat(destination.longitude)
                                }}
                                title={destination.name}
                                pinColor="#8B5CF6"
                            />
                        )}
                        {markers.map((stop, index) => (
                            stop.latitude && stop.longitude && (
                                <Marker
                                    key={index}
                                    coordinate={{
                                        latitude: parseFloat(stop.latitude),
                                        longitude: parseFloat(stop.longitude)
                                    }}
                                    title={stop.name}
                                    pinColor="#3B82F6"
                                />
                            )
                        ))}
                    </MapView>
                </View>
            )}
            {!isLoaded && Platform.OS === 'web' && (
                <View style={styles.loader}>
                    <ActivityIndicator color="#8B5CF6" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 250,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
    },
    fallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#262626',
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    }
});

export default HomeMap;
