/* global TextDecoder */
import { fetch as expoFetch } from 'expo/fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AI_SERVICE_BASE_URL } from '../config/aiServiceConfig';

const SESSION_ID_KEY = 'ai_chat_session_id';

const generateId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const getOrCreateSessionId = async () => {
    const existing = await AsyncStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;

    const fresh = generateId();
    await AsyncStorage.setItem(SESSION_ID_KEY, fresh);
    return fresh;
};

export const resetSessionId = async () => {
    const fresh = generateId();
    await AsyncStorage.setItem(SESSION_ID_KEY, fresh);
    return fresh;
};

/**
 * Streams a chat turn from the ai-service /ai/chat endpoint (Server-Sent
 * Events). Replaces the old direct-to-Gemini call that lived in
 * AIChatScreen.js, which shipped the Gemini API key inside the app bundle.
 */
export const streamChat = async (
    { message, sessionId, tripContext, itinerary, userProfile },
    { onIntent, onText, onToolCall, onToolResult, onDone, onError } = {}
) => {
    const dispatch = (event) => {
        switch (event.type) {
            case 'intent':
                onIntent?.(event.intent);
                break;
            case 'text':
                onText?.(event.text);
                break;
            case 'tool_call':
                onToolCall?.(event.tool_name);
                break;
            case 'tool_result':
                onToolResult?.(event.tool_name);
                break;
            case 'done':
                onDone?.();
                break;
            default:
                break;
        }
    };

    try {
        const response = await expoFetch(`${AI_SERVICE_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                session_id: sessionId,
                trip_context: tripContext || {},
                itinerary: itinerary || [],
                user_profile: userProfile || {},
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error(`AI service returned ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let boundary;
            while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                const rawEvent = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 2);

                const dataLine = rawEvent
                    .split('\n')
                    .find((line) => line.startsWith('data:'));
                if (!dataLine) continue;

                const jsonText = dataLine.slice('data:'.length).trim();
                if (!jsonText) continue;

                try {
                    dispatch(JSON.parse(jsonText));
                } catch (parseError) {
                    console.warn('[aiChatService] Failed to parse SSE event:', parseError);
                }
            }
        }
    } catch (error) {
        console.error('[aiChatService] Stream failed:', error);
        onError?.(error);
    }
};
