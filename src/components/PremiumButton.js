import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

/**
 * Premium Button Component with multiple variants
 * Variants: primary, secondary, outline, ghost, danger, success
 */
const PremiumButton = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    style,
    textStyle,
}) => {
    const { colors } = useTheme();

    const getVariantStyles = () => {
        const variants = {
            primary: {
                button: {
                    backgroundColor: colors.primary,
                    borderWidth: 0,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                },
                text: { color: '#FFFFFF' },
                iconColor: '#FFFFFF',
            },
            secondary: {
                button: {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.primaryBorder,
                },
                text: { color: colors.text },
                iconColor: colors.text,
            },
            outline: {
                button: {
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: colors.primary,
                },
                text: { color: colors.primary },
                iconColor: colors.primary,
            },
            ghost: {
                button: {
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                },
                text: { color: colors.primary },
                iconColor: colors.primary,
            },
            danger: {
                button: {
                    backgroundColor: '#EF4444',
                    borderWidth: 0,
                    shadowColor: '#EF4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                },
                text: { color: '#FFFFFF' },
                iconColor: '#FFFFFF',
            },
            success: {
                button: {
                    backgroundColor: '#10B981',
                    borderWidth: 0,
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                },
                text: { color: '#FFFFFF' },
                iconColor: '#FFFFFF',
            },
            gradient: {
                button: {
                    backgroundColor: colors.primary,
                    borderWidth: 0,
                    shadowColor: '#8B5CF6',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 8,
                },
                text: { color: '#000000', fontWeight: 'bold' },
                iconColor: '#000000',
            },
            white: {
                button: {
                    backgroundColor: '#FFFFFF',
                    borderWidth: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                },
                text: { color: '#000000', fontWeight: 'bold' },
                iconColor: '#000000',
            },
        };
        return variants[variant] || variants.primary;
    };

    const getSizeStyles = () => {
        const sizes = {
            small: {
                button: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
                text: { fontSize: 13 },
                iconSize: 16,
            },
            medium: {
                button: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14 },
                text: { fontSize: 15 },
                iconSize: 20,
            },
            large: {
                button: { paddingVertical: 18, paddingHorizontal: 28, borderRadius: 16 },
                text: { fontSize: 17 },
                iconSize: 24,
            },
        };
        return sizes[size] || sizes.medium;
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[
                styles.button,
                variantStyles.button,
                sizeStyles.button,
                fullWidth && styles.fullWidth,
                disabled && styles.disabled,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={variantStyles.text.color} size="small" />
            ) : (
                <View style={styles.content}>
                    {icon && iconPosition === 'left' && (
                        <Icon name={icon} size={sizeStyles.iconSize} color={variantStyles.iconColor} style={styles.iconLeft} />
                    )}
                    <Text style={[styles.text, variantStyles.text, sizeStyles.text, textStyle]}>
                        {title}
                    </Text>
                    {icon && iconPosition === 'right' && (
                        <Icon name={icon} size={sizeStyles.iconSize} color={variantStyles.iconColor} style={styles.iconRight} />
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.5,
    },
});

export default PremiumButton;
