import type { System, ChatMessage, ToolCallPayload, DatabaseSchema, Record, ChartConfig, KanbanConfig } from '../types';

interface ApiRequestBody {
    // FIX: Add new actions to support Analytics and Kanban views
    action: 'getAiResponse' | 'generateChartAnalytics' | 'generateKanbanConfig';
    payload: any;
}

async function fetchFromApi<T>(action: ApiRequestBody['action'], payload: any): Promise<T> {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, payload }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || 'API request failed');
        }

        return response.json();
    } catch (error) {
        console.error(`Error during API call for action "${action}":`, error);
        throw error;
    }
}

export const getAiResponse = async (
    systemDocument: System,
    chatHistory: ChatMessage[]
): Promise<{ text?: string, toolCall?: ToolCallPayload }> => {
    return fetchFromApi('getAiResponse', { systemDocument, chatHistory });
};

// FIX: Add missing service functions for Analytics and Kanban views
export const generateChartAnalytics = async (schema: DatabaseSchema, records: Record[]): Promise<ChartConfig> => {
    return fetchFromApi('generateChartAnalytics', { schema, records });
};

export const generateKanbanConfig = async (schema: DatabaseSchema, records: Record[]): Promise<KanbanConfig> => {
    return fetchFromApi('generateKanbanConfig', { schema, records });
};
