import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

/**
 * Custom Alert Component
 * Replaces standard Alert.alert with a styled modal
 * 
 * Props:
 * - visible: boolean
 * - title: string
 * - message: string
 * - type: 'success' | 'error' | 'warning' | 'info' | 'loading'
 * - onConfirm: function (primary action)
 * - onCancel: function (secondary action, optional)
 * - confirmText: string (default: "OK")
 * - cancelText: string (default: "Cancel")
 */
export const CustomAlert = ({
    visible,
    title,
    message,
    type = 'info',
    onConfirm,
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancel'
}) => {
    const { colors } = useTheme();

    if (!visible) return null;

    const isLoading = type === 'loading';

    const getIcon = () => {
        switch (type) {
            case 'success': return 'check';
            case 'error': return 'close';
            case 'warning': return 'notification';
            case 'loading': return null; // No icon for loading
            default: return 'info';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'success': return '#22C55E';
            case 'error': return '#EF4444';
            case 'warning': return '#F59E0B';
            case 'loading': return colors.primary;
            default: return colors.primary;
        }
    };

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.alertBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {isLoading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
                    ) : (
                        <View style={[styles.iconCircle, { backgroundColor: getColor() + '20' }]}>
                            <Icon name={getIcon()} size={24} color={getColor()} />
                        </View>
                    )}

                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>

                    {/* Only show buttons if not loading and onConfirm exists */}
                    {!isLoading && onConfirm && (
                        <View style={styles.buttonRow}>
                            {onCancel && (
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                                    onPress={onCancel}
                                >
                                    <Text style={{ color: colors.text }}>{cancelText}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: getColor(), flex: onCancel ? 1 : 0, minWidth: 100 }]}
                                onPress={onConfirm}
                            >
                                <Text style={styles.confirmText}>{confirmText}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center'
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center'
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelButton: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 1
    },
    confirmText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16
    }
});
