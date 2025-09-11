import React, { useState } from 'react';
import Button from './common/Button';
import LogoIcon from './icons/LogoIcon';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';

interface SchemaSetupScreenProps {
  tableName: string;
  sqlSchema: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const SchemaSetupScreen: React.FC<SchemaSetupScreenProps> = ({ tableName, sqlSchema, onConfirm, onCancel }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlSchema);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <LogoIcon className="h-16 w-16 mx-auto text-emerald-500" />
          <h1 className="text-4xl font-bold text-slate-100 mt-4">Create Your Database Table</h1>
          <p className="text-slate-400 mt-2">The AI has generated the following SQL to structure your data.</p>
        </div>
        
        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl shadow-2xl shadow-emerald-500/10 space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-white">1. Go to your Supabase SQL Editor</h2>
                <p className="text-slate-400 text-sm mt-1">
                    In your Supabase project dashboard, navigate to the "SQL Editor" section and click "New query".
                </p>
            </div>
             <div>
                <h2 className="text-lg font-semibold text-white">2. Copy and Run this SQL Query</h2>
                <p className="text-slate-400 text-sm mt-1">
                    This will create the table <code className="bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded text-xs">{tableName}</code> and some helper functions.
                </p>
                 <div className="mt-4 relative bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300 border border-slate-700">
                    <button 
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        aria-label="Copy SQL to clipboard"
                    >
                       {copied ? <CheckIcon className="h-5 w-5 text-emerald-400" /> : <CopyIcon className="h-5 w-5" />}
                    </button>
                    <pre className="overflow-x-auto whitespace-pre-wrap">
                        <code>
                            {sqlSchema}
                        </code>
                    </pre>
                 </div>
            </div>
             <div>
                <h2 className="text-lg font-semibold text-white">3. All Set? Let's Go!</h2>
                <p className="text-slate-400 text-sm mt-1">
                    Once you've successfully run the query in Supabase, click the button below to start using your application.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button onClick={onCancel} variant="secondary" fullWidth>
                  Cancel & Go Back
                </Button>
                <Button onClick={onConfirm} fullWidth>
                  I've Created the Table, Continue
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaSetupScreen;