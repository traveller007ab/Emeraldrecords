// FIX: Use the correct package name '@google/genai' as per the guidelines
import { GoogleGenAI, Type } from "@google/genai";
import type { Handler } from '@netlify/functions';
// FIX: Import missing types
import type { System, ChatMessage, DatabaseSchema, Record } from '../types';

// Securely read the API key from environment variables on the server.
const apiKey = process.env.API_KEY;
if (!apiKey) {
  // This error will be visible in the Netlify function logs if the key is not set.
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

// --- Schema definition for the `updateSystem` tool ---
const systemToolSchema = {
    type: Type.OBJECT,
    properties: {
        updatedSystem: {
            type: Type.OBJECT,
            description: "The complete, modified system object. You must provide the entire object, not just the changed parts.",
            properties: {
                name: { type: Type.STRING, description: "The name of the system." },
                type: { type: Type.STRING, description: "The type of system." },
                description: { type: Type.STRING },
                version: { type: Type.NUMBER, description: "Increment the version number for each change." },
                parent_version: { type: Type.NUMBER, description: "The version number this change is based on." },
                components: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "A unique identifier for the component, e.g., 'comp-uuid-1'." },
                            name: { type: Type.STRING },
                            category: { type: Type.STRING, description: "Must be 'core', 'subcore', or 'auxiliary'." },
                            attributes: { type: Type.OBJECT, description: "A key-value map of component attributes." },
                            connections: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of component IDs it connects to." }
                        }
                    }
                },
                logic: {
                    type: Type.OBJECT,
                    properties: {
                        rules: { type: Type.ARRAY, items: { type: Type.STRING } },
                        workflow: { type: Type.ARRAY, items: { type: Type.OBJECT } }
                    }
                },
                calculations: {
                    type: Type.OBJECT,
                    properties: {
                        math_engine: { type: Type.STRING },
                        equations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        results: { type: Type.OBJECT }
                    }
                },
                diagram: {
                    type: Type.OBJECT,
                    properties: {
                        nodes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    label: { type: Type.STRING }
                                }
                            }
                        },
                        edges: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    from: { type: Type.STRING },
                                    to: { type: Type.STRING },
                                    type: { type: Type.STRING }
                                }
                            }
                        }
                    }
                },
                metadata: {
                    type: Type.OBJECT,
                    properties: {
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        domain: { type: Type.STRING, description: "Must be one of: 'engineering', 'finance', 'ai', 'trading', 'design', 'other'." },
                        author: { type: Type.STRING },
                        notes: { type: Type.STRING }
                    }
                }
            }
        },
        confirmationMessage: {
            type: Type.STRING,
            description: "A clear, user-friendly message asking the user to confirm the proposed change. E.g., 'It looks like you want to add a new 'Boiler' component. Is that correct?'"
        }
    },
    required: ["updatedSystem", "confirmationMessage"]
};

// --- Handler for incoming requests from the frontend ---
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }) };
    }
    const { action, payload } = JSON.parse(event.body);

    switch (action) {
      case 'getAiResponse':
        return handleAiResponse(payload);
      // FIX: Add handlers for new actions
      case 'generateChartAnalytics':
        return handleGenerateChartAnalytics(payload);
      case 'generateKanbanConfig':
        return handleGenerateKanbanConfig(payload);
      default:
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' })};
    }
  } catch (error) {
    console.error("Error in API route:", error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { statusCode: 500, body: JSON.stringify({ error: `Internal Server Error: ${message}` }) };
  }
};

async function handleAiResponse({ systemDocument, chatHistory }: { systemDocument: System, chatHistory: ChatMessage[] }) {
    
    const tools = [{
        functionDeclarations: [{
            name: "updateSystem",
            description: "Modifies the system document based on the user's request. Always increment the version number.",
            parameters: systemToolSchema,
        }]
    }];

    const systemInstruction = `
        You are an AI system architect. Your goal is to help the user model a complex system by modifying a JSON document.
        The user will describe a change, and you will call the 'updateSystem' function with the new, complete JSON object.

        **Core Rules:**
        1.  **Full Document Update**: You MUST provide the entire, updated system document in the 'updatedSystem' argument. Do not provide only the changed parts.
        2.  **Immutability**: Treat the input JSON as immutable. Generate a new version of it with the requested modifications.
        3.  **Version Increment**: You MUST increment the 'version' number by 1 for every change. The 'parent_version' should be the version number from the input document.
        4.  **ID Generation**: For new components or diagram nodes, you MUST generate a new, unique, and descriptive ID (e.g., 'comp-boiler-1', 'node-turbine').
        5.  **Confirmation**: You MUST create a clear, concise confirmation message for the user.
        6.  **Clarification**: If the user's request is ambiguous, do not call the tool. Instead, ask clarifying questions as a text response.
        7.  **Preserve Data**: Do not delete or alter parts of the JSON that the user did not ask to change.
        
        The user's current system document is:
        ${JSON.stringify(systemDocument)}
    `;

    // FIX: Map chat history to the format expected by the Gemini API
    const contents = chatHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
            systemInstruction,
            temperature: 0.1,
        },
        tools,
    });
    
    let resultBody: { text?: string; toolCall?: any } = {};
    const functionCalls = response.candidates?.[0]?.content?.parts
        .filter(part => !!part.functionCall)
        .map(part => part.functionCall);

    if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        resultBody.toolCall = {
            name: call.name,
            args: call.args,
        };
    } else {
        resultBody.text = response.text;
    }
    
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultBody)
    };
}

