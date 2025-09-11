import React, { useState, useEffect, useMemo } from 'react';
import type { DatabaseSchema, Record, ChartConfig } from '../types';
import { generateChartAnalytics } from '../services/geminiService';
import Spinner from './common/Spinner';

interface AnalyticsViewProps {
  schema: DatabaseSchema;
  records: Record[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ schema, records }) => {
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (records.length === 0) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const config = await generateChartAnalytics(schema, records);
        setChartConfig(config);
      } catch (e) {
        setError("Could not generate chart analytics. Please try again later.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [schema, records]);

  const summaryStats = useMemo(() => {
    const numberCols = schema.filter(col => col.type === 'number');
    const booleanCols = schema.filter(col => col.type === 'boolean');
    
    const numberSummaries = numberCols.map(col => {
        const values = records.map(r => Number(r[col.id])).filter(v => !isNaN(v));
        if (values.length === 0) return { name: col.name, total: 0, avg: 0 };
        const total = values.reduce((sum, val) => sum + val, 0);
        const avg = total / values.length;
        return { name: col.name, total: total, avg: parseFloat(avg.toFixed(2)) };
    });

    const booleanSummaries = booleanCols.map(col => {
        const trueCount = records.filter(r => r[col.id] === true).length;
        const falseCount = records.length - trueCount;
        return { name: col.name, trueCount, falseCount };
    });

    return { numberSummaries, booleanSummaries };
  }, [schema, records]);
  
  const chartData = useMemo(() => {
      if (!chartConfig || !records.length) return null;

      const { categoryColumnId } = chartConfig;
      const counts: { [key: string]: number } = {};
      
      for (const record of records) {
          const value = record[categoryColumnId]?.toString() || 'N/A';
          counts[value] = (counts[value] || 0) + 1;
      }

      const labels = Object.keys(counts);
      const data = Object.values(counts);
      const maxCount = Math.max(...data, 0);

      return {
          labels,
          data,
          maxCount,
          columnName: schema.find(c => c.id === categoryColumnId)?.name || ''
      };

  }, [chartConfig, records, schema]);


  if (records.length === 0) {
    return <div className="text-center py-16 text-slate-400">Add some records to see your analytics.</div>;
  }

  return (
    <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-700/50 p-4 rounded-lg">
                <p className="text-sm text-slate-400">Total Records</p>
                <p className="text-3xl font-bold">{records.length}</p>
            </div>
             {summaryStats.numberSummaries.map(stat => (
                <div key={stat.name} className="bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-sm text-slate-400">{stat.name} (Total)</p>
                    <p className="text-3xl font-bold">{stat.total.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Avg: {stat.avg.toLocaleString()}</p>
                </div>
            ))}
             {summaryStats.booleanSummaries.map(stat => (
                <div key={stat.name} className="bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-sm text-slate-400">{stat.name}</p>
                    <div className="flex items-baseline space-x-4 mt-1">
                        <div>
                             <span className="text-2xl font-bold text-emerald-400">{stat.trueCount}</span>
                             <span className="text-xs text-slate-500"> Yes</span>
                        </div>
                        <div>
                             <span className="text-2xl font-bold text-slate-300">{stat.falseCount}</span>
                             <span className="text-xs text-slate-500"> No</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-slate-700/50 p-6 rounded-lg">
            {isLoading && (
                <div className="flex flex-col items-center justify-center h-64">
                    <Spinner />
                    <p className="text-emerald-400 mt-4">AI is analyzing your data...</p>
                </div>
            )}
            {error && <div className="text-center py-16 text-red-400">{error}</div>}
            {!isLoading && !error && chartData && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-white">{chartConfig?.title}</h3>
                    <div className="space-y-2">
                        {chartData.labels.map((label, index) => (
                            <div key={label} className="flex items-center gap-4">
                                <div className="text-sm text-slate-300 w-1/4 truncate text-right">{label}</div>
                                <div className="w-3/4 bg-slate-600 rounded-full h-6">
                                    <div 
                                        className="bg-emerald-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-bold"
                                        style={{ width: chartData.maxCount > 0 ? `${(chartData.data[index] / chartData.maxCount) * 100}%` : '0%'}}
                                    >
                                       {chartData.data[index]}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
             {!isLoading && !error && !chartData && (
                <div className="text-center py-16 text-slate-400">No suitable data available for charting.</div>
            )}
        </div>
    </div>
  );
};

export default AnalyticsView;