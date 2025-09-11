import { GoogleGenAI, Type } from "@google-genai";
import type { Handler } from '@netlify/functions';
import type { DatabaseSchema, Record, ChartConfig, ChatMessage, KanbanConfig } from '../types';

// Securely read the API key from environment variables on the server.
const apiKey = process.env.API_KEY;
if (!apiKey) {
  // This error will be visible in the Netlify function logs if the key is not set.
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });


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
      case 'generateSchema':
        return handleGenerateSchema(payload);
      case 'generateChart':
        return handleGenerateChart(payload);
      case 'generateKanban':
        return handleGenerateKanban(payload);
      case 'chat':
        return handleChat(payload);
      default:
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' })};
    }
  } catch (error) {
    console.error("Error in API route:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  };
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
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
    };
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
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
    };
}


async function handleChat({ schema, records, chatHistory }: { schema: DatabaseSchema, records: Record[], chatHistory: ChatMessage[] }) {
    
    // --- Dynamically generate tool schemas based on the user's database schema ---
    const recordProperties: { [key: string]: { type: Type, description: string } } = {};
    schema.forEach(col => {
        let geminiType: Type = Type.STRING;
        if (col.type === 'number') geminiType = Type.NUMBER;
        if (col.type === 'boolean') geminiType = Type.BOOLEAN;
        recordProperties[col.id] = { type: geminiType, description: `Value for the '${col.name}' column.` };
    });

    const tools = [
      {
        functionDeclarations: [
          {
            name: "addRecord",
            description: "Adds a new record to the database. Ask for any missing required information first.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                recordData: {
                  type: Type.OBJECT,
                  properties: recordProperties
                },
                confirmationMessage: { type: Type.STRING, description: "A message asking the user to confirm the action. e.g. 'You want to add a new record for... is that correct?'" }
              },
              required: ["recordData", "confirmationMessage"]
            }
          },
          {
            name: "updateRecord",
            description: "Updates an existing record in the database. First, identify the unique record to update.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                recordId: { type: Type.STRING, description: "The unique ID of the record to update." },
                updates: { type: Type.OBJECT, properties: recordProperties, description: "An object with the key-value pairs to update." },
                confirmationMessage: { type: Type.STRING, description: "A message asking the user to confirm the action. e.g. 'You want to update the status for 'Record X' to 'Completed'. Is that correct?'" }
              },
              required: ["recordId", "updates", "confirmationMessage"]
            }
          },
          {
            name: "deleteRecord",
            description: "Deletes a record from the database. First, identify the unique record to delete.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                recordId: { type: Type.STRING, description: "The unique ID of the record to delete." },
                confirmationMessage: { type: Type.STRING, description: "A message asking the user to confirm the deletion. e.g. 'Are you sure you want to delete the record for 'Client X'?'" }
              },
              required: ["recordId", "confirmationMessage"]
            }
          },
          {
              name: 'getSummary',
              description: 'Analyzes the dataset to answer questions, calculate totals, averages, counts, or provide other insights.',
              parameters: {
                  type: Type.OBJECT,
                  properties: {
                      question: { type: Type.STRING, description: "The user's question about the data."}
                  },
                  required: ["question"]
              }
          }
        ]
      }
    ];

    const systemInstruction = `
        You are an AI Chat Assistant for an application called EmeraldRecords.
        Your purpose is to help users understand and manage their data through conversation by calling functions.

        - **Analyze the user's request**: Determine if they are asking a question or want to modify data (add, update, delete).
        - **Use Tools**:
          - If they want to modify data, call the appropriate function ('addRecord', 'updateRecord', 'deleteRecord'). You MUST provide a clear confirmation message.
          - If they are asking a question that requires calculation or analysis (e.g., "how many", "what is the total"), use the 'getSummary' tool.
          - For simple lookups (e.g., "what is the status of project X"), you can answer directly without a tool.
        - **Record Identification**: To update or delete, you must identify a record's unique 'id'. The primary text identifier is usually the first column: '${schema[0].name}' (id: '${schema[0].id}'). Use the user's description to find the corresponding record 'id' from the data.
        - **Clarification**: If a command is ambiguous (e.g., "update the record"), you MUST ask for more specific information before calling a tool.
        
        This is the database schema: ${JSON.stringify(schema)}
        This is ALL the current data: ${JSON.stringify(records)}
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: chatHistory,
        config: {
            systemInstruction,
            temperature: 0,
        },
        tools,
    });
    
    let resultBody: { text?: string; toolCall?: any } = {};
    const functionCalls = response.candidates?.[0]?.content?.parts
        .filter(part => !!part.functionCall)
        .map(part => part.functionCall);

    if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'getSummary') {
             // If the AI wants to analyze data, we let it generate a text response based on its tool output.
             // This is a simplified 1-step agent. A more complex agent would execute the summary and feed it back.
             resultBody.text = `I can analyze that for you. Based on the data, the answer to "${call.args.question}" is... (summary feature coming soon).`;
        } else {
            // For data modification, we create a tool call for the frontend to handle.
            resultBody.toolCall = {
                name: call.name,
                args: call.args,
                confirmationMessage: call.args.confirmationMessage || "Please confirm this action."
            };
        }
    } else {
        resultBody.text = response.text;
    }
    
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultBody)
    };
}