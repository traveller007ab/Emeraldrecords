import { GoogleGenAI, Type } from "@google/genai";
import type { Handler } from '@netlify/functions';
import type { ChatMessage, DatabaseSchema, Record, ColumnDefinition } from '../types';

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

// Maps our app's data types to the types Gemini understands for schema definitions
const mapTypeToGemini = (type: ColumnDefinition['type']): Type => {
    switch(type) {
        case 'number': return Type.NUMBER;
        case 'boolean': return Type.BOOLEAN;
        case 'date':
        case 'select':
        case 'string':
        default:
            return Type.STRING;
    }
};

// Dynamically builds a tool schema for Gemini based on the database table's schema
const buildTools = (schema: DatabaseSchema) => {
    const recordProperties = schema.reduce((acc, col) => {
        // Exclude read-only fields from create/update tools
        if (col.id !== 'id' && col.id !== 'created_at') {
            acc[col.id] = { type: mapTypeToGemini(col.type), description: col.name };
        }
        return acc;
    }, {} as { [key: string]: { type: Type, description: string } });

    return [{
        functionDeclarations: [
            {
                name: "createRecord",
                description: "Creates a new record in the table.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        record: { type: Type.OBJECT, properties: recordProperties },
                        confirmationMessage: { type: Type.STRING, description: "A message confirming the action to the user." }
                    },
                    required: ["record", "confirmationMessage"]
                },
            },
            {
                name: "updateRecord",
                description: "Updates an existing record in the table using its ID.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        recordId: { type: Type.STRING, description: "The ID of the record to update." },
                        record: { type: Type.OBJECT, description: "An object with the fields to update.", properties: recordProperties },
                        confirmationMessage: { type: Type.STRING, description: "A message confirming the action to the user." }
                    },
                    required: ["recordId", "record", "confirmationMessage"]
                },
            },
            {
                name: "deleteRecord",
                description: "Deletes a record from the table using its ID.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        recordId: { type: Type.STRING, description: "The ID of the record to delete." },
                        confirmationMessage: { type: Type.STRING, description: "A message confirming the action to the user." }
                    },
                    required: ["recordId", "confirmationMessage"]
                },
            },
        ]
    }];
};

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
      case 'generateDatabaseSchema':
        return handleGenerateDatabaseSchema(payload);
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

async function handleAiResponse({ tableName, schema, chatHistory }: { tableName: string, schema: DatabaseSchema, chatHistory: ChatMessage[] }) {
    
    const tools = buildTools(schema);

    const systemInstruction = `
        You are an AI assistant that helps users manage their data in a table named "${tableName}".
        The user will describe a change, and you will call the appropriate function ('createRecord', 'updateRecord', 'deleteRecord').

        **Core Rules:**
        1.  **Tool Use**: You MUST use the provided tools to perform any data modification. Do not just respond with text.
        2.  **Confirmation**: You MUST create a clear, concise confirmation message for the user for every tool call.
        3.  **Clarification**: If the user's request is ambiguous (e.g., they ask to delete a record without specifying an ID), ask clarifying questions instead of calling a tool.
        4.  **Schema Adherence**: The data you provide in tool calls MUST match the schema.
        
        The schema for the "${tableName}" table is:
        ${JSON.stringify(schema, null, 2)}
    `;

    const contents = chatHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
    }));

    // FIX: Moved `tools` into the `config` object.
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: { systemInstruction, temperature: 0.1, tools },
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


async function handleGenerateDatabaseSchema({ occupation, dataType }: { occupation: string, dataType: string }) {
    const schemaDefinition = {
        type: Type.OBJECT,
        properties: {
            tableName: { type: Type.STRING, description: "A simple, plural, lowercase table name derived from the data type (e.g., 'tasks', 'clients', 'properties')." },
            schema: {
                type: Type.ARRAY,
                description: "The array of column definitions for the table.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: "The lowercase, snake_case column name (e.g., 'client_name', 'due_date')." },
                        name: { type: Type.STRING, description: "A user-friendly, title-cased name (e.g., 'Client Name', 'Due Date')." },
                        type: { type: Type.STRING, description: "The data type. Must be one of: 'string', 'number', 'boolean', 'date', 'select'." },
                        options: { type: Type.ARRAY, description: "If type is 'select', provide an array of string options.", items: { type: Type.STRING } }
                    }
                }
            },
            sql: { type: Type.STRING, description: "The full PostgreSQL CREATE TABLE statement and all associated policies and helper functions." }
        },
        required: ["tableName", "schema", "sql"]
    };

    const prompt = `
        Design a database table for a ${occupation} who needs to manage ${dataType}.

        **Requirements:**
        1.  **Table Name**: Generate a simple, plural, lowercase table name (e.g., 'tasks', 'clients').
        2.  **Columns**:
            *   Include an 'id' column: \`id uuid NOT NULL DEFAULT gen_random_uuid()\`.
            *   Include a 'created_at' column: \`created_at timestamp with time zone NOT NULL DEFAULT now()\`.
            *   Create 5-7 other relevant columns based on the user's needs. Use appropriate PostgreSQL types (text, int, numeric, boolean, date).
            *   For columns that represent a status, stage, or category, suggest 3-5 sensible default options.
        3.  **Schema JSON**: Create a JSON array of column definitions matching the specified schema format.
        4.  **SQL Generation**: Generate a complete PostgreSQL script that does the following in order:
            *   Creates the table with the defined columns and sets the primary key on the 'id'.
            *   Enables Row Level Security (RLS) on the table.
            *   Creates a permissive policy that allows anonymous users full access. Name it "Enable access for anon users".
            *   Creates the three required helper functions for the application to interact with the database.

        **Helper Functions SQL:**
        \`\`\`sql
        -- Helper 1: Function to execute raw SQL (needed for table creation)
        CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
        RETURNS void LANGUAGE plpgsql AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$;
        
        -- Helper 2: Function to list all user-created tables
        CREATE OR REPLACE FUNCTION public.list_all_tables()
        RETURNS TABLE(schema text, name text)
        LANGUAGE sql AS $$
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE';
        $$;

        -- Helper 3: Function to get the schema of a specific table
        CREATE OR REPLACE FUNCTION public.get_table_schema(table_name_arg text)
        RETURNS TABLE(column_name text, data_type text)
        LANGUAGE sql AS $$
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = table_name_arg;
        $$;
        \`\`\`
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schemaDefinition,
            temperature: 0.2,
        },
    });

    const result = JSON.parse(response.text);

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
    };
}


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