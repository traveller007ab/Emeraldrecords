import React, { useState, useEffect, useMemo } from 'react';
import type { DatabaseSchema, Record, KanbanConfig, ColumnDefinition } from '../types';
import { generateKanbanConfig } from '../services/geminiService';
import Spinner from './common/Spinner';

interface KanbanViewProps {
  schema: DatabaseSchema;
  records: Record[];
  onUpdateRecord: (recordId: string, updates: Partial<Omit<Record, 'id'>>) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({ schema, records, onUpdateRecord }) => {
    const [kanbanConfig, setKanbanConfig] = useState<KanbanConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [draggedRecordId, setDraggedRecordId] = useState<string | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

    useEffect(() => {
        const fetchKanbanConfig = async () => {
            if (records.length === 0) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const config = await generateKanbanConfig(schema, records);
                // Basic validation
                if (config && config.statusColumnId && config.cardTitleColumnId && config.statusColumnOrder) {
                    setKanbanConfig(config);
                } else {
                    throw new Error("Received invalid configuration from AI.");
                }
            } catch (e) {
                setError("Could not generate a Kanban board. No suitable status column found in your data.");
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchKanbanConfig();
    }, [schema, records]);

    const boardData = useMemo(() => {
        if (!kanbanConfig) return null;
        
        const { statusColumnId, statusColumnOrder } = kanbanConfig;
        
        const columns: { [key:string]: Record[] } = {};
        const allStatuses = new Set<string>();
        records.forEach(r => allStatuses.add(r[statusColumnId]?.toString() || 'Uncategorized'));

        // Start with AI-provided order, filter to statuses that actually exist in the data
        let orderedStatuses = (statusColumnOrder || []).filter(s => allStatuses.has(s));

        // Add any remaining statuses from the data that weren't in the AI's list, and sort them
        const remainingStatuses = Array.from(allStatuses).filter(s => !orderedStatuses.includes(s)).sort();
        orderedStatuses = [...orderedStatuses, ...remainingStatuses];
        
        // Initialize columns based on the final ordered list
        for (const status of orderedStatuses) {
            columns[status] = [];
        }
        // Group records into the columns
        for (const record of records) {
            const status = record[statusColumnId]?.toString() || 'Uncategorized';
            // The status should always exist as a key in columns due to the logic above
            if (columns[status]) {
                columns[status].push(record);
            }
        }

        return { columns, orderedStatuses };

    }, [kanbanConfig, records]);

    const renderCell = (record: Record, column: ColumnDefinition | undefined) => {
        if (!column) return 'N/A';
        const value = record[column.id];

        if (column.type === 'boolean') {
          return value ? 'Yes' : 'No';
        }
        if (column.type === 'date') {
            if (!value) return null;
            const date = new Date(value);
            if (isNaN(date.getTime())) return null;
            const userTimezoneOffset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString();
        }
        return value?.toString() || null;
    }

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, recordId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedRecordId(recordId);
    };
    
    const handleDragEnd = () => {
        setDraggedRecordId(null);
        setDragOverStatus(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
        e.preventDefault();
        if (!draggedRecordId || !kanbanConfig) return;

        const originalRecord = records.find(r => r.id === draggedRecordId);
        if (originalRecord && originalRecord[kanbanConfig.statusColumnId] !== newStatus) {
            onUpdateRecord(draggedRecordId, { [kanbanConfig.statusColumnId]: newStatus });
        }
        handleDragEnd();
    };

    if (records.length === 0) {
        return <div className="text-center py-16 text-slate-400">Add some records to see your Kanban board.</div>;
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Spinner />
                <p className="text-emerald-400 mt-4">AI is analyzing your data to build a board...</p>
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-16 text-red-400">{error}</div>;
    }

    if (!kanbanConfig || !boardData) {
        return <div className="text-center py-16 text-slate-400">Could not display Kanban board.</div>;
    }

    const titleColumn = schema.find(c => c.id === kanbanConfig.cardTitleColumnId);
    const detailColumns = kanbanConfig.cardDetailColumnIds.map(id => schema.find(c => c.id === id)).filter(Boolean) as ColumnDefinition[];

    return (
        <div className="flex gap-6 overflow-x-auto pb-4">
            {boardData.orderedStatuses.map(status => (
                <div 
                    key={status}
                    className={`flex-shrink-0 w-80 bg-slate-900/50 rounded-xl transition-colors ${dragOverStatus === status ? 'bg-emerald-500/10' : ''}`}
                    onDragOver={handleDragOver}
                    onDragEnter={() => setDragOverStatus(status)}
                    onDragLeave={() => setDragOverStatus(null)}
                    onDrop={(e) => handleDrop(e, status)}
                >
                    <div className="p-4 border-b border-slate-700 sticky top-0 bg-slate-900/50 backdrop-blur-sm rounded-t-xl z-10">
                        <h3 className="font-semibold text-white capitalize flex items-center gap-2">
                            {status}
                            <span className="text-sm font-normal bg-slate-700 text-slate-300 rounded-full px-2 py-0.5">
                                {boardData.columns[status]?.length || 0}
                            </span>
                        </h3>
                    </div>
                    <div className="p-4 space-y-4 h-full">
                        {boardData.columns[status]?.map(record => (
                            <div 
                                key={record.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, record.id)}
                                onDragEnd={handleDragEnd}
                                className={`bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700 cursor-grab active:cursor-grabbing transition-opacity ${draggedRecordId === record.id ? 'opacity-50' : ''}`}
                            >
                                <h4 className="font-bold text-slate-100 mb-2">{renderCell(record, titleColumn)}</h4>
                                <div className="space-y-1">
                                    {detailColumns.map(col => {
                                        const value = renderCell(record, col);
                                        if (!value) return null;
                                        return (
                                            <div key={col.id} className="text-xs text-slate-400">
                                                <span className="font-semibold text-slate-500">{col.name}: </span>{value}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                         {(!boardData.columns[status] || boardData.columns[status].length === 0) && (
                            <div className="h-full border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center">
                               <p className="text-slate-600 text-sm">Drop here</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KanbanView;