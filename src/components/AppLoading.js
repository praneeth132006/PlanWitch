import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const { width, height } = Dimensions.get('window');

const AppLoading = () => {
    const { colors } = useTheme();
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Rotation for rings and icons
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 10000,
                easing: Easing.linear,
                useNativeDriver: Platform.OS !== 'web',
            })
        ).start();

        // Pulsing for center icon
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ])
        ).start();

        // Fade in entire screen
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
        }).start();
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const reverseSpin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'],
    });

    const renderOrbitingIcon = (iconName, angle, radius) => {
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        return (
            <View
                key={iconName}
                style={[
                    styles.orbitingIconWrapper,
                    {
                        transform: [
                            { translateX: x },
                            { translateY: y },
                        ],
                    }
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: colors.card, borderColor: colors.primaryBorder }]}>
                    <Icon name={iconName} size={24} />
                </View>
            </View>
        );
    };

    return (
        <Animated.View style={[styles.container, { backgroundColor: colors.bg, opacity: fadeAnim }]}>
            {/* Main Animation Container */}
            <View style={styles.animationContainer}>
                {/* Dashed Orbit Rings */}
                <Animated.View style={[styles.orbitRing, styles.outerRing, { borderColor: colors.primary + '30', transform: [{ rotate: spin }] }]} />
                <Animated.View style={[styles.orbitRing, styles.innerRing, { borderColor: colors.primary + '20', transform: [{ rotate: reverseSpin }] }]} />

                {/* Orbiting Icons */}
                <Animated.View style={[styles.iconsContainer, { transform: [{ rotate: spin }] }]}>
                    {renderOrbitingIcon('nature', 45, 140)}
                    {renderOrbitingIcon('hourglass', 135, 140)}
                    {renderOrbitingIcon('beach', 225, 140)}
                    {renderOrbitingIcon('packing', 315, 140)}
                </Animated.View>

                {/* Center Content */}
                <View style={styles.centerCircleWrapper}>
                    <Animated.View style={[styles.centerCircle, { backgroundColor: colors.card, borderColor: colors.primary + '40', transform: [{ scale: pulseAnim }] }]}>
                        <Icon name="hourglass" size={80} />
                    </Animated.View>
                </View>
            </View>

            {/* Branding */}
            <View style={styles.footer}>
                <Text style={[styles.appName, { color: colors.text }]}>RouteMate</Text>
                <Text style={[styles.tagline, { color: colors.textMuted }]}>Your Premium Travel Companion</Text>
                <View style={styles.loadingBarContainer}>
                    <View style={[styles.loadingBar, { backgroundColor: colors.primary }]} />
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    animationContainer: {
        width: 300,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orbitRing: {
        position: 'absolute',
        borderRadius: 1000,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    outerRing: {
        width: 280,
        height: 280,
    },
    innerRing: {
        width: 200,
        height: 200,
    },
    iconsContainer: {
        width: 300,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
    },
    orbitingIconWrapper: {
        position: 'absolute',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    centerCircleWrapper: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
    },
    appName: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 8,
    },
    tagline: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 1,
        marginBottom: 20,
    },
    loadingBarContainer: {
        width: 150,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBar: {
        width: '40%', // We could animate this too, but fixed/looping is fine for a splash
        height: '100%',
        borderRadius: 2,
    }
});

export default AppLoading;
