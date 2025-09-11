import { GoogleGenAI, Type } from "@google/genai";
import type { DatabaseSchema, Record, ChartConfig, ChatMessage, KanbanConfig } from '../types';

// This function will be deployed as a serverless function (e.g., on Vercel or Netlify).
// It reads the API key from environment variables on the server, keeping it secure.
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- Schema definitions for Gemini's JSON mode ---

const schemaResponseSchema = {
  type: Type.OBJECT,
  properties: {
    tableName: {
      type: Type.STRING,
      description: "A database-friendly, plural, snake_case table name for the data (e.g., 'client_photoshoots')."
    },
    sqlSchema: {
      type: Type.STRING,
      description: "The full 'CREATE TABLE' SQL statement for Postgres."
    },
    schema: {
      type: Type.ARRAY,
      description: "The database table schema as a JSON array.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: "A unique, machine-readable key for the column in camelCase (e.g., 'firstName')."
          },
          name: {
            type: Type.STRING,
            description: "A human-readable label for the column (e.g., 'First Name')."
          },
          type: {
            type: Type.STRING,
            description: "The data type. Must be one of: 'text', 'number', 'date', or 'boolean'."
          }
        },
        required: ["id", "name", "type"]
      }
    },
    sampleDataJson: {
      type: Type.STRING,
      description: "A JSON string of an array of 3 realistic sample records. The keys in each record object MUST match the 'id' values from the generated JSON schema.",
    }
  },
  required: ["tableName", "sqlSchema", "schema", "sampleDataJson"]
};

const chartConfigResponseSchema = {
    type: Type.OBJECT,
    properties: {
        chartType: { type: Type.STRING, description: "The type of chart. Must be 'bar'."},
        title: { type: Type.STRING, description: "A concise and insightful title for the chart."},
        categoryColumnId: { type: Type.STRING, description: "The 'id' of the column that should be used for the chart's categories (x-axis). This must be a 'text' type column."}
    },
    required: ["chartType", "title", "categoryColumnId"]
};

const kanbanConfigResponseSchema = {
    type: Type.OBJECT,
    properties: {
        statusColumnId: { type: Type.STRING, description: "The 'id' of the 'text' column that best represents the status or stage of a record (e.g., 'status', 'progress')." },
        cardTitleColumnId: { type: Type.STRING, description: "The 'id' of the column that should be the main title of the Kanban card. This is usually the primary descriptive field." },
        cardDetailColumnIds: {
            type: Type.ARRAY,
            description: "An array of 1 to 2 column 'id's that provide useful secondary details for the card.",
            items: { type: Type.STRING }
        },
        statusColumnOrder: {
            type: Type.ARRAY,
            description: "An array of the unique string values from the status column, ordered in a logical workflow sequence (e.g., ['To Do', 'In Progress', 'Done']).",
            items: { type: Type.STRING }
        }
    },
    required: ["statusColumnId", "cardTitleColumnId", "cardDetailColumnIds", "statusColumnOrder"]
};


// --- Handler for incoming requests from the frontend ---

export const POST = async (req: Request) => {
  try {
    const { action, payload } = await req.json();

    switch (action) {
      case 'generateSchema':
        return handleGenerateSchema(payload);
      case 'generateChart':
        return handleGenerateChart(payload);
      case 'generateKanban':
        return handleGenerateKanban(payload);
      case 'chat':
        return handleChat(payload);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }
  } catch (error) {
    console.error("Error in API route:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
};


// --- Action-specific handlers ---

async function handleGenerateSchema({ occupation, dataType }: { occupation: string, dataType: string }) {
   const prompt = `
    You are an expert database designer creating a tailored schema for a user to use with a Postgres database (Supabase).
    The user's occupation is: "${occupation}".
    The type of data they want to manage is: "${dataType}".

    Based on this, design a simple and effective database table schema and generate the corresponding SQL CREATE TABLE statement.
    Your response must be a single JSON object.

    1.  **tableName**: Generate a database-friendly, plural, snake_case table name (e.g., 'client_photoshoots', 'property_listings').
    2.  **schema**: Generate a JSON schema as an array of column objects. Each object must have an 'id' (camelCase key), a 'name' (human-readable label), and a 'type' ('text', 'number', 'date', or 'boolean'). The first column should be a descriptive primary identifier.
    3.  **sqlSchema**: Generate the full SQL "CREATE TABLE" statement for Postgres.
        - The table name must match the 'tableName' you generated.
        - It MUST include an 'id' column of type UUID as the PRIMARY KEY with a default of gen_random_uuid().
        - It MUST include a 'created_at' column of type TIMESTAMPTZ with a default of now().
        - For the other columns from your JSON schema, map their types as follows: 'text' -> TEXT, 'number' -> NUMERIC, 'date' -> DATE, 'boolean' -> BOOLEAN.
        - Column names in the SQL schema should be snake_case versions of the JSON schema 'id's (e.g., 'firstName' becomes 'first_name').
    4.  **sampleDataJson**: Generate a JSON string of an array of 3 realistic and diverse sample records that fit this schema. Do not include 'id' or 'created_at' fields in the sample data objects, as the database will generate them.
  `;
  
  const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schemaResponseSchema,
        temperature: 0.2,
      },
  });

  const parsedData = JSON.parse(response.text);
  const sampleData = JSON.parse(parsedData.sampleDataJson);

  const result = {
      schema: parsedData.schema,
      sampleData: sampleData,
      tableName: parsedData.tableName,
      sqlSchema: parsedData.sqlSchema,
  };

  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
}

