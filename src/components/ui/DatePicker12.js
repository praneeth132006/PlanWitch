import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Platform } from 'react-native';

// Pure JS implementation to avoid missing native dependencies
export default function DatePicker12({
    value,
    onChange,
    mode = 'datetime', // 'date', 'time', 'datetime'
    title = 'Select Time',
    minDate,
    maxDate
}) {
    const [show, setShow] = useState(false);

    // Parse current value
    const dateVal = value || new Date();
    const [selectedHour, setSelectedHour] = useState(dateVal.getHours());
    const [selectedMinute, setSelectedMinute] = useState(dateVal.getMinutes());

    const formatValue = (date) => {
        if (!date) return 'Select Time';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleConfirm = () => {
        const newDate = new Date(dateVal);
        newDate.setHours(selectedHour);
        newDate.setMinutes(selectedMinute);
        onChange(newDate);
        setShow(false);
    };

    // Simple Time Picker UI
    const renderTimePicker = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10...

        return (
            <View style={styles.pickerContainer}>
                <View style={styles.column}>
                    <Text style={styles.colHeader}>Hour</Text>
                    <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                        {hours.map(h => (
                            <TouchableOpacity
                                key={h}
                                onPress={() => setSelectedHour(h)}
                                style={[styles.item, selectedHour === h && styles.selectedItem]}
                            >
                                <Text style={[styles.itemText, selectedHour === h && styles.selectedItemText]}>
                                    {h.toString().padStart(2, '0')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={styles.column}>
                    <Text style={styles.colHeader}>Minute</Text>
                    <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                        {minutes.map(m => (
                            <TouchableOpacity
                                key={m}
                                onPress={() => setSelectedMinute(m)}
                                style={[styles.item, selectedMinute === m && styles.selectedItem]}
                            >
                                <Text style={[styles.itemText, selectedMinute === m && styles.selectedItemText]}>
                                    {m.toString().padStart(2, '0')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        );
    };

    return (
        <View>
            <TouchableOpacity onPress={() => setShow(true)} style={styles.trigger}>
                <Text style={styles.triggerText}>
                    {value ? formatValue(value) : (mode === 'time' ? 'Select Time' : 'Select Date')}
                </Text>
            </TouchableOpacity>

            <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.header}>
                            <Text style={styles.title}>{title}</Text>
                        </View>

                        {renderTimePicker()}

                        <View style={styles.footer}>
                            <TouchableOpacity onPress={() => setShow(false)} style={styles.btnCancel}>
                                <Text style={styles.btnTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleConfirm} style={styles.btnConfirm}>
                                <Text style={styles.btnTextConfirm}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    trigger: {
        backgroundColor: '#333',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    triggerText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center'
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    header: {
        marginBottom: 10,
        width: '100%',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingBottom: 10
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600'
    },
    pickerContainer: {
        flexDirection: 'row',
        height: 200,
        width: '100%',
        justifyContent: 'space-around',
        marginBottom: 20
    },
    column: {
        flex: 1,
        alignItems: 'center'
    },
    colHeader: {
        color: '#888',
        marginBottom: 8,
        fontSize: 12,
        fontWeight: 'bold'
    },
    scrollList: {
        width: '100%',
    },
    item: {
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
        marginBottom: 4
    },
    selectedItem: {
        backgroundColor: '#3B82F6',
    },
    itemText: {
        color: '#888',
        fontSize: 18
    },
    selectedItemText: {
        color: 'white',
        fontWeight: 'bold'
    },
    footer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        gap: 10
    },
    btnCancel: {
        flex: 1,
        backgroundColor: '#333',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    btnConfirm: {
        flex: 1,
        backgroundColor: '#3B82F6',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    btnTextCancel: {
        color: '#CCC',
        fontWeight: '600'
    },
    btnTextConfirm: {
        color: 'white',
        fontWeight: '600'
    }
});
