import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import DashboardScreen from './components/DashboardScreen';
import * as apiService from './services/apiService';
import { setSupabaseCredentials, clearSupabaseCredentials } from './services/supabaseClient';
import type { System } from './types';
import LogoIcon from './components/icons/LogoIcon';
// FIX: Import Button component
import Button from './components/common/Button';

const createDefaultSystem = (): Omit<System, 'id' | 'created_at' | 'updated_at'> => ({
  name: "New System",
  type: "Default",
  description: "A new system document to get you started.",
  version: 1,
  parent_version: null,
  components: [],
  logic: {
    rules: [],
    workflow: [],
  },
  calculations: {
    math_engine: "sympy",
    equations: [],
    results: {},
  },
  diagram: {
    nodes: [],
    edges: [],
  },
  metadata: {
    tags: ["new"],
    domain: "other",
    author: "AI Assistant",
    notes: "Created automatically.",
  },
});


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [systemDocument, setSystemDocument] = useState<System | null>(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('emerald-isLoggedIn');
    clearSupabaseCredentials();
    setIsLoggedIn(false);
    setSystemDocument(null);
  }, []);

  const loadSystem = useCallback(async () => {
    setIsLoading(true);
    try {
        let doc = await apiService.getSystemDocument();
        if (!doc) {
            console.log("No document found, creating a default one.");
            doc = await apiService.createSystemDocument(createDefaultSystem());
        }
        setSystemDocument(doc);
    } catch (error) {
        console.error("Failed to load or create system document:", error);
        alert("Could not load your system document. Please check your Supabase connection, permissions, and ensure a 'systems' table exists.");
        handleLogout();
    } finally {
        setIsLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedIsLoggedIn = localStorage.getItem('emerald-isLoggedIn');
        const savedUrl = localStorage.getItem('emerald-supabaseUrl');
        const savedKey = localStorage.getItem('emerald-supabaseAnonKey');
        
        if (savedIsLoggedIn === 'true' && savedUrl && savedKey) {
          setSupabaseCredentials(savedUrl, savedKey);
          setIsLoggedIn(true);
          await loadSystem();
        }
      } catch (error) {
        console.error("Failed to initialize:", error);
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [loadSystem, handleLogout]);

  const handleLogin = (supabaseUrl: string, supabaseAnonKey: string) => {
    setSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    localStorage.setItem('emerald-isLoggedIn', 'true');
    setIsLoggedIn(true);
    loadSystem();
  };

  const handleSystemUpdate = async (updatedDocument: System) => {
    // Optimistically update the UI
    setSystemDocument(updatedDocument);
    try {
        await apiService.updateSystemDocument(updatedDocument.id, updatedDocument);
    } catch (err) {
        console.error("Failed to persist system update:", err);
        alert("Failed to save changes to the database. Your last change might not be saved.");
        // Optional: Add logic to revert to the previous state.
        loadSystem(); 
    }
  };
  
  const handleResetSystem = async () => {
      if (systemDocument && window.confirm("Are you sure you want to reset the system to its default state? This cannot be undone.")) {
          setIsLoading(true);
          const newDoc = createDefaultSystem();
          try {
            const updatedDoc = await apiService.updateSystemDocument(systemDocument.id, newDoc as Partial<System>);
            setSystemDocument(updatedDoc);
          } catch(err) {
            alert("Failed to reset the system.");
          } finally {
            setIsLoading(false);
          }
      }
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
      {!isLoggedIn ? (
        <LoginScreen onLogin={handleLogin} />
      ) : systemDocument ? (
        <DashboardScreen
          systemDocument={systemDocument}
          onSystemUpdate={handleSystemUpdate}
          onLogout={handleLogout}
          onResetSystem={handleResetSystem}
        />
      ) : (
         <div className="min-h-screen w-full flex items-center justify-center p-4 text-center">
            <div>
                <h2 className="text-2xl font-bold text-red-400">Error Loading System</h2>
                <p className="text-slate-400 mt-2">Could not load or create a system document. Please check the console for errors.</p>
                <Button onClick={handleLogout} className="mt-4">Logout</Button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;