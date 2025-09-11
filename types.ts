// Generic Database Types
export interface ColumnDefinition {
  id: string; // The actual column name in the database
  name: string; // A user-friendly name for the column
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  options?: string[]; // For 'select' type
}

export type DatabaseSchema = ColumnDefinition[];

export interface Record {
  id: string; // Assumes a unique 'id' column on each table
  created_at: string;
  [key: string]: any;
}

// Search and Filter Types
export type FilterOperator = 'EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'NOT_EQUALS';

export interface Filter {
  columnId: string;
  operator: FilterOperator;
  value: any;
}


// AI Interaction Types
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ToolCallPayload {
  name: 'createRecord' | 'updateRecord' | 'deleteRecord' | 'searchRecords';
  args: {
    record?: Partial<Omit<Record, 'id' | 'created_at'>>;
    recordId?: string;
    filters?: Filter[];
    confirmationMessage?: string; // Optional for search
    responseMessage?: string; // For search results
  };
}

// AI-Generated Config Types
export interface ChartConfig {
  title: string;
  categoryColumnId: string;
}

export interface KanbanConfig {
  statusColumnId: string;
  cardTitleColumnId: string;
  cardDetailColumnIds: string[];
  statusColumnOrder: string[];
}

export interface GeneratedSchema {
    tableName: string;
    schema: DatabaseSchema;
    sql: string;
}