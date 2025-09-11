import React, { useState } from 'react';
import type { DatabaseSchema, Record, ColumnDefinition } from '../types';
import Button from './common/Button';
import Modal from './common/Modal';
import Input from './common/Input';
import PlusIcon from './icons/PlusIcon';
import EditIcon from './icons/EditIcon';
import DeleteIcon from './icons/DeleteIcon';
import SortAscIcon from './icons/SortAscIcon';
import SortDescIcon from './icons/SortDescIcon';

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

    const handleSort = (columnId: string) => {
        if (sortColumn === columnId) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnId);
            setSortDirection('asc');
        }
    };

    const sortedRecords = [...records].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

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

    const renderCell = (record: Record, column: ColumnDefinition) => {
        const value = record[column.id];

        if (column.type === 'boolean') {
          return value ? <span className="text-emerald-400">Yes</span> : <span className="text-slate-500">No</span>;
        }
        if (column.type === 'date') {
            if (!value) return <span className="text-slate-500">N/A</span>;
            try {
                // Adjust for timezone offset before displaying
                const date = new Date(value);
                const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString();
            } catch {
                return <span className="text-red-400">Invalid Date</span>;
            }
        }
        return value?.toString() || <span className="text-slate-500">N/A</span>;
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

    return (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={openCreateModal} size="sm">
                    <PlusIcon className="h-4 w-4 mr-2"/> Add Record
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                        <tr>
                             {schema.map(col => (
                                <th key={col.id} scope="col" className="px-6 py-3">
                                    <button onClick={() => handleSort(col.id)} className="flex items-center gap-2 group">
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
                        {sortedRecords.map(record => (
                            <tr key={record.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                                {schema.map(col => (
                                    <td key={`${record.id}-${col.id}`} className="px-6 py-4">{renderCell(record, col)}</td>
                                ))}
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => openEditModal(record)} className="p-1 text-slate-400 hover:text-white mr-2"><EditIcon className="w-4 h-4" /></button>
                                    <button onClick={() => onDeleteRecord(record.id)} className="p-1 text-slate-400 hover:text-red-400"><DeleteIcon className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {records.length === 0 && (
                    <p className="text-center py-8 text-slate-500">No records found. Click "Add Record" to get started.</p>
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