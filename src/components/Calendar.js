import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const { width } = Dimensions.get('window');

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const Calendar = ({ visible, onClose, onSelect, mode = 'single', initialStartDate, initialEndDate, minDate = new Date() }) => {
    const { colors } = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());
    const parseDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        const timestamp = Date.parse(d);
        if (!isNaN(timestamp)) return new Date(timestamp);
        return null;
    };

    const [startDate, setStartDate] = useState(() => parseDate(initialStartDate));
    const [endDate, setEndDate] = useState(() => parseDate(initialEndDate));
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            const sDate = parseDate(initialStartDate);
            const eDate = parseDate(initialEndDate);

            setStartDate(sDate);
            setEndDate(eDate);

            if (sDate) {
                setCurrentDate(sDate);
            }
        }
    }, [visible, initialStartDate, initialEndDate]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const isDateDisabled = (date) => {
        if (!minDate) return false;
        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const normalizedMin = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
        return normalizedDate < normalizedMin;
    };

    const handleDatePress = (day, offsetMonth = 0) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offsetMonth, day);

        if (isDateDisabled(selectedDate)) return;

        if (mode === 'single') {
            setStartDate(selectedDate);
            const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formatted = `${selectedDate.getDate()} ${monthsShort[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
            onSelect(formatted);
            onClose();
        } else {
            if (!startDate || (startDate && endDate)) {
                setStartDate(selectedDate);
                setEndDate(null);
            } else {
                if (selectedDate < startDate) {
                    setStartDate(selectedDate);
                } else {
                    setEndDate(selectedDate);
                    // Optional: auto close on end selection
                    // onSelect(startDate, selectedDate);
                }
            }
        }
    };

    const handleConfirm = () => {
        if (startDate && endDate) {
            const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const startFormatted = `${startDate.getDate()} ${monthsShort[startDate.getMonth()]} ${startDate.getFullYear()}`;
            const endFormatted = `${endDate.getDate()} ${monthsShort[endDate.getMonth()]} ${endDate.getFullYear()}`;
            onSelect(startFormatted, endFormatted);
        } else if (startDate) {
            const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const startFormatted = `${startDate.getDate()} ${monthsShort[startDate.getMonth()]} ${startDate.getFullYear()}`;
            onSelect(startFormatted, null);
        }
        onClose();
    };

    const changeMonth = (increment) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1);
        setCurrentDate(newDate);
    };

    const changeYear = (year) => {
        const newDate = new Date(year, currentDate.getMonth(), 1);
        setCurrentDate(newDate);
        setShowYearPicker(false);
    };

    const changeMonthDirect = (monthIndex) => {
        const newDate = new Date(currentDate.getFullYear(), monthIndex, 1);
        setCurrentDate(newDate);
        setShowMonthPicker(false);
    };

    // Check if date is within selected range
    const isInRange = (date) => {
        if (!startDate || !endDate) return false;
        return date > startDate && date < endDate;
    };

    const renderMonth = (monthOffset = 0) => {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);
        const { days, firstDay } = getDaysInMonth(targetDate);
        const monthYear = `${MONTHS[targetDate.getMonth()]} ${targetDate.getFullYear()}`;

        const renderHeader = () => {
            if (mode === 'single') {
                return (
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
                            <Icon name="back" size={20} color={colors.text} />
                        </TouchableOpacity>

                        <View style={styles.dropdownContainer}>
                            <TouchableOpacity onPress={() => setShowMonthPicker(!showMonthPicker)} style={styles.dropdownBtn}>
                                <Text style={[styles.dropdownText, { color: colors.text }]}>{MONTHS[targetDate.getMonth()]}</Text>
                                <Icon name="down" size={12} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowYearPicker(!showYearPicker)} style={styles.dropdownBtn}>
                                <Text style={[styles.dropdownText, { color: colors.text }]}>{targetDate.getFullYear()}</Text>
                                <Icon name="down" size={12} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => changeMonth(1)}>
                            <Icon name="back" size={24} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                    </View>
                );
            }
            return (
                <View style={styles.simpleHeader}>
                    <Text style={[styles.monthTitle, { color: colors.text }]}>{monthYear}</Text>
                </View>
            );
        };

        const dayCells = [];
        // Empty cells
        for (let i = 0; i < firstDay; i++) {
            dayCells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }

        // Days
        for (let i = 1; i <= days; i++) {
            const dateToCheck = new Date(targetDate.getFullYear(), targetDate.getMonth(), i);
            const isDisabled = isDateDisabled(dateToCheck);
            const isStart = isSameDay(dateToCheck, startDate);
            const isEnd = isSameDay(dateToCheck, endDate);
            const inRange = isInRange(dateToCheck);

            // Style determination
            let cellStyle = [styles.dayCell];
            let textStyle = { color: colors.text };
            let bgStyle = {};

            if (isDisabled) {
                textStyle.color = colors.textMuted;
                textStyle.opacity = 0.5;
            } else if (isStart || isEnd) {
                bgStyle = { backgroundColor: colors.text, borderRadius: 20 }; // Selected is White in dark mode
                textStyle.color = colors.bg; // Text becomes black
                textStyle.fontWeight = 'bold';
            } else if (inRange) {
                // Use primaryMuted or fallback to a visible color if not present
                bgStyle = {
                    backgroundColor: colors.primaryMuted || 'rgba(120, 120, 120, 0.2)',
                    borderRadius: 0
                };
                if (i === 1) bgStyle.borderTopLeftRadius = 20; // Round visuals for month start/end not verified but ok
            }

            // Fix range visual continuity
            if (inRange && (i === 1 || (i + firstDay - 1) % 7 === 0)) {
                // Start of row styling if needed
            }


            dayCells.push(
                <TouchableOpacity
                    key={`day-${i}`}
                    style={[styles.dayCell, bgStyle]}
                    onPress={() => handleDatePress(i, monthOffset)}
                    disabled={isDisabled}
                >
                    <Text style={[styles.dayText, textStyle]}>{i}</Text>
                </TouchableOpacity>
            );
        }

        return (
            <View style={[styles.monthContainer, mode === 'range' && { width: width > 600 ? '48%' : '100%' }]}>
                {renderHeader()}

                {/* Week Days Header */}
                <View style={styles.weekRow}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <Text key={day} style={[styles.weekText, { color: colors.textMuted }]}>{day}</Text>
                    ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                    {dayCells}
                </View>
            </View>
        );
    };

    const renderYearPicker = () => {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
        return (
            <ScrollView style={[styles.pickerList, { backgroundColor: colors.card }]} contentContainerStyle={{ padding: 10 }}>
                {years.map(year => (
                    <TouchableOpacity key={year} style={styles.pickerItem} onPress={() => changeYear(year)}>
                        <Text style={[styles.pickerText, { color: colors.text }]}>{year}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    const renderMonthPicker = () => {
        return (
            <ScrollView style={[styles.pickerList, { backgroundColor: colors.card }]} contentContainerStyle={{ padding: 10 }}>
                {MONTHS.map((m, i) => (
                    <TouchableOpacity key={m} style={styles.pickerItem} onPress={() => changeMonthDirect(i)}>
                        <Text style={[styles.pickerText, { color: colors.text }]}>{m}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.primaryBorder }]}>

                    {/* Main Header with Close/Confirm */}
                    {mode === 'range' && (
                        <View style={styles.topHeader}>

                            <TouchableOpacity onPress={() => changeMonth(-1)}>
                                <Icon name="back" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.rangeTitle, { color: colors.text }]}>
                                {startDate instanceof Date ? startDate.toLocaleDateString() : 'Start Date'} - {endDate instanceof Date ? endDate.toLocaleDateString() : 'End Date'}
                            </Text>
                            <TouchableOpacity onPress={() => changeMonth(1)}>
                                <Icon name="back" size={24} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={[styles.calendarsRow, mode === 'range' && width < 600 && { flexDirection: 'column' }]}>
                            {renderMonth(0)}
                            {mode === 'range' && renderMonth(1)}
                        </View>
                    </ScrollView>

                    {/* Pickers Overlay */}
                    {showYearPicker && (
                        <TouchableOpacity style={styles.pickerOverlay} onPress={() => setShowYearPicker(false)}>
                            {renderYearPicker()}
                        </TouchableOpacity>
                    )}
                    {showMonthPicker && (
                        <TouchableOpacity style={styles.pickerOverlay} onPress={() => setShowMonthPicker(false)}>
                            {renderMonthPicker()}
                        </TouchableOpacity>
                    )}


                    <View style={[styles.footer, { borderTopColor: colors.primaryBorder }]}>
                        <TouchableOpacity onPress={onClose} style={styles.footerBtn}>
                            <Text style={{ color: colors.textMuted }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            style={[styles.confirmBtn, { backgroundColor: colors.text, opacity: (!startDate && !endDate) ? 0.5 : 1 }]}
                            disabled={!startDate && !endDate}
                        >
                            <Text style={{ color: colors.bg, fontWeight: 'bold' }}>Select</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '90%',
        maxWidth: 700,
        maxHeight: '80%',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    rangeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 10,
    },
    calendarsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    monthContainer: {
        marginBottom: 20,
        padding: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    simpleHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    dropdownContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(120,120,120,0.2)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
    },
    dropdownText: {
        fontSize: 14,
        fontWeight: '500',
    },
    arrowButton: {
        padding: 8,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    weekText: {
        width: '14.28%',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 'bold',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    dayText: {
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    footerBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    confirmBtn: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    pickerOverlay: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    pickerList: {
        maxHeight: 200,
        width: 150,
        borderRadius: 12,
        elevation: 5,
    },
    pickerItem: {
        padding: 12,
        alignItems: 'center',
    },
    pickerText: {
        fontSize: 16,
    }
});

export default Calendar;
