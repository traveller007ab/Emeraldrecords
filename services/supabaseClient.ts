import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const setSupabaseCredentials = (url: string, key: string) => {
    localStorage.setItem('emerald-supabaseUrl', url);
    localStorage.setItem('emerald-supabaseAnonKey', key);
    supabaseInstance = createClient(url, key);
};

export const getSupabaseClient = (): SupabaseClient => {
    if (supabaseInstance) {
        return supabaseInstance;
    }
    
    const url = localStorage.getItem('emerald-supabaseUrl');
    const key = localStorage.getItem('emerald-supabaseAnonKey');

    if (!url || !key) {
        throw new Error("Supabase credentials not found in storage. Please log in.");
    }
    
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
};

export const clearSupabaseCredentials = () => {
    localStorage.removeItem('emerald-supabaseUrl');
    localStorage.removeItem('emerald-supabaseAnonKey');
    supabaseInstance = null;
};
