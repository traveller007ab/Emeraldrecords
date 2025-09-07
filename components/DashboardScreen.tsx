import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { DatabaseSchema, Record, SurveyData, ColumnDefinition } from '../types';
import Button from './common/Button';
import Modal from './common/Modal';
import Input from './common/Input';
import AiChatAssistant from './AiChatAssistant';
import LogoIcon from './icons/LogoIcon';
import PlusIcon from './icons/PlusIcon';
import EditIcon from './icons/EditIcon';
import DeleteIcon from './icons/DeleteIcon';
import LogoutIcon from './icons/LogoutIcon';
import ResetIcon from './icons/ResetIcon';
import SearchIcon from './icons/SearchIcon';
import SortAscIcon from './icons/SortAscIcon';
import SortDescIcon from './icons/SortDescIcon';
import ExportIcon from './icons/ExportIcon';
import AnalyticsIcon from './icons/AnalyticsIcon';
import TableIcon from './icons/TableIcon';
import AnalyticsView from './AnalyticsView';
import SparklesIcon from './icons/SparklesIcon';
import CheckSquareIcon from './icons/CheckSquareIcon';


interface DashboardScreenProps {
  schema: DatabaseSchema;
  initialRecords: Record[];
  onLogout: () => void;
  surveyData: SurveyData | null;
  onResetSurvey: () => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ schema, initialRecords, onLogout, surveyData, onResetSurvey }) => {
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const [view, setView] = useState<'table' | 'analytics'>('table');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('emerald-records', JSON.stringify(records));
  }, [records]);

  const handleSaveRecord = (record: Omit<Record, 'id'>, editingId: string | null) => {
    if (editingId) {
      setRecords(records.map((r) => (r.id === editingId ? { ...r, ...record } : r)));
    } else {
      const newRecord = { ...record, id: `record_${Date.now()}` };
      setRecords([newRecord, ...records]);
    }
  };
  
  const handleDelete = (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      setRecords(records.filter((r) => r.id !== recordId));
    }
  };
  
  const handleBulkDelete = (recordIds: string[]) => {
      if (window.confirm(`Are you sure you want to delete ${recordIds.length} selected records?`)) {
          setRecords(records.filter((r) => !recordIds.includes(r.id)));
      }
  };

  const handleAiUpdateRecord = (recordId: string, updates: Partial<Omit<Record, 'id'>>) => {
    setRecords(prevRecords =>
      prevRecords.map(r =>
        r.id === recordId ? { ...r, ...updates } : r
      )
    );
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div className="flex items-center space-x-3">
          <LogoIcon className="h-10 w-10 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            {surveyData && <p className="text-sm text-gray-400 capitalize">{surveyData.occupation}: {surveyData.dataType}</p>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
           <Button onClick={onResetSurvey} variant="secondary" size="sm">
             <ResetIcon className="h-4 w-4 mr-2" /> Reset
           </Button>
           <Button onClick={onLogout} variant="secondary" size="sm">
             <LogoutIcon className="h-4 w-4 mr-2" /> Logout
           </Button>
        </div>
      </header>

       <div className="bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
            <h2 className="text-xl font-semibold">
                {view === 'table' ? 'My Records' : 'Data Analytics'}
            </h2>
            <div className="flex items-center rounded-lg bg-gray-900 p-1">
                <button 
                    onClick={() => setView('table')} 
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === 'table' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    <TableIcon className="h-5 w-5" />
                </button>
                 <button 
                    onClick={() => setView('analytics')} 
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === 'analytics' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    <AnalyticsIcon className="h-5 w-5" />
                </button>
            </div>
        </div>

        {view === 'table' ? (
            <TableView 
                schema={schema}
                records={records}
                onSave={handleSaveRecord}
                onDelete={handleDelete}
                onBulkDelete={handleBulkDelete}
                surveyDataType={surveyData?.dataType || 'data'}
                onOpenChat={() => setIsChatOpen(true)}
            />
        ) : (
            <AnalyticsView schema={schema} records={records} />
        )}
       </div>
       {isChatOpen && (
        <AiChatAssistant
          schema={schema}
          records={records}
          onClose={() => setIsChatOpen(false)}
          onUpdateRecord={handleAiUpdateRecord}
        />
       )}
    </div>
  );
};

interface TableViewProps {
    schema: DatabaseSchema;
    records: Record[];
    onSave: (record: Omit<Record, 'id'>, editingId: string | null) => void;
    onDelete: (id: string) => void;
    onBulkDelete: (ids: string[]) => void;
    surveyDataType: string;
    onOpenChat: () => void;
}

