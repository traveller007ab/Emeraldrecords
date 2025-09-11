import type { ChatMessage, ToolCallPayload, DatabaseSchema, Record, ChartConfig, KanbanConfig, GeneratedSchema } from '../types';

interface ApiRequestBody {
    action: 'getAiResponse' | 'generateDatabaseSchema' | 'generateChartAnalytics' | 'generateKanbanConfig';
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
    tableName: string,
    schema: DatabaseSchema,
    chatHistory: ChatMessage[]
): Promise<{ text?: string, toolCall?: ToolCallPayload }> => {
    return fetchFromApi('getAiResponse', { tableName, schema, chatHistory });
};

export const generateDatabaseSchema = async (occupation: string, dataType: string): Promise<GeneratedSchema> => {
    return fetchFromApi('generateDatabaseSchema', { occupation, dataType });
};

export const generateChartAnalytics = async (schema: DatabaseSchema, records: Record[]): Promise<ChartConfig> => {
    return fetchFromApi('generateChartAnalytics', { schema, records });
};

export const generateKanbanConfig = async (schema: DatabaseSchema, records: Record[]): Promise<KanbanConfig> => {
    return fetchFromApi('generateKanbanConfig', { schema, records });
};