// FIX: Add handler for generating chart analytics
async function handleGenerateChartAnalytics({ schema, records }: { schema: DatabaseSchema, records: Record[] }) {
    const chartConfigSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "A descriptive title for the chart. e.g., 'Record Count by Status'." },
            categoryColumnId: { type: Type.STRING, description: "The ID of the column that should be used for the chart's categories (x-axis). This should be a column with a limited number of unique values, like a 'status' or 'type' column." },
        },
        required: ['title', 'categoryColumnId'],
    };

    const systemInstruction = `
        You are a data analyst. Your task is to analyze the provided database schema and a sample of records to suggest a good bar chart configuration.
        Identify a column that is suitable for categorization (e.g., a 'status', 'type', or 'priority' column with a limited number of distinct string values).
        Based on this, create a chart configuration.
        
        Database Schema:
        ${JSON.stringify(schema)}

        Sample Records (first 5):
        ${JSON.stringify(records.slice(0, 5))}
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Generate a chart configuration for the provided data.",
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: chartConfigSchema,
            temperature: 0,
        },
    });

    const config = JSON.parse(response.text);

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    };
}

// FIX: Add handler for generating Kanban board configuration
async function handleGenerateKanbanConfig({ schema, records }: { schema: DatabaseSchema, records: Record[] }) {
    const kanbanConfigSchema = {
        type: Type.OBJECT,
        properties: {
            statusColumnId: { type: Type.STRING, description: "The ID of the column that represents the Kanban status (e.g., 'status', 'stage'). This column should contain values like 'To Do', 'In Progress', 'Done'." },
            cardTitleColumnId: { type: Type.STRING, description: "The ID of the column that should be used as the title for each Kanban card (e.g., 'task_name', 'client_name')." },
            cardDetailColumnIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 1 to 3 column IDs to show as details on the Kanban card." },
            statusColumnOrder: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of the unique status values from the status column, in a logical order (e.g., ['To Do', 'In Progress', 'Done'])." },
        },
        required: ['statusColumnId', 'cardTitleColumnId', 'cardDetailColumnIds', 'statusColumnOrder'],
    };

    const potentialStatusCols = schema.filter(c => c.type === 'select' || (c.name.toLowerCase().includes('status') || c.name.toLowerCase().includes('stage')));
    const uniqueStatusValues: { [key: string]: string[] } = {};
    if (records.length > 0) {
        for (const col of potentialStatusCols) {
            const values = Array.from(new Set(records.map(r => r[col.id]?.toString()).filter(Boolean)));
            if (values.length > 1 && values.length < 10) { 
                uniqueStatusValues[col.id] = values;
            }
        }
    }

    const systemInstruction = `
        You are an AI assistant that configures Kanban boards. Your task is to analyze a database schema and sample records to determine the best columns for a Kanban board.

        1.  **Identify Status Column**: Find a column that represents the status or stage of a record. This is the most important step. Common names are 'status', 'stage', 'progress'. The column should have a small number of distinct values.
        2.  **Identify Title Column**: Find a column suitable for the card title, like a name or summary.
        3.  **Identify Detail Columns**: Select 1 to 3 other important columns to display on the card.
        4.  **Order Statuses**: Determine a logical workflow order for the values in the status column.

        Database Schema:
        ${JSON.stringify(schema)}
        
        Potential Status Columns and their unique values found in the data:
        ${JSON.stringify(uniqueStatusValues)}

        Sample Records (first 5):
        ${JSON.stringify(records.slice(0, 5))}
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Generate a Kanban board configuration for the provided data.",
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: kanbanConfigSchema,
            temperature: 0,
        },
    });

    const config = JSON.parse(response.text);

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    };
}
