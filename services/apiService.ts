import { getSupabaseClient } from './supabaseClient';
import type { Record, DatabaseSchema, ColumnDefinition } from '../types';

const EXCLUDED_SCHEMAS = ['pg_catalog', 'information_schema', 'storage', 'graphql', 'graphql_public', 'realtime'];

export const listTables = async (): Promise<string[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('list_all_tables');

    if (error) {
        console.error("Supabase listTables error:", error);
        throw error;
    }
    return data
        .filter((t: { schema: string }) => !EXCLUDED_SCHEMAS.includes(t.schema))
        .map((t: { name: string }) => t.name);
};


export const getTableSchema = async (tableName: string): Promise<DatabaseSchema> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_table_schema', { table_name_arg: tableName });

    if (error) {
        console.error("Supabase getTableSchema error:", error);
        throw error;
    }
    
    // Map the RPC result to our ColumnDefinition type
    return data.map((col: any): ColumnDefinition => ({
        id: col.column_name,
        name: col.column_name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), // Prettify name
        type: mapPostgresTypeToAppType(col.data_type),
    }));
};

const mapPostgresTypeToAppType = (postgresType: string): ColumnDefinition['type'] => {
    switch(postgresType) {
        case 'text':
        case 'character varying':
            return 'string';
        case 'integer':
        case 'bigint':
        case 'numeric':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'timestamp with time zone':
        case 'date':
            return 'date';
        default:
            return 'string';
    }
}


export const getRecords = async (tableName: string): Promise<Record[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(`Supabase getRecords for ${tableName} error:`, error);
        throw error;
    }
    return data;
};

export const createRecord = async (tableName: string, newRecord: Omit<Record, 'id' | 'created_at'>): Promise<Record> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(tableName)
        .insert(newRecord)
        .select()
        .single();
    if (error) {
        console.error(`Supabase createRecord for ${tableName} error:`, error);
        throw error;
    }
    return data;
}

export const updateRecord = async (tableName: string, recordId: string, updates: Partial<Omit<Record, 'id'>>): Promise<Record> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', recordId)
        .select()
        .single();
    if (error) {
        console.error(`Supabase updateRecord for ${tableName} error:`, error);
        throw error;
    }
    return data;
};

export const deleteRecord = async (tableName: string, recordId: string): Promise<void> => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', recordId);
    if (error) {
        console.error(`Supabase deleteRecord for ${tableName} error:`, error);
        throw error;
    }
};

export const runRawSql = async (sql: string): Promise<void> => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
    if (error) {
        console.error("Supabase runRawSql error:", error);
        throw error;
    }
}