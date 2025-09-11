import React, { useState, useMemo } from 'react';
import type { DatabaseSchema, Record, ColumnDefinition } from '../types';
import Button from './common/Button';
import Modal from './common/Modal';
import Input from './common/Input';
import PlusIcon from './icons/PlusIcon';
import EditIcon from './icons/EditIcon';
import DeleteIcon from './icons/DeleteIcon';
import SortAscIcon from './icons/SortAscIcon';
import SortDescIcon from './icons/SortDescIcon';
import SearchIcon from './icons/SearchIcon';
import CloseIcon from './icons/CloseIcon';
import ExportIcon from './icons/ExportIcon';

interface TableViewProps {
  schema: DatabaseSchema;
  records: Record[];
  onUpdateRecord: (recordId: string, updates: Partial<Omit<Record, 'id'>>) => void;
  onCreateRecord: (newRecord: Omit<Record, 'id' | 'created_at'>) => void;
  onDeleteRecord: (recordId: string) => void;
}

const TableView: React.FC<TableViewProps> = ({ schema, records, onUpdateRecord, onCreateRecord, onDeleteRecord }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<Partial<Record> | null>(null);
    const [sortColumn, setSortColumn] = useState<string>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    const handleSort = (columnId: string) => {
        if (sortColumn === columnId) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnId);
            setSortDirection('asc');
        }
    };

    const sortedRecords = useMemo(() => {
        return [...records].sort((a, b) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [records, sortColumn, sortDirection]);

    const filteredRecords = useMemo(() => {
        if (!searchTerm) {
            return sortedRecords;
        }
        return sortedRecords.filter(record => {
            return Object.values(record).some(value =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
    }, [sortedRecords, searchTerm]);

    const openCreateModal = () => {
        setEditingRecord({});
        setIsModalOpen(true);
    };

    const openEditModal = (record: Record) => {
        setEditingRecord(record);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRecord(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRecord) return;

        const { id, created_at, ...updates } = editingRecord;

        if (id) { // Editing existing record
            onUpdateRecord(id, updates);
        } else { // Creating new record
            onCreateRecord(updates);
        }
        closeModal();
    };

    const renderCell = (record: Record, column: ColumnDefinition): string => {
        const value = record[column.id];

        if (value === null || value === undefined) {
            return 'N/A';
        }
        if (column.type === 'boolean') {
          return value ? 'Yes' : 'No';
        }
        if (column.type === 'date') {
            if (!value) return 'N/A';
            try {
                const date = new Date(value);
                const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString();
            } catch {
                return 'Invalid Date';
            }
        }
        return value.toString();
    }
    
    const renderFormField = (column: ColumnDefinition) => {
        if (column.id === 'id' || column.id === 'created_at') return null;

        const value = editingRecord?.[column.id] || '';

        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const { name, value, type } = e.target;
            let finalValue: any = value;

            if (type === 'checkbox') {
              finalValue = (e.target as HTMLInputElement).checked;
            } else if (column.type === 'number') {
              finalValue = value === '' ? null : Number(value);
            } else if (column.type === 'date') {
               finalValue = value === '' ? null : new Date(value).toISOString();
            }

            setEditingRecord(prev => ({ ...prev, [name]: finalValue }));
        };

        return (
            <div key={column.id}>
                <label htmlFor={column.id} className="block text-sm font-medium text-slate-300 mb-2">{column.name}</label>
                {column.type === 'select' ? (
                     <select
                        id={column.id}
                        name={column.id}
                        value={value}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                    >
                        <option value="">Select...</option>
                        {column.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                ) : column.type === 'boolean' ? (
                     <input
                        id={column.id}
                        name={column.id}
                        type="checkbox"
                        checked={!!value}
                        onChange={handleChange}
                        className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                ) : (
                    <Input
                        id={column.id}
                        name={column.id}
                        type={column.type === 'date' ? 'date' : column.type === 'number' ? 'number' : 'text'}
                        value={column.type === 'date' && value ? (value as string).split('T')[0] : value}
                        onChange={handleChange}
                    />
                )}
            </div>
        )
    }

    const handleExportCsv = () => {
        if (filteredRecords.length === 0) return;

        const headers = schema.map(col => col.name).join(',');
        
        const rows = filteredRecords.map(record => {
            return schema.map(col => {
                let cellData = renderCell(record, col);
                // Escape commas and quotes
                if (cellData.includes('"')) {
                    cellData = cellData.replace(/"/g, '""');
                }
                if (cellData.includes(',')) {
                    cellData = `"${cellData}"`;
                }
                return cellData;
            }).join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <SearchIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <Input
                        type="text"
                        placeholder="Search records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 !py-2"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            aria-label="Clear search"
                        >
                            <CloseIcon className="w-5 h-5 text-slate-400 hover:text-white" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportCsv} size="sm" variant="secondary" disabled={filteredRecords.length === 0}>
                        <ExportIcon className="h-4 w-4 mr-2"/> Export CSV
                    </Button>
                    <Button onClick={openCreateModal} size="sm">
                        <PlusIcon className="h-4 w-4 mr-2"/> Add Record
                    </Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                        <tr>
                             {schema.map(col => (
                                <th key={col.id} scope="col" className="px-6 py-3">
                                    <button onClick={() => handleSort(col.id)} className="flex items-center gap-2 group whitespace-nowrap">
                                        {col.name}
                                        {sortColumn === col.id ? (
                                            sortDirection === 'asc' ? <SortAscIcon className="w-3 h-3"/> : <SortDescIcon className="w-3 h-3"/>
                                        ) : (
                                            <SortDescIcon className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                        )}
                                    </button>
                                </th>
                            ))}
                            <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.map(record => (
                            <tr key={record.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                                {schema.map(col => {
                                    const cellValue = renderCell(record, col);
                                    return (
                                        <td key={`${record.id}-${col.id}`} className="px-6 py-4">
                                            {col.type === 'boolean' ? (
                                                cellValue === 'Yes' ? <span className="text-emerald-400">{cellValue}</span> : <span className="text-slate-500">{cellValue}</span>
                                            ) : cellValue === 'N/A' ? (
                                                <span className="text-slate-500">{cellValue}</span>
                                            ) : cellValue === 'Invalid Date' ? (
                                                <span className="text-red-400">{cellValue}</span>
                                            ) : (
                                                cellValue
                                            )}
                                        </td>
                                    )
                                })}
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <button onClick={() => openEditModal(record)} className="p-1 text-slate-400 hover:text-white mr-2" aria-label={`Edit record ${record.id}`}><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => onDeleteRecord(record.id)} className="p-1 text-slate-400 hover:text-red-400" aria-label={`Delete record ${record.id}`}><DeleteIcon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredRecords.length === 0 && (
                    <p className="text-center py-8 text-slate-500">
                        {searchTerm 
                            ? `No records match your search for "${searchTerm}".`
                            : 'No records found. Click "Add Record" to get started.'
                        }
                    </p>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingRecord?.id ? 'Edit Record' : 'Create Record'}>
                <form onSubmit={handleSave} className="space-y-4">
                    {schema.map(col => renderFormField(col))}
                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TableView;