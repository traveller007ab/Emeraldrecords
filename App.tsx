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
          const savedSurveyData = apiService.getSurveyData();
          const savedSchema = apiService.getSchema();
          
          if (savedSurveyData && savedSchema) {
            setSurveyData(savedSurveyData);
            setSchema(savedSchema);
            const savedRecords = await apiService.getRecords();
            setRecords(savedRecords);
          }
        }
      } catch (error) {
        console.error("Failed to load data", error);
        localStorage.clear();
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
      
      await apiService.saveSchema(result.schema);
      await apiService.saveSurveyData(newSurveyData);
      await apiService.saveAllRecords(result.sampleData);

      setSurveyData(newSurveyData);
      setSchema(result.schema);
      setRecords(result.sampleData);
      
    } catch (error) {
      console.error("Failed to generate schema:", error);
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