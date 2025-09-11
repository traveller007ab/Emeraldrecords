import type { DatabaseSchema, Record, ChartConfig, ChatMessage, KanbanConfig, ToolCallPayload } from '../types';

interface ApiRequestBody {
    action: 'generateSchema' | 'generateChart' | 'chat' | 'generateKanban';
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


export const generateSchemaAndData = async (
  occupation: string,
  dataType: string
): Promise<{ schema: DatabaseSchema; sampleData: Record[]; tableName: string; sqlSchema: string; }> => {
    return fetchFromApi('generateSchema', { occupation, dataType });
};

export const generateChartAnalytics = async (
    schema: DatabaseSchema,
    records: Record[]
): Promise<ChartConfig> => {
    return fetchFromApi('generateChart', { schema, records });
}

export const generateKanbanConfig = async (
    schema: DatabaseSchema,
    records: Record[]
): Promise<KanbanConfig> => {
    return fetchFromApi('generateKanban', { schema, records });
}


export const getAiChatResponse = async (
    schema: DatabaseSchema,
    records: Record[],
    chatHistory: ChatMessage[]
): Promise<{ text?: string, toolCall?: ToolCallPayload }> => {
    return fetchFromApi('chat', { schema, records, chatHistory });
};