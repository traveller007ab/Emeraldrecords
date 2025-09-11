import React, { useState } from 'react';
import type { System } from '../types';
import Button from './common/Button';
import AiChatAssistant from './AiChatAssistant';
import LogoIcon from './icons/LogoIcon';
import LogoutIcon from './icons/LogoutIcon';
import ResetIcon from './icons/ResetIcon';

interface DashboardScreenProps {
  systemDocument: System;
  onSystemUpdate: (updatedDocument: System) => void;
  onLogout: () => void;
  onResetSystem: () => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ systemDocument, onSystemUpdate, onLogout, onResetSystem }) => {
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div className="flex items-center space-x-3">
          <LogoIcon className="h-10 w-10 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">{systemDocument.name}</h1>
            <p className="text-sm text-slate-400 capitalize">{systemDocument.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           <Button onClick={onResetSystem} variant="secondary" size="sm">
             <ResetIcon className="h-4 w-4 mr-2" /> Reset System
           </Button>
           <Button onClick={onLogout} variant="secondary" size="sm">
             <LogoutIcon className="h-4 w-4 mr-2" /> Logout
           </Button>
        </div>
      </header>

       <div className="relative bg-slate-800/50 rounded-2xl shadow-lg p-6 group max-h-[calc(100vh-150px)] overflow-auto">
            {/* <!--- Glowing Border Effect ---> */}
            <div className="absolute -inset-px bg-gradient-to-r from-emerald-600 to-sky-600 rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
             <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,#059669_0%,#0284c7_50%,#059669_100%)] opacity-20 animate-spin-slow"></div>
            </div>

            <div className="relative z-10">
                <h2 className="text-xl font-semibold text-white mb-4">
                    System Document View
                </h2>
                <pre className="bg-slate-900/70 p-4 rounded-lg text-xs text-slate-300 whitespace-pre-wrap">
                    <code>
                        {JSON.stringify(systemDocument, null, 2)}
                    </code>
                </pre>
            </div>
       </div>
       {isChatOpen && (
        <AiChatAssistant
          systemDocument={systemDocument}
          onClose={() => setIsChatOpen(false)}
          onSystemUpdate={onSystemUpdate}
        />
       )}
    </div>
  );
};

export default DashboardScreen;
