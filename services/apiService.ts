import type { DatabaseSchema, Record, SurveyData } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

const headers = {
  'Content-Type': 'application/json',
};

// --- Combined Setup ---
export const setupDatabase = async (schema: DatabaseSchema, surveyData: SurveyData, sampleData: Record[]): Promise<void> => {
    await fetch(`${API_BASE_URL}/setup`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ schema, surveyData, sampleData }),
    });
}

// --- Settings ---
interface SettingsPayload {
    schema: DatabaseSchema | null;
    surveyData: SurveyData | null;
}
export const getSettings = async (): Promise<SettingsPayload> => {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
};

// --- Records ---
export const getRecords = async (): Promise<Record[]> => {
    const response = await fetch(`${API_BASE_URL}/records`);
    if (!response.ok) throw new Error('Failed to fetch records');
    return response.json();
};

export const addRecord = async (recordData: Omit<Record, 'id'>): Promise<Record> => {
    const response = await fetch(`${API_BASE_URL}/records`, {
        method: 'POST',
        headers,
        body: JSON.stringify(recordData),
    });
    if (!response.ok) throw new Error('Failed to add record');
    return response.json();
};

export const updateRecord = async (recordId: string, updates: Partial<Omit<Record, 'id'>>): Promise<Record> => {
    const response = await fetch(`${API_BASE_URL}/records/${recordId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update record');
    return response.json();
};

export const deleteRecord = async (recordId: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/records`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ ids: [recordId] }),
    });
};

export const deleteBulkRecords = async (recordIds: string[]): Promise<void> => {
    await fetch(`${API_BASE_URL}/records`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ ids: recordIds }),
    });
};

// --- Utility ---
export const clearDatabase = async (): Promise<void> => {
     await fetch(`${API_BASE_URL}/clear`, { method: 'POST' });
};
