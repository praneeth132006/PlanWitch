import React, { useRef, useEffect } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTravelContext } from '../context/TravelContext';
import { useChat } from '../context/ChatContext';
import Icon from './Icon';

function ChatFAB({ onPress, colors, insets }) {
    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={[
                styles.fab,
                {
                    backgroundColor: colors.primary,
                    bottom: insets.bottom + 24,
                    right: 20,
                    shadowColor: colors.primary,
                }
            ]}
        >
            <Text style={styles.fabIcon}>✨</Text>
        </TouchableOpacity>
    );
}

function ChatPanel({ onClose, colors, insets }) {
    const { tripInfo } = useTravelContext();
    const { messages, isTyping, sendMessage, resetChat } = useChat();
    const [inputText, setInputText] = React.useState('');
    const listRef = useRef();

    const handleSend = () => {
        if (!inputText.trim() || isTyping) return;
        const text = inputText.trim();
        setInputText('');
        sendMessage(text, tripInfo);
    };

    useEffect(() => {
        if (messages.length) {
            requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        }
    }, [messages.length, isTyping]);

    const renderMessage = ({ item }) => (
        <View style={[
            styles.messageOuterContainer,
            item.sender === 'user' ? styles.userOuter : styles.aiOuter
        ]}>
            <View style={[
                styles.bubble,
                item.sender === 'user'
                    ? [styles.userBubble, { backgroundColor: colors.primary }]
                    : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.primaryBorder }],
                item.isError && { borderColor: '#F87171', backgroundColor: '#FEF2F2' }
            ]}>
                <Text style={[
                    styles.messageText,
                    item.sender === 'user' ? styles.userText : { color: colors.text },
                    item.isError && { color: '#B91C1C' }
                ]}>
                    {item.text}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.panel, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
            <View style={[styles.header, { borderBottomColor: colors.primaryBorder }]}>
                <View style={styles.headerLeft}>
                    <View style={styles.aiRing}>
                        <Text style={styles.avatarMini}>✨</Text>
                    </View>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>PlanWitch Concierge</Text>
                        <Text style={styles.headerStatusText}>Intelligent Assistant</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.headerAction, { backgroundColor: colors.cardLight }]}
                        onPress={resetChat}
                    >
                        <Icon name="delete" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.headerAction, { backgroundColor: colors.cardLight, marginLeft: 10 }]}
                        onPress={onClose}
                    >
                        <Icon name="close" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={listRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.chatScrollArea}
                showsVerticalScrollIndicator={false}
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
                <View style={[styles.inputContainer, { borderTopColor: colors.primaryBorder, backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
                    <View style={[styles.inputBox, { backgroundColor: colors.bg, borderColor: colors.primaryBorder }]}>
                        <TextInput
                            style={[styles.textInput, { color: colors.text }]}
                            placeholder="Ask me anything about your trip..."
                            placeholderTextColor={colors.textMuted}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxHeight={120}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendCircle,
                                { backgroundColor: inputText.trim() ? colors.primary : colors.textMuted + '30' }
                            ]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isTyping}
                        >
                            <Icon name="add" size={22} color={inputText.trim() ? '#FFF' : colors.textMuted} style={{ transform: [{ rotate: '45deg' }] }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

export default function ChatWidget() {
    const { colors } = useTheme();
    const { isOpen, openChat, closeChat } = useChat();
    const insets = useSafeAreaInsets();

    if (!isOpen) {
        return <ChatFAB onPress={openChat} colors={colors} insets={insets} />;
    }

    return <ChatPanel onClose={closeChat} colors={colors} insets={insets} />;
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 999,
    },
    fabIcon: { fontSize: 26 },

    panel: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerActions: { flexDirection: 'row' },
    aiRing: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarMini: { fontSize: 22 },
    headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
    headerStatusText: { fontSize: 13, color: '#10B981', fontWeight: '600', marginTop: 2 },
    headerAction: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    chatScrollArea: { paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 30 },
    messageOuterContainer: { marginBottom: 20, maxWidth: '82%' },
    userOuter: { alignSelf: 'flex-end' },
    aiOuter: { alignSelf: 'flex-start' },

    bubble: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 24 },
    userBubble: { borderBottomRightRadius: 4 },
    aiBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },

    messageText: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
    userText: { color: '#FFFFFF', fontWeight: '500' },

    typingBlock: { marginBottom: 20, alignSelf: 'flex-start' },
    typingBubble: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 24 },

    inputContainer: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    textInput: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 8,
        fontSize: 16,
        maxHeight: 120,
        outlineStyle: 'none',
    },
    sendCircle: {
        width: 42,
        height: 42,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        marginBottom: 2,
    },
});
