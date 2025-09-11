import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import SurveyScreen from './components/SurveyScreen';
import DashboardScreen from './components/DashboardScreen';
import SqlSetupScreen from './components/SqlSetupScreen';
import { generateSchemaAndData } from './services/geminiService';
import * as apiService from './services/apiService';
import { setSupabaseCredentials, clearSupabaseCredentials } from './services/supabaseClient';
import type { DatabaseSchema, Record, SurveyData } from './types';
import LogoIcon from './components/icons/LogoIcon';

interface SetupInfo {
  tableName: string;
  sqlSchema: string;
  schema: DatabaseSchema;
  sampleData: Record[];
  surveyData: SurveyData;
}

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('emerald-isLoggedIn');
    localStorage.removeItem('emerald-tableName');
    localStorage.removeItem('emerald-schema');
    localStorage.removeItem('emerald-surveyData');
    clearSupabaseCredentials();
    
    setIsLoggedIn(false);
    setSchema(null);
    setSurveyData(null);
    setRecords([]);
    setSetupInfo(null);
  }, []);


  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedIsLoggedIn = localStorage.getItem('emerald-isLoggedIn');
        const savedUrl = localStorage.getItem('emerald-supabaseUrl');
        const savedKey = localStorage.getItem('emerald-supabaseAnonKey');
        
        if (savedIsLoggedIn === 'true' && savedUrl && savedKey) {
          setSupabaseCredentials(savedUrl, savedKey);
          setIsLoggedIn(true);

          const savedTableName = localStorage.getItem('emerald-tableName');
          const savedSchema = localStorage.getItem('emerald-schema');
          const savedSurveyData = localStorage.getItem('emerald-surveyData');

          if (savedTableName && savedSchema && savedSurveyData) {
            const parsedSchema = JSON.parse(savedSchema);
            const parsedSurveyData = JSON.parse(savedSurveyData);

            setSchema(parsedSchema);
            setSurveyData(parsedSurveyData);

            const serverRecords = await apiService.getRecords();
            setRecords(serverRecords);
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        // If there's an error (e.g., bad Supabase key), log the user out.
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [handleLogout]);

  const handleLogin = (supabaseUrl: string, supabaseAnonKey: string) => {
    setSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    localStorage.setItem('emerald-isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleSurveySubmit = useCallback(async (occupation: string, dataType: string) => {
    setIsLoading(true);
    try {
      const result = await generateSchemaAndData(occupation, dataType);
      setSetupInfo({ ...result, surveyData: { occupation, dataType } });
    } catch (error) {
      console.error("Failed to generate schema:", error);
      alert("There was an error generating your database schema. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirmSqlSetup = async (confirmedSetupInfo: SetupInfo) => {
    setIsLoading(true);
    try {
        localStorage.setItem('emerald-tableName', confirmedSetupInfo.tableName);
        localStorage.setItem('emerald-schema', JSON.stringify(confirmedSetupInfo.schema));
        localStorage.setItem('emerald-surveyData', JSON.stringify(confirmedSetupInfo.surveyData));

        if (confirmedSetupInfo.sampleData.length > 0) {
            await apiService.addBulkRecords(confirmedSetupInfo.sampleData);
        }

        const serverRecords = await apiService.getRecords();
        
        setSchema(confirmedSetupInfo.schema);
        setSurveyData(confirmedSetupInfo.surveyData);
        setRecords(serverRecords);
        setSetupInfo(null);
    } catch (error) {
        console.error("Failed to set up database and insert sample data:", error);
        alert("There was an error setting up your database. Please ensure the table was created correctly in Supabase and try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const resetSurvey = async () => {
    if (window.confirm("Are you sure you want to reset your database? This will erase your current schema and all records from this app.\n\nNOTE: This will NOT delete the table from your Supabase project.")) {
      localStorage.removeItem('emerald-tableName');
      localStorage.removeItem('emerald-schema');
      localStorage.removeItem('emerald-surveyData');
      setSurveyData(null);
      setSchema(null);
      setRecords([]);
      setSetupInfo(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-900">
        <LogoIcon className="h-16 w-16 animate-pulse text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {!isLoggedIn ? (
        <LoginScreen onLogin={handleLogin} />
      ) : !schema ? (
        setupInfo ? (
            <SqlSetupScreen
                tableName={setupInfo.tableName}
                sqlSchema={setupInfo.sqlSchema}
                onConfirm={() => handleConfirmSqlSetup(setupInfo)}
            />
        ) : (
          <SurveyScreen onSubmit={handleSurveySubmit} isLoading={isLoading} />
        )
      ) : (
        <DashboardScreen
          schema={schema}
          initialRecords={records}
          onLogout={handleLogout}
          surveyData={surveyData}
          onResetSurvey={resetSurvey}
        />
      )}
    </div>
  );
};

export default App;
