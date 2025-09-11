import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { DatabaseSchema, Record, SurveyData, ColumnDefinition } from '../types';
import * as apiService from '../services/apiService';
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
import KanbanIcon from './icons/KanbanIcon';
import KanbanView from './KanbanView';


interface DashboardScreenProps {
  schema: DatabaseSchema;
  initialRecords: Record[];
  onLogout: () => void;
  surveyData: SurveyData | null;
  onResetSurvey: () => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ schema, initialRecords, onLogout, surveyData, onResetSurvey }) => {
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const [view, setView] = useState<'table' | 'analytics' | 'kanban'>('table');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleSaveRecord = async (recordData: Omit<Record, 'id'>, editingId: string | null) => {
    if (editingId) {
      const updatedRecord = await apiService.updateRecord(editingId, recordData);
      setRecords(records.map((r) => (r.id === editingId ? updatedRecord : r)));
    } else {
      const newRecord = await apiService.addRecord(recordData);
      setRecords([newRecord, ...records]);
    }
  };
  
  const handleDelete = async (recordId: string) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      await apiService.deleteRecord(recordId);
      setRecords(records.filter((r) => r.id !== recordId));
    }
  };
  
  const handleBulkDelete = async (recordIds: string[]) => {
      if (window.confirm(`Are you sure you want to delete ${recordIds.length} selected records?`)) {
          await apiService.deleteBulkRecords(recordIds);
          setRecords(records.filter((r) => !recordIds.includes(r.id)));
      }
  };

  const handleUpdateRecord = async (recordId: string, updates: Partial<Omit<Record, 'id'>>) => {
    const updatedRecord = await apiService.updateRecord(recordId, updates);
    setRecords(prevRecords =>
      prevRecords.map(r =>
        r.id === recordId ? updatedRecord : r
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
            <h2 className="text-xl font-semibold capitalize">
                {view === 'table' ? 'My Records' : view}
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
                <button 
                    onClick={() => setView('kanban')} 
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === 'kanban' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    <KanbanIcon className="h-5 w-5" />
                </button>
            </div>
        </div>

        {view === 'table' && (
            <TableView 
                schema={schema}
                records={records}
                onSave={handleSaveRecord}
                onDelete={handleDelete}
                onBulkDelete={handleBulkDelete}
                surveyDataType={surveyData?.dataType || 'data'}
                onOpenChat={() => setIsChatOpen(true)}
            />
        )}
        {view === 'analytics' && (
            <AnalyticsView schema={schema} records={records} />
        )}
        {view === 'kanban' && (
            <KanbanView 
                schema={schema} 
                records={records} 
                onUpdateRecord={handleUpdateRecord} 
            />
        )}
       </div>
       {isChatOpen && (
        <AiChatAssistant
          schema={schema}
          records={records}
          onClose={() => setIsChatOpen(false)}
          onUpdateRecord={handleUpdateRecord}
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
{/* This is the beginning of the fix for the truncated file content */}
          {displayedRecords.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/50">
                    <tr>
                        {isSelectionMode && (
                             <th scope="col" className="p-4">
                                <input
                                type="checkbox"
                                ref={selectAllRef}
                                onChange={handleSelectAll}
                                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-emerald-600 focus:ring-emerald-500"
                                />
                            </th>
                        )}
                        {schema.map(column => (
                            <th key={column.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort(column.id)}>
                                <div className="flex items-center">
                                    {column.name}
                                    {sortConfig?.key === column.id ? (
                                        sortConfig.direction === 'ascending' ? <SortAscIcon className="h-4 w-4 ml-2" /> : <SortDescIcon className="h-4 w-4 ml-2" />
                                    ) : null}
                                </div>
                            </th>
                        ))}
                         <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {displayedRecords.map(record => (
                        <tr key={record.id} className={selectedRecordIds.includes(record.id) ? 'bg-emerald-900/30' : 'hover:bg-gray-700/40'}>
                             {isSelectionMode && (
                                <td className="p-4">
                                    <input
                                    type="checkbox"
                                    checked={selectedRecordIds.includes(record.id)}
                                    onChange={() => handleSelectRow(record.id)}
                                    className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-emerald-600 focus:ring-emerald-500"
                                    />
                                </td>
                            )}
                            {schema.map(column => (
                                <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    {renderCell(record, column)}
                                </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleEdit(record)} className="p-1 text-gray-400 hover:text-emerald-400"><EditIcon className="h-5 w-5" /></button>
                                <button onClick={() => onDelete(record.id)} className="p-1 text-gray-400 hover:text-red-400 ml-2"><DeleteIcon className="h-5 w-5" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          ) : (
            <div className="text-center py-16 text-gray-400">
                <p className="font-semibold">No records found.</p>
                <p className="text-sm mt-1">{searchQuery ? 'Try adjusting your search query.' : 'Click "Add New" to get started.'}</p>
            </div>
          )}
        </div>

        {isModalOpen && (
            <RecordFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveRecord}
                schema={schema}
                initialData={editingRecord}
            />
        )}
    </>
    );
};

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<Record, 'id'>) => void;
  schema: DatabaseSchema;
  initialData: Record | null;
}

const RecordFormModal: React.FC<RecordFormModalProps> = ({ isOpen, onClose, onSave, schema, initialData }) => {
  const [formData, setFormData] = useState<Omit<Record, 'id'>>({});

  useEffect(() => {
    if (isOpen) {
        const initialFormState: Omit<Record, 'id'> = {};
        schema.forEach(col => {
            if (initialData && initialData[col.id] !== undefined) {
                 if (col.type === 'date' && initialData[col.id]) {
                    try {
                        const d = new Date(initialData[col.id]);
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                        initialFormState[col.id] = d.toISOString().split('T')[0];
                    } catch (e) {
                         initialFormState[col.id] = '';
                    }
                } else {
                    initialFormState[col.id] = initialData[col.id];
                }
            } else {
                initialFormState[col.id] = col.type === 'boolean' ? false : col.type === 'number' ? null : '';
            }
        });
        setFormData(initialFormState);
    }
  }, [initialData, schema, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    if (type === 'checkbox') {
        processedValue = (e.target as HTMLInputElement).checked;
    } else if (schema.find(col => col.id === name)?.type === 'number') {
        processedValue = value === '' ? null : Number(value);
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const renderInput = (column: ColumnDefinition) => {
    const value = formData[column.id] ?? '';
    switch(column.type) {
      case 'text':
        return <Input id={column.id} name={column.id} type="text" value={value} onChange={handleChange} autoComplete="off"/>;
      case 'number':
        return <Input id={column.id} name={column.id} type="number" value={value === null ? '' : value} onChange={handleChange} />;
      case 'date':
        return <Input id={column.id} name={column.id} type="date" value={value} onChange={handleChange} />;
      case 'boolean':
        return (
            <div className="flex items-center h-12">
                <input
                    id={column.id}
                    name={column.id}
                    type="checkbox"
                    checked={!!value}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-emerald-600 focus:ring-emerald-500"
                />
            </div>
        )
      default:
        return null;
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Record' : 'Add New Record'}>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        {schema.map(column => (
          <div key={column.id}>
            <label htmlFor={column.id} className="block text-sm font-medium text-gray-300 mb-2">
              {column.name}
            </label>
            {renderInput(column)}
          </div>
        ))}
        <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
};

export default DashboardScreen;
