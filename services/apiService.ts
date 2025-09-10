import { getSupabaseClient } from './supabaseClient';
import type { Record } from '../types';

// Helper to get table name from localStorage
const getTableName = (): string => {
    const tableName = localStorage.getItem('emerald-tableName');
    if (!tableName) {
        throw new Error("Supabase table name not found. Please complete the setup.");
    }
    return tableName;
};

// Helper to convert camelCase from schema to snake_case for Supabase
const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const convertKeysToSnakeCase = (obj: object) => {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        newObj[camelToSnakeCase(key)] = obj[key as keyof typeof obj];
    }
    return newObj;
}

// --- Records ---
export const getRecords = async (): Promise<Record[]> => {
    const tableName = getTableName();
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase getRecords error:", error);
        throw new Error(error.message);
    }
    // Supabase returns snake_case keys, but our app uses camelCase from the schema.
    // Let's assume the app components can handle either or we handle it here if needed.
    // For now, let's pass it through as is, since Record type is flexible.
    return data || [];
};

export const addRecord = async (recordData: Omit<Record, 'id'>): Promise<Record> => {
    const tableName = getTableName();
    const supabase = getSupabaseClient();
    const snakeCaseData = convertKeysToSnakeCase(recordData);

    const { data, error } = await supabase
        .from(tableName)
        .insert(snakeCaseData)
        .select()
        .single();
    
    if (error) {
        console.error("Supabase addRecord error:", error);
        throw new Error(error.message);
    }
    return data;
};

export const addBulkRecords = async (recordsData: Omit<Record, 'id'>[]): Promise<Record[]> => {
    const tableName = getTableName();
    const supabase = getSupabaseClient();
    const snakeCaseData = recordsData.map(convertKeysToSnakeCase);

    const { data, error } = await supabase
        .from(tableName)
        .insert(snakeCaseData)
        .select();

    if (error) {
        console.error("Supabase addBulkRecords error:", error);
        throw new Error(error.message);
    }
    return data || [];
}

export const updateRecord = async (recordId: string, updates: Partial<Omit<Record, 'id'>>): Promise<Record> => {
    const tableName = getTableName();
    const supabase = getSupabaseClient();
    const snakeCaseUpdates = convertKeysToSnakeCase(updates);
    
    const { data, error } = await supabase
        .from(tableName)
        .update(snakeCaseUpdates)
        .eq('id', recordId)
        .select()
        .single();

    if (error) {
        console.error("Supabase updateRecord error:", error);
        throw new Error(error.message);
    }
    return data;
};

export const deleteRecord = async (recordId: string): Promise<void> => {
    const tableName = getTableName();
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', recordId);

    if (error) {
        console.error("Supabase deleteRecord error:", error);
        throw new Error(error.message);
    }
};

export const deleteBulkRecords = async (recordIds: string[]): Promise<void> => {
    const tableName = getTableName();
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', recordIds);
    
     if (error) {
        console.error("Supabase deleteBulkRecords error:", error);
        throw new Error(error.message);
    }
};