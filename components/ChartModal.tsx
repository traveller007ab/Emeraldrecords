import React from 'react';
import type { ChartData } from '../types';
import Modal from './common/Modal';

interface ChartModalProps {
  chartData: ChartData;
  onClose: () => void;
}

const ChartModal: React.FC<ChartModalProps> = ({ chartData, onClose }) => {
  const { title, data } = chartData;

  const maxCount = Math.max(...data.map(d => d.value), 0);

  return (
    <Modal isOpen={true} onClose={onClose} title={title}>
      <div className="mt-4 space-y-3">
        {data.length > 0 ? (
          data.map((item, index) => (
            <div key={index} className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="text-sm text-slate-300 w-1/3 truncate text-right" title={item.label}>
                {item.label}
              </div>
              <div className="w-2/3 bg-slate-700 rounded-full h-7">
                <div 
                  className="bg-emerald-500 from-emerald-500 to-emerald-600 bg-gradient-to-r h-7 rounded-full flex items-center justify-end pr-2 text-white text-sm font-bold transition-all duration-500 ease-out"
                  style={{ width: maxCount > 0 ? `${(item.value / maxCount) * 100}%` : '0%'}}
                >
                   {item.value}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-center py-8">No data available for this chart.</p>
        )}
      </div>
    </Modal>
  );
};

export default ChartModal;