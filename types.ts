// Base interfaces matching the provided JSON structure
export interface Component {
  id: string;
  name: string;
  category: 'core' | 'subcore' | 'auxiliary';
  attributes: { [key: string]: any };
  connections: string[];
}

export interface LogicRule {
  step: number;
  action: string;
  [key: string]: any;
}

export interface Logic {
  rules: string[];
  workflow: LogicRule[];
}

export interface Calculations {
  math_engine: string;
  equations: string[];
  results: { [key: string]: string };
}

export interface DiagramNode {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  type: string;
}

export interface Diagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface Metadata {
  tags: string[];
  domain: 'engineering' | 'finance' | 'ai' | 'trading' | 'design' | 'other';
  author: string;
  notes: string;
}

export interface System {
  id: string;
  name: string;
  type: string;
  description: string;
  created_at: string;
  updated_at: string;
  version: number;
  parent_version: number | null;
  components: Component[];
  logic: Logic;
  calculations: Calculations;
  diagram: Diagram;
  metadata: Metadata;
}

// AI Interaction Types
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ToolCallPayload {
  name: 'updateSystem';
  args: {
    updatedSystem: System;
    confirmationMessage: string;
  };
}

// FIX: Add missing types for Analytics and Kanban views
export type ColumnDefinition = {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  options?: string[];
};

export type DatabaseSchema = ColumnDefinition[];

export type Record = {
  id: string;
  [key: string]: any;
};

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
