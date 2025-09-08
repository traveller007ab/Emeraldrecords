import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import SurveyScreen from './components/SurveyScreen';
import DashboardScreen from './components/DashboardScreen';
import { generateSchemaAndData } from './services/geminiService';
import * as apiService from './services/apiService';
import type { DatabaseSchema, Record, SurveyData } from './types';
import LogoIcon from './components/icons/LogoIcon';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [records, setRecords] = useState<Record[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedIsLoggedIn = localStorage.getItem('emerald-isLoggedIn');
        if (savedIsLoggedIn === 'true') {
          setIsLoggedIn(true);
          const settings = await apiService.getSettings();
          
          if (settings.surveyData && settings.schema) {
            setSurveyData(settings.surveyData);
            setSchema(settings.schema);
            const savedRecords = await apiService.getRecords();
            setRecords(savedRecords);
          }
        }
      } catch (error) {
        console.error("Failed to load data from backend", error);
        // Could show a "can't connect to server" message
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleLogin = () => {
    localStorage.setItem('emerald-isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleSurveySubmit = useCallback(async (occupation: string, dataType: string) => {
    setIsLoading(true);
    try {
      const result = await generateSchemaAndData(occupation, dataType);
      const newSurveyData = { occupation, dataType };
      
      // Use the new single endpoint for setup
      await apiService.setupDatabase(result.schema, newSurveyData, result.sampleData);

      // Fetch the newly created records from the DB to get real UUIDs
      const serverRecords = await apiService.getRecords();

      setSurveyData(newSurveyData);
      setSchema(result.schema);
      setRecords(serverRecords);
      
    } catch (error) {
      console.error("Failed to generate and setup schema:", error);
      alert("There was an error generating your database schema. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setSurveyData(null);
    setSchema(null);
    setRecords([]);
  };

  const resetSurvey = async () => {
    if(window.confirm("Are you sure you want to reset your database? This will erase your current schema and all records.")) {
        await apiService.clearDatabase();
        setSurveyData(null);
        setSchema(null);
        setRecords([]);
    }
  };

  if (isLoading && !isLoggedIn) {
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
        <SurveyScreen onSubmit={handleSurveySubmit} isLoading={isLoading} />
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