import React, { useState, useEffect, useCallback } from 'react';
import type { DatabaseSchema, Record, Filter, ChartData } from '../types';
import Button from './common/Button';
import AiChatAssistant from './AiChatAssistant';
import LogoIcon from './icons/LogoIcon';
import LogoutIcon from './icons/LogoutIcon';
import TableIcon from './icons/TableIcon';
import KanbanIcon from './icons/KanbanIcon';
import AnalyticsIcon from './icons/AnalyticsIcon';
import TableView from './TableView';
import KanbanView from './KanbanView';
import AnalyticsView from './AnalyticsView';
import * as apiService from '../services/apiService';
import Spinner from './common/Spinner';
import SparklesIcon from './icons/SparklesIcon';
import CloseIcon from './icons/CloseIcon';
import ChartModal from './ChartModal';
import { Menu } from '@headlessui/react';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface DataWorkspaceProps {
  tables: string[];
  onLogout: () => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
      active
        ? 'text-emerald-400 border-emerald-400'
        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/50'
    }`}
  >
    {children}
  </button>
);


const DataWorkspace: React.FC<DataWorkspaceProps> = ({ tables, onLogout }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('table');
  const [selectedTable, setSelectedTable] = useState<string>(tables[0]);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [chartModalData, setChartModalData] = useState<ChartData | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedTable) return;
    setIsLoading(true);
    setError(null);
    setFilters([]); // Reset filters when table changes
    try {
        const [fetchedSchema, fetchedRecords] = await Promise.all([
            apiService.getTableSchema(selectedTable),
            apiService.getRecords(selectedTable),
        ]);
        setSchema(fetchedSchema);
        setRecords(fetchedRecords);
    } catch(err) {
        console.error(`Failed to fetch data for table ${selectedTable}:`, err);
        setError(`Could not load data for table "${selectedTable}". Please check permissions and try again.`);
    } finally {
        setIsLoading(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateRecord = async (recordId: string, updates: Partial<Omit<Record, 'id'>>) => {
    // Optimistic update
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
    try {
        await apiService.updateRecord(selectedTable, recordId, updates);
    } catch (err) {
        console.error("Failed to update record:", err);
        alert("Failed to save changes to the database.");
        fetchData(); // Revert on failure
    }
  };

  const handleCreateRecord = async (newRecord: Omit<Record, 'id' | 'created_at'>) => {
    try {
        const created = await apiService.createRecord(selectedTable, newRecord);
        setRecords(prev => [created, ...prev]);
    } catch (err) {
        console.error("Failed to create record:", err);
        alert("Failed to create the new record in the database.");
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    // Optimistic delete
    const originalRecords = records;
    setRecords(prev => prev.filter(r => r.id !== recordId));
    try {
        // FIX: Changed record_id to recordId to match the parameter name.
        await apiService.deleteRecord(selectedTable, recordId);
    } catch (err) {
        console.error("Failed to delete record:", err);
        alert("Failed to delete the record from the database.");
        setRecords(originalRecords); // Revert on failure
    }
  }

  const handleSearch = (newFilters: Filter[]) => {
    setFilters(newFilters);
    setActiveTab('table'); // Switch to table view to show results
  };


  const renderContent = () => {
    if (isLoading) {
        return <div className="flex items-center justify-center p-16"><Spinner /></div>;
    }
    if (error) {
        return <div className="text-center p-16 text-red-400">{error}</div>;
    }
    if (!schema) {
        return <div className="text-center p-16 text-slate-400">Could not load table schema.</div>;
    }

    switch (activeTab) {
      case 'table':
        return <TableView 
            schema={schema} 
            records={records}
            filters={filters}
            onFiltersChange={setFilters}
            onUpdateRecord={handleUpdateRecord}
            onCreateRecord={handleCreateRecord}
            onDeleteRecord={handleDeleteRecord}
        />;
      case 'kanban':
        return <KanbanView schema={schema} records={records} onUpdateRecord={handleUpdateRecord} />;
      case 'analytics':
        return <AnalyticsView schema={schema} records={records} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <LogoIcon className="h-10 w-10 text-emerald-500" />
          <div>
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="inline-flex w-full justify-center items-center gap-x-1.5 rounded-md bg-transparent text-2xl font-bold text-white focus:outline-none">
                  {selectedTable}
                  <ChevronDownIcon className="-mr-1 h-6 w-6 text-slate-400" aria-hidden="true" />
                </Menu.Button>
              </div>

              <Menu.Items className="absolute left-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  {tables.map(table => (
                     <Menu.Item key={table}>
                      {({ active }) => (
                        <button
                          onClick={() => setSelectedTable(table)}
                          className={`${
                            active ? 'bg-slate-700 text-white' : 'text-slate-300'
                          } group flex w-full items-center rounded-md px-4 py-2 text-sm`}
                        >
                          {table}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Menu>
            <p className="text-sm text-slate-400 capitalize">Your AI-powered data workspace.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           <Button onClick={onLogout} variant="secondary" size="sm">
             <LogoutIcon className="h-4 w-4 mr-2" /> Logout
           </Button>
        </div>
      </header>

      <div className="flex items-center border-b border-slate-700 mb-6">
        <TabButton active={activeTab === 'table'} onClick={() => setActiveTab('table')}>
            <TableIcon className="h-5 w-5" /> Table View
        </TabButton>
        <TabButton active={activeTab === 'kanban'} onClick={() => setActiveTab('kanban')}>
            <KanbanIcon className="h-5 w-5" /> Kanban View
        </TabButton>
        <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
            <AnalyticsIcon className="h-5 w-5" /> Analytics
        </TabButton>
      </div>

       <div className="relative bg-slate-800/50 rounded-2xl shadow-lg p-6 group max-h-[calc(100vh-220px)] overflow-auto">
            <div className="absolute -inset-px bg-gradient-to-r from-emerald-600 to-sky-600 rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"></div>
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,#059669_0%,#0284c7_50%,#059669_100%)] opacity-20 animate-spin-slow"></div>
            </div>
            <div className="relative z-10">
                {renderContent()}
            </div>
       </div>

       {isChatOpen && schema && (
        <AiChatAssistant
          tableName={selectedTable}
          schema={schema}
          onClose={() => setIsChatOpen(false)}
          onCreateRecord={handleCreateRecord}
          onUpdateRecord={handleUpdateRecord}
          onDeleteRecord={handleDeleteRecord}
          onSearch={handleSearch}
          onGenerateChart={setChartModalData}
        />
       )}

       {chartModalData && (
        <ChartModal
            chartData={chartModalData}
            onClose={() => setChartModalData(null)}
        />
       )}

       <button
          onClick={() => setIsChatOpen(prev => !prev)}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-emerald-500 from-emerald-500 to-emerald-600 bg-gradient-to-br text-white rounded-full p-3 sm:p-4 shadow-lg shadow-emerald-700/30 transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-400 z-40"
          aria-label={isChatOpen ? "Close AI Assistant" : "Open AI Assistant"}
        >
          {isChatOpen 
            ? <CloseIcon className="h-6 w-6 sm:h-7 sm:w-7" /> 
            : <SparklesIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          }
       </button>
    </div>
  );
};

export default DataWorkspace;