const TableView: React.FC<TableViewProps> = ({ schema, records, onSave, onDelete, onBulkDelete, surveyDataType, onOpenChat }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const displayedRecords = useMemo(() => {
    let filteredRecords = records.filter(record => {
      if (!searchQuery) return true;
      return schema.some(column => {
        const value = record[column.id];
        return value !== null && value !== undefined && String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
    });

    if (sortConfig !== null) {
      filteredRecords.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        const columnType = schema.find(col => col.id === sortConfig.key)?.type;

        let comparison = 0;
        if (aVal == null && bVal != null) comparison = -1;
        else if (aVal != null && bVal == null) comparison = 1;
        else if (aVal == null && bVal == null) comparison = 0;
        else {
            switch (columnType) {
                case 'number':
                    comparison = (Number(aVal) || 0) - (Number(bVal) || 0);
                    break;
                case 'date':
                    comparison = new Date(aVal).getTime() - new Date(bVal).getTime();
                    break;
                case 'boolean':
                    comparison = (aVal === bVal) ? 0 : aVal ? -1 : 1;
                    break;
                default: // 'text'
                    comparison = String(aVal).localeCompare(String(bVal));
                    break;
            }
        }
        
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }

    return filteredRecords;
  }, [records, searchQuery, sortConfig, schema]);

  useEffect(() => {
    if (selectAllRef.current) {
      const numSelected = selectedRecordIds.length;
      const numDisplayed = displayedRecords.length;
      selectAllRef.current.checked = numSelected === numDisplayed && numDisplayed > 0;
      selectAllRef.current.indeterminate = numSelected > 0 && numSelected < numDisplayed;
    }
  }, [selectedRecordIds, displayedRecords]);
  
  // Clear selection when filters or data change
  useEffect(() => {
    setSelectedRecordIds([]);
  }, [records, searchQuery, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig?.key === key && sortConfig?.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleSelectRow = (recordId: string) => {
    setSelectedRecordIds(prev => 
        prev.includes(recordId) 
            ? prev.filter(id => id !== recordId) 
            : [...prev, recordId]
    );
  };
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedRecordIds(displayedRecords.map(r => r.id));
    } else {
        setSelectedRecordIds([]);
    }
  };

  const handleAddNew = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record: Record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleSaveRecord = (record: Omit<Record, 'id'>) => {
    onSave(record, editingRecord?.id || null);
    setIsModalOpen(false);
    setEditingRecord(null);
  };
  
  const renderCell = (record: Record, column: ColumnDefinition) => {
    const value = record[column.id];
    if (column.type === 'boolean') {
      return value ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">Yes</span> : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">No</span>;
    }
    if (column.type === 'date') {
        if (!value) {
            return 'N/A';
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString();
    }
    return value?.toString() || 'N/A';
  }

  const getCsvContent = (recordsToExport: Record[]) => {
     const headers = schema.map(col => col.name);
     const rows = recordsToExport.map(record => {
        return schema.map(col => {
            const rawValue = record[col.id];
            let value;
            if (rawValue === null || rawValue === undefined) {
                value = "";
            } else if (col.type === 'date') {
                const date = new Date(rawValue);
                if (!isNaN(date.getTime())) {
                     const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                     value = new Date(date.getTime() + userTimezoneOffset).toLocaleDateString();
                } else {
                    value = "Invalid Date";
                }
            } else {
                value = String(rawValue);
            }
            // Escape commas and quotes
            const escapedValue = String(value).replace(/"/g, '""');
            if (escapedValue.includes(',')) {
                return `"${escapedValue}"`;
            }
            return escapedValue;
        });
    });

    return [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  }

  const triggerCsvDownload = (csvContent: string) => {
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const safeDataTypeName = surveyDataType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute("download", `${safeDataTypeName}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleExportAll = () => {
    triggerCsvDownload(getCsvContent(displayedRecords));
  };

  const handleExportSelected = () => {
      const selectedRecords = records.filter(r => selectedRecordIds.includes(r.id));
      triggerCsvDownload(getCsvContent(selectedRecords));
      handleToggleSelectionMode();
  };

  const handleDeleteSelected = () => {
      onBulkDelete(selectedRecordIds);
      setSelectedRecordIds([]);
      setIsSelectionMode(false);
  }

  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedRecordIds([]);
    }
    setIsSelectionMode(!isSelectionMode);
  };
    
    return (
    <>
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
            {selectedRecordIds.length > 0 ? (
                <div className="w-full flex justify-between items-center bg-gray-700/50 p-2 rounded-lg">
                    <span className="text-sm font-semibold pl-2">{selectedRecordIds.length} selected</span>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleExportSelected} variant="secondary" size="sm">
                            <ExportIcon className="h-4 w-4 mr-2" /> Export Selected
                        </Button>
                        <Button onClick={handleDeleteSelected} variant="secondary" size="sm" className="!bg-red-800 hover:!bg-red-700">
                             <DeleteIcon className="h-4 w-4 mr-2" /> Delete Selected
                        </Button>
                         <Button onClick={handleToggleSelectionMode} variant="secondary" size="sm">Cancel</Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleToggleSelectionMode} variant="secondary" size="sm">
                           <CheckSquareIcon className="h-4 w-4 mr-2" />
                           {isSelectionMode ? 'Cancel' : 'Select'}
                        </Button>
                        {displayedRecords.length > 0 && !isSelectionMode && (
                            <Button onClick={handleExportAll} variant="secondary" size="sm">
                                <ExportIcon className="h-4 w-4 mr-2" /> Export All
                            </Button>
                        )}
                    </div>
                     <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative min-w-[200px] sm:min-w-[250px]">
                            <Input
                                type="text"
                                placeholder="Search records..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 !py-2"
                            />
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        </div>
                        <Button onClick={onOpenChat} variant="secondary">
                            <SparklesIcon className="h-5 w-5 mr-2" /> Ask AI
                        </Button>
                        <Button onClick={handleAddNew}>
                            <PlusIcon className="h-5 w-5 mr-2" /> Add New
                        </Button>
                     </div>
                </>
            )}
        </div>

        <div className="overflow-x-auto">
          {displayedRecords.length > 0 ? (
          <table className="w-full min-w-max text-left">
            <thead className="border-b border-gray-700">
              <tr>
                {isSelectionMode && (
                    <th className="p-4 w-12">
                       <input
                            type="checkbox"
                            ref={selectAllRef}
                            onChange={handleSelectAll}
                            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                       />
                    </th>
                )}
                {schema.map((col) => (
                  <th key={col.id} className="p-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                     <button onClick={() => handleSort(col.id)} className="flex items-center gap-2 group transition-colors">
                        <span>{col.name}</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            {sortConfig?.key === col.id ? (
                                sortConfig.direction === 'ascending' 
                                    ? <SortDescIcon className="h-3 w-3" /> 
                                    : <SortAscIcon className="h-3 w-3" />
                            ) : <SortAscIcon className="h-3 w-3 text-gray-600" /> }
                        </span>
                     </button>
                  </th>
                ))}
                <th className="p-4 text-right text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {displayedRecords.map((record) => (
                <tr key={record.id} className={`transition-colors ${selectedRecordIds.includes(record.id) ? 'bg-emerald-900/50' : 'hover:bg-gray-700/50'}`}>
                  {isSelectionMode && (
                    <td className="p-4 w-12">
                         <input
                            type="checkbox"
                            checked={selectedRecordIds.includes(record.id)}
                            onChange={() => handleSelectRow(record.id)}
                            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                         />
                    </td>
                  )}
                  {schema.map((col) => (
                    <td key={col.id} className="p-4 whitespace-nowrap">{renderCell(record, col)}</td>
                  ))}
                  <td className="p-4 whitespace-nowrap text-right">
                    <button onClick={() => handleEdit(record)} className="text-gray-400 hover:text-emerald-400 p-2 rounded-full transition-colors"><EditIcon className="h-5 w-5" /></button>
                    <button onClick={() => onDelete(record.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full transition-colors"><DeleteIcon className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : (
             <div className="text-center py-16">
                <p className="text-gray-400">{searchQuery ? 'No records match your search.' : 'No records found.'}</p>
                <Button onClick={handleAddNew} className="mt-4">
                    <PlusIcon className="h-5 w-5 mr-2" /> Add your first record
                </Button>
             </div>
          )}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRecord ? 'Edit Record' : 'Add New Record'}>
            <RecordForm
            schema={schema}
            initialData={editingRecord}
            onSave={handleSaveRecord}
            onCancel={() => setIsModalOpen(false)}
            />
        </Modal>
    </>
    );
}


interface RecordFormProps {
    schema: DatabaseSchema;
    initialData: Record | null;
    onSave: (data: Omit<Record, 'id'>) => void;
    onCancel: () => void;
}

const RecordForm: React.FC<RecordFormProps> = ({ schema, initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Omit<Record, 'id'>>({});

    useEffect(() => {
        const defaultState = schema.reduce((acc, col) => {
            acc[col.id] = initialData?.[col.id] ?? (col.type === 'boolean' ? false : '');
            return acc;
        }, {} as Omit<Record, 'id'>);
        setFormData(defaultState);
    }, [schema, initialData]);

    const handleChange = (id: string, value: any, type: string) => {
        if (type === 'boolean') {
             setFormData(prev => ({ ...prev, [id]: (value as HTMLInputElement).checked }));
        } else {
             setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {schema.map(col => (
                <div key={col.id}>
                    <label htmlFor={col.id} className="block text-sm font-medium text-gray-300 mb-1">{col.name}</label>
                    {col.type === 'boolean' ? (
                        <input
                            id={col.id}
                            type="checkbox"
                            checked={!!formData[col.id]}
                            onChange={(e) => handleChange(col.id, e.target, col.type)}
                            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-emerald-600 focus:ring-emerald-500"
                        />
                    ) : (
                        <Input
                            id={col.id}
                            type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                            value={formData[col.id] || ''}
                            onChange={(e) => handleChange(col.id, e.target.value, col.type)}
                            required
                        />
                    )}
                </div>
            ))}
            <div className="flex justify-end space-x-3 pt-4">
                <Button onClick={onCancel} variant="secondary">Cancel</Button>
                <Button type="submit">Save</Button>
            </div>
        </form>
    );
};

export default DashboardScreen;