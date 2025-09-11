import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import DataWorkspace from './components/DashboardScreen';
import * as apiService from './services/apiService';
import { setSupabaseCredentials, clearSupabaseCredentials } from './services/supabaseClient';
import type { DatabaseSchema } from './types';
import LogoIcon from './components/icons/LogoIcon';
import Button from './components/common/Button';
import SurveyScreen from './components/SurveyScreen';
import SchemaSetupScreen from './components/SqlSetupScreen';
import { generateDatabaseSchema } from './services/geminiService';
import FunctionsSetupScreen from './components/FunctionsSetupScreen';


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userTables, setUserTables] = useState<string[]>([]);
  
  // State for the initial setup flow
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  const [needsFunctionsSetup, setNeedsFunctionsSetup] = useState<boolean>(false);
  const [isGeneratingSchema, setIsGeneratingSchema] = useState<boolean>(false);
  const [setupInfo, setSetupInfo] = useState<{ tableName: string; schema: DatabaseSchema; sql: string; } | null>(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('emerald-isLoggedIn');
    clearSupabaseCredentials();
    setIsLoggedIn(false);
    setUserTables([]);
    setNeedsSetup(false);
    setSetupInfo(null);
    setNeedsFunctionsSetup(false);
  }, []);

  const loadUserTables = useCallback(async () => {
    setIsLoading(true);
    setNeedsSetup(false);
    setNeedsFunctionsSetup(false);
    setSetupInfo(null);
    try {
        const tables = await apiService.listTables();
        if (tables.length === 0) {
            console.log("No user tables found. Starting setup flow.");
            setNeedsSetup(true);
        } else {
            setUserTables(tables);
        }
    } catch (error: any) {
        console.error("Failed to load user tables:", error);
        if (error?.message?.includes('function') && error?.message?.includes('does not exist')) {
            console.warn("Helper functions appear to be missing. Starting function setup flow.");
            setNeedsFunctionsSetup(true);
        } else {
            alert("Could not connect to your Supabase project. Please check the credentials and network connection.");
            handleLogout();
        }
    } finally {
        setIsLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const savedIsLoggedIn = localStorage.getItem('emerald-isLoggedIn');
        const savedUrl = localStorage.getItem('emerald-supabaseUrl');
        const savedKey = localStorage.getItem('emerald-supabaseAnonKey');
        
        if (savedIsLoggedIn === 'true' && savedUrl && savedKey) {
          setSupabaseCredentials(savedUrl, savedKey);
          setIsLoggedIn(true);
          await loadUserTables();
        }
      } catch (error) {
        console.error("Failed to initialize:", error);
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [loadUserTables, handleLogout]);

  const handleLogin = (supabaseUrl: string, supabaseAnonKey: string) => {
    setSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    localStorage.setItem('emerald-isLoggedIn', 'true');
    setIsLoggedIn(true);
    loadUserTables();
  };
  
  const handleGenerateSchema = async (occupation: string, dataType: string) => {
      setIsGeneratingSchema(true);
      try {
          const result = await generateDatabaseSchema(occupation, dataType);
          setSetupInfo(result);
          setNeedsSetup(false);
      } catch (err) {
          console.error("Failed to generate schema:", err);
          alert("Sorry, the AI could not generate a schema. Please try again with a different description.");
      } finally {
          setIsGeneratingSchema(false);
      }
  }

  const handleCompleteSetup = useCallback(async () => {
    if (!setupInfo) return;
    setIsLoading(true);
    try {
      await apiService.runRawSql(setupInfo.sql);
      // Success, reload tables which will move user to the workspace
      await loadUserTables();
    } catch (err) {
      console.error("Failed to execute setup SQL:", err);
      alert("Failed to create the table in your database. Please check the Supabase logs and try again.");
      setIsLoading(false);
    }
  }, [setupInfo, loadUserTables]);


  const renderContent = () => {
    if (!isLoggedIn) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    if (needsFunctionsSetup) {
        return <FunctionsSetupScreen onConfirm={loadUserTables} onLogout={handleLogout} />;
    }

    if (setupInfo) {
       return (
        <SchemaSetupScreen
            tableName={setupInfo.tableName}
            sqlSchema={setupInfo.sql}
            onConfirm={handleCompleteSetup}
            onCancel={() => { setSetupInfo(null); setNeedsSetup(true); }}
        />
       )
    }

    if (needsSetup) {
        return <SurveyScreen onSubmit={handleGenerateSchema} isLoading={isGeneratingSchema} />;
    }
    
    if (userTables.length > 0) {
        return <DataWorkspace tables={userTables} onLogout={handleLogout} />;
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 text-center">
            <div>
                <h2 className="text-2xl font-bold text-red-400">Error Loading Workspace</h2>
                <p className="text-slate-400 mt-2">Could not load your tables. Please check the console for errors.</p>
                <Button onClick={handleLogout} className="mt-4">Logout</Button>
            </div>
        </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <LogoIcon className="h-16 w-16 animate-pulse text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {renderContent()}
    </div>
  );
};

export default App;