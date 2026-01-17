import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';

// IMPORTANT: This file is a stub for web compatibility.
// The react-native-google-mobile-ads library does NOT support web and will crash the bundler.
// For now, this renders nothing on all platforms until a native build is created.

export default function AdBanner() {
    // On web, render nothing (ads not supported)
    if (Platform.OS === 'web') {
        return null;
    }

    // On native, show a placeholder until proper native build is done
    // Once you do `npx expo run:android` or `npx expo run:ios`, you can swap this
    // with the real implementation.
    return (
        <View style={styles.container}>
            <Text style={styles.placeholder}>Ad Space (Native build required)</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        width: '100%',
        minHeight: 50,
        backgroundColor: '#f0f0f020',
    },
    placeholder: {
        fontSize: 10,
        color: '#888',
    }
});
