import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    StatusBar,
    Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Travel smarter,',
        titleLine2: 'together with the',
        titleLine3: 'help of',
        highlight: 'AI',
        image: require('../../assets/onboarding/ai_itinerary.png'),
        accent: '#10B981'
    },
    {
        id: '2',
        title: 'Pack like a',
        highlight: 'pro',
        image: require('../../assets/onboarding/packing.png'),
        accent: '#10B981'
    },
    {
        id: '3',
        title: 'Stay on budget',
        highlight: 'effortlessly',
        image: require('../../assets/onboarding/finance.png'),
        accent: '#10B981'
    },
    {
        id: '4',
        title: 'See your travel',
        titleLine2: 'plan at a',
        highlight: 'glance',
        image: require('../../assets/onboarding/welcome.png'),
        accent: '#10B981'
    }
];

export default function OnboardingScreen({ onFinish }) {
    const { colors, isDark } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);

    const viewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const getItemLayout = (_, index) => ({
        length: width,
        offset: width * index,
        index,
    });

    const handleNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            await finishOnboarding();
        }
    };

    const handleSkip = async () => {
        await finishOnboarding();
    };

    const finishOnboarding = async () => {
        try {
            await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
            if (onFinish) onFinish();
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            if (onFinish) onFinish();
        }
    };

    const renderSlide = ({ item }) => {
        return (
            <View style={[styles.slide, { width }]}>
                {/* Title at top */}
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    {item.titleLine2 && <Text style={styles.title}>{item.titleLine2}</Text>}
                    {item.titleLine3 && (
                        <Text style={styles.title}>
                            {item.titleLine3} <Text style={[styles.highlight, { color: item.accent }]}>{item.highlight}</Text>
                        </Text>
                    )}
                    {!item.titleLine3 && item.highlight && (
                        <Text style={[styles.highlight, { color: item.accent }]}>{item.highlight}</Text>
                    )}
                </View>

                {/* Image in center */}
                <View style={styles.imageWrapper}>
                    <View style={[styles.glow, { backgroundColor: item.accent }]} />
                    <Image source={item.image} style={styles.mockupImage} resizeMode="contain" />
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: '#0D0D0D' }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Background Gradient Glow */}
            <View style={[styles.bgGlow, { backgroundColor: SLIDES[currentIndex].accent }]} />

            <FlatList
                data={SLIDES}
                renderItem={renderSlide}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                bounces={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: false,
                })}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
                scrollEventThrottle={32}
                ref={slidesRef}
                getItemLayout={getItemLayout}
            />

            {/* Top Controls - Skip button */}
            <SafeAreaView style={styles.topControls}>
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </SafeAreaView>

            <View style={styles.bottomSection}>
                {/* Pagination Dots */}
                <View style={styles.pagination}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i.toString()}
                                style={[
                                    styles.dot,
                                    { width: dotWidth, opacity, backgroundColor: '#10B981' }
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>
                        {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgGlow: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        left: -width * 0.4,
        top: height * 0.2,
        opacity: 0.15,
        transform: [{ scaleY: 1.5 }],
    },
    topControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    skipButton: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        alignSelf: 'flex-end',
    },
    skipText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 0.5,
    },
    slide: {
        flex: 1,
    },
    titleContainer: {
        paddingTop: height * 0.1,
        paddingHorizontal: 24,
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 42,
    },
    highlight: {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 42,
    },
    imageWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    mockupImage: {
        width: width * 0.85,
        height: height * 0.55,
        zIndex: 2,
    },
    glow: {
        position: 'absolute',
        width: width * 0.7,
        height: width * 0.7,
        borderRadius: width * 0.35,
        opacity: 0.2,
        zIndex: 1,
    },
    bottomSection: {
        paddingHorizontal: 24,
        paddingBottom: height * 0.05,
        width: '100%',
    },
    pagination: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    button: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0D0D0D',
        letterSpacing: 0.5,
    },
});
