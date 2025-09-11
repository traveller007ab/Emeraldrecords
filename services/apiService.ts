import { getSupabaseClient } from './supabaseClient';
import type { System } from '../types';

const TABLE_NAME = 'systems';

export const getSystemDocument = async (): Promise<System | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .limit(1)
        .single();

    if (error) {
        // "single()" returns this error code if no rows are found.
        if (error.code === 'PGRST116') {
            console.log('No system document found.');
            return null;
        }
        console.error("Supabase getSystemDocument error:", error);
        throw error;
    }
    return data;
};

export const updateSystemDocument = async (systemId: string, updates: Partial<Omit<System, 'id'>>): Promise<System> => {
    const supabase = getSupabaseClient();
    
    const { created_at, ...updateData } = updates;

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(updateData)
        .eq('id', systemId)
        .select()
        .single();

    if (error) {
        console.error("Supabase updateSystemDocument error:", error);
        throw error;
    }
    return data;
};

export const createSystemDocument = async (newSystem: Omit<System, 'id' | 'created_at' | 'updated_at'>): Promise<System> => {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(newSystem)
        .select()
        .single();
    
    if (error) {
        console.error("Supabase createSystemDocument error:", error);
        throw error;
    }
    return data;
}