import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const AddToHomeScreenPrompt = () => {
    const { colors, isDark } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState(null);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        if (!isStandalone) {
            // Determine platform
            const userAgent = window.navigator.userAgent.toLowerCase();
            const isIOS = /iphone|ipad|ipod/.test(userAgent);
            const isAndroid = /android/.test(userAgent);

            if (isIOS) setPlatform('ios');
            else if (isAndroid) setPlatform('android');

            // Delay showing the prompt
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 3000);

            // Listen for Android install prompt
            const handleBeforeInstallPrompt = (e) => {
                e.preventDefault();
                setDeferredPrompt(e);
            };

            window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            };
        }
    }, []);

    const handleInstallAndroid = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsVisible(false);
            }
            setDeferredPrompt(null);
        }
    };

    if (!isVisible) return null;

    return (
        <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.primaryBorder }]}>
            <View style={styles.header}>
                <View style={styles.iconBg}>
                    <Icon name="route" size={32} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Add PlanWitch to Home Screen</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        Install the app for a better experience and quick access!
                    </Text>
                </View>
                <Pressable onPress={() => setIsVisible(false)} style={styles.closeBtn}>
                    <Icon name="close" size={20} color={colors.textMuted} />
                </Pressable>
            </View>

            {platform === 'ios' ? (
                <View style={styles.iosInstructions}>
                    <Text style={[styles.instructionText, { color: colors.text }]}>
                        1. Tap the <View style={styles.iosIconWrapper}><Icon name="logout" size={16} style={{ transform: [{ rotate: '270deg' }] }} /></View> share icon below.
                    </Text>
                    <Text style={[styles.instructionText, { color: colors.text }]}>
                        2. Scroll down and tap "Add to Home Screen".
                    </Text>
                </View>
            ) : platform === 'android' ? (
                <Pressable
                    style={[styles.installBtn, { backgroundColor: colors.primary }]}
                    onPress={handleInstallAndroid}
                >
                    <Text style={styles.installBtnText}>Install Now</Text>
                </Pressable>
            ) : (
                <Text style={[styles.instructionText, { color: colors.text, textAlign: 'center' }]}>
                    Open your browser settings and select "Install" or "Add to Home Screen".
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    bottomSheet: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
        zIndex: 9999,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBg: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFD2AD20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    iosInstructions: {
        gap: 8,
        paddingTop: 8,
    },
    instructionText: {
        fontSize: 14,
        lineHeight: 20,
    },
    iosIconWrapper: {
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: -4,
    },
    installBtn: {
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    installBtnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default AddToHomeScreenPrompt;
