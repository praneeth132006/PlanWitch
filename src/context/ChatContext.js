import React, { createContext, useContext, useState } from 'react';
import { chatWithAssistant } from '../services/aiService';

const ChatContext = createContext(null);

const INITIAL_MESSAGES = [
    {
        id: 'welcome',
        text: "Hi! I'm your PlanWitch Assistant. ✨ How can I help with your trip today?",
        sender: 'ai',
        timestamp: new Date(),
    },
];

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [isTyping, setIsTyping] = useState(false);

    const openChat = () => setIsOpen(true);
    const closeChat = () => setIsOpen(false);
    const toggleChat = () => setIsOpen(prev => !prev);

    const resetChat = () => setMessages(INITIAL_MESSAGES);

    const sendMessage = async (text, tripInfo) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMsg = {
            id: Date.now().toString(),
            text: trimmed,
            sender: 'user',
            timestamp: new Date(),
        };

        const historyForCall = messages;
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        try {
            const reply = await chatWithAssistant(trimmed, historyForCall, tripInfo);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: reply,
                sender: 'ai',
                timestamp: new Date(),
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: `Sorry, I couldn't respond just now (${error.message.substring(0, 100)}). Please try again.`,
                sender: 'ai',
                timestamp: new Date(),
                isError: true,
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const value = {
        isOpen,
        openChat,
        closeChat,
        toggleChat,
        messages,
        isTyping,
        sendMessage,
        resetChat,
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};
