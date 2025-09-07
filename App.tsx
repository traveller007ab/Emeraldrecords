import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import SurveyScreen from './components/SurveyScreen';
import DashboardScreen from './components/DashboardScreen';
import { generateSchemaAndData } from './services/geminiService';
import type { DatabaseSchema, Record, SurveyData } from './types';
import LogoIcon from './components/icons/LogoIcon';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [records, setRecords] = useState<Record[]>([]);

  useEffect(() => {
    try {
      const savedIsLoggedIn = localStorage.getItem('emerald-isLoggedIn');
      const savedSurveyData = localStorage.getItem('emerald-surveyData');
      const savedSchema = localStorage.getItem('emerald-schema');
      const savedRecords = localStorage.getItem('emerald-records');

      if (savedIsLoggedIn === 'true') {
        setIsLoggedIn(true);
        if (savedSurveyData && savedSchema && savedRecords) {
          setSurveyData(JSON.parse(savedSurveyData));
          setSchema(JSON.parse(savedSchema));
          setRecords(JSON.parse(savedRecords));
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      // Clear potentially corrupted storage
      localStorage.clear();
    } finally {
      setIsLoading(false);
    }
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
      setSurveyData(newSurveyData);
      setSchema(result.schema);
      setRecords(result.sampleData);
      
      localStorage.setItem('emerald-surveyData', JSON.stringify(newSurveyData));
      localStorage.setItem('emerald-schema', JSON.stringify(result.schema));
      localStorage.setItem('emerald-records', JSON.stringify(result.sampleData));
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

  const resetSurvey = () => {
    if(window.confirm("Are you sure you want to reset your database? This will erase your current schema and all records.")) {
        localStorage.removeItem('emerald-surveyData');
        localStorage.removeItem('emerald-schema');
        localStorage.removeItem('emerald-records');
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
