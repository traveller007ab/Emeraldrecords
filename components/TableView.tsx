import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { DatabaseSchema, Record, ColumnDefinition, Filter, FilterOperator } from '../types';
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
import FilterIcon from './icons/FilterIcon';

interface TableViewProps {
  schema: DatabaseSchema;
  records: Record[];
  filters: Filter[];
  onFiltersChange: (filters: Filter[]) => void;
  onUpdateRecord: (recordId: string, updates: Partial<Omit<Record, 'id'>>) => void;
  onCreateRecord: (newRecord: Omit<Record, 'id' | 'created_at'>) => void;
  onDeleteRecord: (recordId: string) => void;
}

const FilterPill: React.FC<{ filter: Filter, schema: DatabaseSchema, onRemove: () => void }> = ({ filter, schema, onRemove }) => {
    const column = schema.find(c => c.id === filter.columnId);
    if (!column) return null;
    return (
        <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-medium px-2 py-1 rounded-full">
            {column.name} <span className="text-slate-400">{filter.operator.toLowerCase()}</span> "{filter.value}"
            <button onClick={onRemove} className="text-emerald-300 hover:text-white"><CloseIcon className="w-3 h-3" /></button>
        </span>
    );
};

const TableView: React.FC<TableViewProps> = ({ schema, records, filters, onFiltersChange, onUpdateRecord, onCreateRecord, onDeleteRecord }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<Partial<Record> | null>(null);
    const [sortColumn, setSortColumn] = useState<string>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    
    // State for the new filter being built
    const [newFilterColumn, setNewFilterColumn] = useState<string>(schema[0]?.id || '');
    const [newFilterOperator, setNewFilterOperator] = useState<FilterOperator>('EQUALS');
    const [newFilterValue, setNewFilterValue] = useState('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setIsFilterMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
        let recordsToFilter = [...sortedRecords];

        // Apply structured filters
        if (filters.length > 0) {
            recordsToFilter = recordsToFilter.filter(record => {
                return filters.every(filter => {
                    const recordValue = record[filter.columnId];
                    if (recordValue === null || recordValue === undefined) return false;
                    const recordValueStr = String(recordValue).toLowerCase();
                    const filterValueStr = String(filter.value).toLowerCase();

                    switch (filter.operator) {
                        case 'EQUALS': return recordValueStr === filterValueStr;
                        case 'NOT_EQUALS': return recordValueStr !== filterValueStr;
                        case 'CONTAINS': return recordValueStr.includes(filterValueStr);
                        case 'GREATER_THAN': return Number(recordValue) > Number(filter.value);
                        case 'LESS_THAN': return Number(recordValue) < Number(filter.value);
                        default: return true;
                    }
                });
            });
        }

        // Apply free-text search
        if (searchTerm) {
            recordsToFilter = recordsToFilter.filter(record => {
                return Object.values(record).some(value =>
                    String(value).toLowerCase().includes(searchTerm.toLowerCase())
                );
            });
        }

        return recordsToFilter;
    }, [sortedRecords, searchTerm, filters]);


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
    
    const handleAddFilter = () => {
        if (!newFilterValue.trim()) return;
        const newFilter: Filter = {
            columnId: newFilterColumn,
            operator: newFilterOperator,
            value: newFilterValue,
        };
        onFiltersChange([...filters, newFilter]);
        setNewFilterValue('');
        setIsFilterMenuOpen(false);
    };
    
    const handleRemoveFilter = (index: number) => {
        onFiltersChange(filters.filter((_, i) => i !== index));
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Search Input */}
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
                    {/* Filter Button & Menu */}
                    <div className="relative" ref={filterMenuRef}>
                        <Button onClick={() => setIsFilterMenuOpen(prev => !prev)} variant="secondary" size="sm" className="!py-2">
                            <FilterIcon className="h-4 w-4 mr-2"/> Filter
                        </Button>
                        {isFilterMenuOpen && (
                            <div className="absolute top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 z-20 space-y-3">
                                <h4 className="font-semibold text-white">Add a filter</h4>
                                <select value={newFilterColumn} onChange={e => setNewFilterColumn(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm">
                                    {schema.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <select value={newFilterOperator} onChange={e => setNewFilterOperator(e.target.value as FilterOperator)} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm">
                                    <option value="EQUALS">Equals</option>
                                    <option value="NOT_EQUALS">Not Equals</option>
                                    <option value="CONTAINS">Contains</option>
                                    <option value="GREATER_THAN">Greater Than</option>
                                    <option value="LESS_THAN">Less Than</option>
                                </select>
                                <Input type="text" placeholder="Value..." value={newFilterValue} onChange={e => setNewFilterValue(e.target.value)} className="!py-2 text-sm" />
                                <Button onClick={handleAddFilter} size="sm" fullWidth>Apply Filter</Button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportCsv} size="sm" variant="secondary" disabled={filteredRecords.length === 0}>
                        <ExportIcon className="h-4 w-4 mr-2"/> Export
                    </Button>
                    <Button onClick={openCreateModal} size="sm">
                        <PlusIcon className="h-4 w-4 mr-2"/> Add Record
                    </Button>
                </div>
            </div>
             {/* Active Filters Display */}
            {filters.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-4">
                    {filters.map((filter, index) => (
                        <FilterPill key={index} filter={filter} schema={schema} onRemove={() => handleRemoveFilter(index)} />
                    ))}
                    <button onClick={() => onFiltersChange([])} className="text-xs text-slate-400 hover:text-white hover:underline">Clear all</button>
                </div>
            )}
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
                        {records.length > 0
                            ? `No records match your search criteria.`
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