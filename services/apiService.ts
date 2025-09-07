import type { DatabaseSchema, Record, SurveyData } from '../types';

const RECORDS_KEY = 'emerald-records';
const SCHEMA_KEY = 'emerald-schema';
const SURVEY_DATA_KEY = 'emerald-surveyData';

// Simulate network latency
const FAKE_DELAY = 200;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- Schema ---
export const saveSchema = async (schema: DatabaseSchema): Promise<void> => {
    await delay(FAKE_DELAY);
    localStorage.setItem(SCHEMA_KEY, JSON.stringify(schema));
};

export const getSchema = (): DatabaseSchema | null => {
    const savedSchema = localStorage.getItem(SCHEMA_KEY);
    return savedSchema ? JSON.parse(savedSchema) : null;
};

// --- Survey Data ---
export const saveSurveyData = async (surveyData: SurveyData): Promise<void> => {
    await delay(FAKE_DELAY);
    localStorage.setItem(SURVEY_DATA_KEY, JSON.stringify(surveyData));
};

export const getSurveyData = (): SurveyData | null => {
    const savedData = localStorage.getItem(SURVEY_DATA_KEY);
    return savedData ? JSON.parse(savedData) : null;
};

// --- Records ---
export const getRecords = async (): Promise<Record[]> => {
    await delay(FAKE_DELAY);
    const savedRecords = localStorage.getItem(RECORDS_KEY);
    return savedRecords ? JSON.parse(savedRecords) : [];
};

export const saveAllRecords = async (records: Record[]): Promise<void> => {
    await delay(FAKE_DELAY);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export const addRecord = async (recordData: Omit<Record, 'id'>): Promise<Record> => {
    await delay(FAKE_DELAY);
    const records = await getRecords();
    const newRecord: Record = {
        ...recordData,
        id: `record_${Date.now()}_${Math.random()}`
    };
    const updatedRecords = [newRecord, ...records];
    localStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
    return newRecord;
};

export const updateRecord = async (recordId: string, updates: Partial<Omit<Record, 'id'>>): Promise<Record> => {
    await delay(FAKE_DELAY);
    const records = await getRecords();
    let updatedRecord: Record | undefined;
    const updatedRecords = records.map(r => {
        if (r.id === recordId) {
            updatedRecord = { ...r, ...updates };
            return updatedRecord;
        }
        return r;
    });
    localStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
    if (!updatedRecord) {
        throw new Error(`Record with id ${recordId} not found.`);
    }
    return updatedRecord;
};

export const deleteRecord = async (recordId: string): Promise<void> => {
    await delay(FAKE_DELAY);
    const records = await getRecords();
    const updatedRecords = records.filter(r => r.id !== recordId);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
};

export const deleteBulkRecords = async (recordIds: string[]): Promise<void> => {
    await delay(FAKE_DELAY);
    const records = await getRecords();
    const updatedRecords = records.filter(r => !recordIds.includes(r.id));
    localStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
};

// --- Utility ---
export const clearDatabase = async (): Promise<void> => {
    await delay(FAKE_DELAY);
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(SCHEMA_KEY);
    localStorage.removeItem(SURVEY_DATA_KEY);
};