async function handleGenerateChart({ schema, records }: { schema: DatabaseSchema, records: Record[] }) {
    const textColumns = schema.filter(col => col.type === 'text').map(col => `'${col.id}'`).join(', ');
    const recordsSample = JSON.stringify(records.slice(0, 10));

    const prompt = `
        You are a data analyst. Based on the provided database schema and a sample of records, suggest the most insightful bar chart configuration.
        The goal is to visualize the distribution of data in a categorical column.

        Schema: ${JSON.stringify(schema)}
        Records sample: ${recordsSample}

        1. Choose the best 'text' column for a categorical analysis. Good candidates are columns representing status, type, category, etc. Avoid columns with unique identifiers or free-form text.
        2. From these available 'text' column IDs: ${textColumns}.
        3. Create an insightful title for the chart based on the chosen column.
        4. Your response MUST be a JSON object matching the required schema.
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: chartConfigResponseSchema,
            temperature: 0.3,
        }
    });
    
    const result = JSON.parse(response.text);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
}

async function handleGenerateKanban({ schema, records }: { schema: DatabaseSchema, records: Record[] }) {
    const recordsSample = records.slice(0, 25);

    const prompt = `
      You are a UI configuration expert. Your task is to analyze a database schema and sample records to determine the best configuration for a Kanban board.

      Database Schema: ${JSON.stringify(schema)}
      Sample Records: ${JSON.stringify(recordsSample)}

      Instructions:
      1.  **statusColumnId**: Identify the single 'text' column that best represents a workflow status (e.g., 'status', 'progress', 'stage'). This column should have a limited number of repeating values that represent distinct stages.
      2.  **statusColumnOrder**: After identifying the status column, find all of its unique values from the sample records. Return these unique values as an array of strings, sorted in a logical progression that makes sense for a workflow (e.g., from start to finish, like ["To Do", "In Progress", "Done"]).
      3.  **cardTitleColumnId**: Identify the single column that serves as the best title for a Kanban card. This is typically the primary identifier of the record, like a name, title, or task description.
      4.  **cardDetailColumnIds**: Select 1 or 2 other columns that provide useful, concise context on the card. Good candidates are dates, assignees, or priority levels. Do not select the status or title column again.

      Your response must be a single JSON object matching the required schema.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: kanbanConfigResponseSchema,
            temperature: 0.2,
        },
    });

    const result = JSON.parse(response.text);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
}


async function handleChat({ schema, records, chatHistory }: { schema: DatabaseSchema, records: Record[], chatHistory: ChatMessage[] }) {
    const latestMessage = chatHistory[chatHistory.length - 1].content;
    const historyForPrompt = chatHistory.map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `
        You are an AI Chat Assistant for an application called EmeraldRecords.
        Your purpose is to help users understand and manage their data through conversation.

        You have two primary capabilities:
        1.  **Answering Questions**: Provide conversational, insightful answers based on the user's data. You can perform calculations like sum, average, count, etc.
        2.  **Proposing Edits**: Propose changes to records based on user commands.

        **RULES for Proposing Edits:**
        - When the user asks to update, change, or set a value for a specific record, you MUST respond ONLY with a JSON object string.
        - The JSON object must have this exact structure: {"action": "PROPOSE_UPDATE", "payload": {"recordId": "...", "updates": {"columnIdToUpdate": "newValue", ...}, "confirmationMessage": "..."}}
        - 'confirmationMessage' MUST be a clear, human-readable question confirming the action. For example: "Just to confirm, you want to change the status for 'Record X' to 'Completed'. Is that correct?"
        - To find the 'recordId', you must first identify the correct record in the provided data. Users will refer to records by a descriptive field (like a name or title). The FIRST column in the schema ('${schema[0].id}') is the most likely identifier. Match the user's description to the value in that column. If you find a match, use that record's "id" property for the "recordId" field in your JSON response.
        - The 'updates' object should contain key-value pairs where the key is the 'columnId' from the schema and the value is the new value the user provided.
        - If the user's command is ambiguous or you cannot confidently identify the record or the change, ask for clarification instead of outputting JSON.

        **RULES for Answering Questions:**
        - If the user's message is a question or a statement not related to editing data, provide a helpful, conversational response as a plain text string. Do NOT output JSON.

        Here is the database schema:
        ${JSON.stringify(schema)}

        Here is all the current data:
        ${JSON.stringify(records)}

        Here is the conversation history so far (user messages are from the human, model messages are your previous replies):
        ${historyForPrompt}

        ---
        User's latest message: "${latestMessage}"
        ---

        Your response:
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            temperature: 0.1,
        },
    });
    
    return new Response(JSON.stringify({ response: response.text }), { headers: { 'Content-Type': 'application/json' } });
}