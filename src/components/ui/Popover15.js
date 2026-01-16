import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Pressable, Dimensions, Easing } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Icon from '../Icon';

const { width, height } = Dimensions.get('window');

/**
 * Popover15 - An animated, premium popover component
 * Simulates @ss-components/popover-15
 * 
 * @param {boolean} visible - Visibility state
 * @param {function} onClose - Function to call on close
 * @param {string} title - Optional title
 * @param {string} description - Optional description
 * @param {React.ReactNode} children - Content of the popover
 */
const Popover15 = ({ visible, onClose, title, description, children }) => {
    const { colors, isDark } = useTheme();

    // Animation values
    const scale = useRef(new Animated.Value(0.9)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scale, {
                    toValue: 1,
                    damping: 15,
                    stiffness: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(scale, {
                    toValue: 0.95,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 10,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    if (!visible && opacity._value === 0) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={onClose}
            animationType="none"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <Animated.View
                    style={[
                        styles.container,
                        { backgroundColor: colors.card },
                        {
                            opacity,
                            transform: [
                                { scale },
                                { translateY }
                            ]
                        }
                    ]}
                >
                    {/* Header Pattern / Decoration */}
                    <View style={[styles.decoration, { borderBottomColor: colors.primary + '10' }]}>
                        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                        <View style={[styles.line, { backgroundColor: colors.primary + '30' }]} />
                    </View>

                    {/* Close Button */}
                    <Pressable
                        style={[styles.closeButton, { backgroundColor: colors.bg }]}
                        onPress={onClose}
                    >
                        <Icon name="close" size={20} color={colors.textMuted} />
                    </Pressable>

                    {/* Content */}
                    <View style={styles.content}>
                        {(title || description) && (
                            <View style={styles.header}>
                                {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
                                {description && <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>}
                            </View>
                        )}

                        {children}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 20,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
        overflow: 'hidden',
    },
    decoration: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    line: {
        width: 40,
        height: 2,
        borderRadius: 1,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    content: {
        padding: 24,
        paddingTop: 8,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default Popover15;
