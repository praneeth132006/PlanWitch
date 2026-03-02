import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Animated,
    ActivityIndicator, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import Icon from '../components/Icon';
import { chatWithAssistant } from '../services/aiService';

const INITIAL_MESSAGES = [
    {
        id: '1',
        text: "Hi! I'm your PlanWitch Assistant. ✨ How can I help with your trip today?",
        sender: 'ai',
        timestamp: new Date()
    }
];

export default function AIChatScreen() {
    const { colors } = useTheme();
    const { tripInfo } = useTravelContext();
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const scrollViewRef = useRef();

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg = {
            id: Date.now().toString(),
            text: inputText.trim(),
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        try {
            const aiResponse = await chatWithAssistant(userMsg.text, tripInfo);
            const aiMsg = {
                id: (Date.now() + 1).toString(),
                text: aiResponse,
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('Chat Error:', error);
            const errMsg = {
                id: Date.now().toString(),
                text: `Connection Error: ${error.message.substring(0, 150)}...`,
                sender: 'ai',
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const renderMessage = ({ item }) => (
        <View style={[
            styles.messageOuterContainer,
            item.sender === 'user' ? styles.userOuter : styles.aiOuter
        ]}>
            <View style={[
                styles.bubble,
                item.sender === 'user' ?
                    [styles.userBubble, { backgroundColor: colors.primary }] :
                    [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.primaryBorder }],
                item.isError && { borderColor: '#F87171', backgroundColor: '#FEF2F2' }
            ]}>
                <Text style={[
                    styles.messageText,
                    item.sender === 'user' ? styles.userText : { color: colors.text },
                    item.isError && { color: '#B91C1C' }
                ]}>
                    {item.text}
                </Text>
                <Text style={[
                    styles.timestamp,
                    item.sender === 'user' ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textMuted }
                ]}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
            {/* Ultra Premium Header */}
            <View style={[styles.header, { borderBottomColor: colors.primaryBorder }]}>
                <View style={styles.headerLeft}>
                    <View style={styles.aiRing}>
                        <View style={[styles.statusActive, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.avatarMini}>✨</Text>
                    </View>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.headerTitle}>PlanWitch Concierge</Text>
                        <View style={styles.statusLine}>
                            <Text style={styles.headerStatusText}>Intelligent Assistant</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.headerAction, { backgroundColor: colors.cardLight }]}
                    onPress={() => setMessages(INITIAL_MESSAGES)}
                >
                    <Icon name="delete" size={18} color={colors.textMuted} />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={scrollViewRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.chatScrollArea}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                ListFooterComponent={isTyping && (
                    <View style={styles.typingBlock}>
                        <View style={[styles.aiBubble, styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.primaryBorder }]}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    </View>
                )}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={[styles.inputContainer, { borderTopColor: colors.primaryBorder, backgroundColor: colors.card }]}>
                    <View style={[styles.inputBox, { backgroundColor: colors.bg, borderColor: colors.primaryBorder }]}>
                        <TextInput
                            style={[styles.textInput, { color: colors.text }]}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.textMuted}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxHeight={140}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendCircle,
                                { backgroundColor: inputText.trim() ? colors.primary : colors.textMuted + '30' }
                            ]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isTyping}
                        >
                            <Icon name="add" size={22} color={inputText.trim() ? "#FFF" : colors.textMuted} style={{ transform: [{ rotate: '45deg' }] }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    aiRing: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    statusActive: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    avatarMini: { fontSize: 22 },
    headerTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
    statusLine: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    headerStatusText: { fontSize: 13, color: '#10B981', fontWeight: '600' },
    headerAction: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    chatScrollArea: { paddingHorizontal: 20, paddingVertical: 30, paddingBottom: 50 },
    messageOuterContainer: { marginBottom: 28, maxWidth: '82%' },
    userOuter: { alignSelf: 'flex-end' },
    aiOuter: { alignSelf: 'flex-start' },

    bubble: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 24 },
    userBubble: {
        borderBottomRightRadius: 4,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    aiBubble: {
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },

    messageText: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
    userText: { color: '#FFFFFF', fontWeight: '500' },

    timestamp: { fontSize: 10, marginTop: 8, opacity: 0.8, textAlign: 'right', fontWeight: '500' },

    typingBlock: { marginBottom: 20, alignSelf: 'flex-start' },
    typingBubble: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 24 },

    inputContainer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderTopWidth: 1,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    textInput: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 8,
        fontSize: 16,
        maxHeight: 140,
        outlineStyle: 'none',
    },
    sendCircle: {
        width: 42,
        height: 42,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        marginBottom: 2
    },
});
