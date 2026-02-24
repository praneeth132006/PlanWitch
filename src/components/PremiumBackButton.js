import React from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const PremiumBackButton = ({ onPress, style, size = 44, iconSize = 20, children }) => {
    const { colors, isDark } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                style,
                pressed && styles.pressed
            ]}
        >
            {children || <Icon name="back" size={iconSize} color={colors.primary} />}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 1,
    },
    pressed: {
        opacity: 0.8,
        transform: [{ scale: 0.95 }]
    }
});

export default PremiumBackButton;
