import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Button06 - Premium shadcn-style animated button
 * Simulates @ss-components/button-06
 * 
 * @param {string} title - Button text
 * @param {function} onPress - Press handler
 * @param {string} variant - 'primary' | 'secondary' | 'outline' | 'ghost'
 * @param {boolean} disabled - Disabled state
 * @param {object} style - Additional styles
 */
const Button06 = ({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    style,
    icon,
    backgroundColor,
    textColor
}) => {
    const { colors } = useTheme();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    container: {
                        backgroundColor: colors.primary,
                        borderWidth: 0,
                    },
                    text: {
                        color: '#FFFFFF',
                    }
                };
            case 'secondary':
                return {
                    container: {
                        backgroundColor: '#333',
                        borderWidth: 0,
                    },
                    text: {
                        color: '#FFFFFF',
                    }
                };
            case 'outline':
                return {
                    container: {
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderColor: colors.primary,
                    },
                    text: {
                        color: colors.primary,
                    }
                };
            case 'ghost':
                return {
                    container: {
                        backgroundColor: 'transparent',
                        borderWidth: 0,
                    },
                    text: {
                        color: colors.text,
                    }
                };
            default:
                return {
                    container: {
                        backgroundColor: colors.primary,
                        borderWidth: 0,
                    },
                    text: {
                        color: '#FFFFFF',
                    }
                };
        }
    };

    const variantStyles = getVariantStyles();

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
            <TouchableOpacity
                style={[
                    styles.button,
                    variantStyles.container,
                    backgroundColor && { backgroundColor },
                    disabled && styles.disabled
                ]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                activeOpacity={0.9}
            >
                {icon && <View style={styles.iconWrapper}>{icon}</View>}
                <Text style={[styles.text, variantStyles.text, textColor && { color: textColor }, disabled && styles.disabledText]}>
                    {title}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    text: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    iconWrapper: {
        marginRight: 8,
    },
    disabled: {
        opacity: 0.5,
    },
    disabledText: {
        opacity: 0.7,
    },
});

export default Button06;
