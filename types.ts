export type ColumnType = 'text' | 'number' | 'date' | 'boolean';

export interface ColumnDefinition {
  id: string;
  name: string;
  type: ColumnType;
}

export type DatabaseSchema = ColumnDefinition[];

export interface Record {
  id: string;
  [key: string]: any;
}

export interface SurveyData {
    occupation: string;
    dataType: string;
}

export interface ChartConfig {
  chartType: 'bar';
  title: string;
  categoryColumnId: string;
}

export interface KanbanConfig {
  statusColumnId: string;
  cardTitleColumnId: string;
  cardDetailColumnIds: string[];
  statusColumnOrder: string[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export interface ToolCallPayload {
  name: 'addRecord' | 'updateRecord' | 'deleteRecord';
  args: { [key: string]: any };
  confirmationMessage: string;
}