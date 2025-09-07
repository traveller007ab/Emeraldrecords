import { GoogleGenAI, Type } from "@google/genai";
import type { DatabaseSchema, Record, ChartConfig, ChatMessage } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schemaResponseSchema = {
  type: Type.OBJECT,
  properties: {
    schema: {
      type: Type.ARRAY,
      description: "The database table schema.",
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
      description: "A JSON string of an array of 3 realistic sample records. The keys in each record object MUST match the 'id' values from the generated schema.",
    }
  },
  required: ["schema", "sampleDataJson"]
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

export const generateSchemaAndData = async (
  occupation: string,
  dataType: string
): Promise<{ schema: DatabaseSchema; sampleData: Record[] }> => {
  const prompt = `
    You are an expert database designer creating a tailored schema for a user.
    The user's occupation is: "${occupation}".
    The type of data they want to manage is: "${dataType}".

    Based on this, design a simple and effective database table schema.
    1.  The schema should be an array of column objects.
    2.  Each column object must have an 'id' (a machine-readable camelCase key), a 'name' (a human-readable label), and a 'type' ('text', 'number', 'date', or 'boolean').
    3.  Generate a JSON string for a property called "sampleDataJson". This string must be a valid JSON array of 3 realistic and diverse example objects that fit this schema. The keys in each record object MUST match the 'id' values from your generated schema.
    4. Ensure the first column is a descriptive primary identifier for the data (e.g., 'Project Name', 'Client Name', 'Student ID').
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schemaResponseSchema,
        temperature: 0.2,
      },
    });

    const jsonString = response.text;
    const parsedData = JSON.parse(jsonString);

    // Parse the sampleDataJson string
    const sampleData = JSON.parse(parsedData.sampleDataJson);

    // Add a unique ID to each sample record for React keys
    const dataWithIds = sampleData.map((record: Record, index: number) => ({
        ...record,
        id: `record_${Date.now()}_${index}`
    }));

    return {
        schema: parsedData.schema,
        sampleData: dataWithIds,
    };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate schema from API.");
  }
};

export const generateChartAnalytics = async (
    schema: DatabaseSchema,
    records: Record[]
): Promise<ChartConfig> => {
    const textColumns = schema.filter(col => col.type === 'text').map(col => `'${col.id}'`).join(', ');
    const recordsSample = JSON.stringify(records.slice(0, 10)); // Use a sample to avoid large prompts

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

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: chartConfigResponseSchema,
                temperature: 0.3,
            }
        });
        const jsonString = response.text;
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error calling Gemini API for chart analytics:", error);
        throw new Error("Failed to generate chart analytics from API.");
    }
}


export const getAiChatResponse = async (
    schema: DatabaseSchema,
    records: Record[],
    chatHistory: ChatMessage[]
): Promise<string> => {
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

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.1,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for AI Chat:", error);
        throw new Error("Failed to get response from AI assistant.");
    }
};
