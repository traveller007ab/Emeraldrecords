import React, { useState } from 'react';
import Button from './common/Button';
import Input from './common/Input';
import Spinner from './common/Spinner';
import LogoIcon from './icons/LogoIcon';

interface SurveyScreenProps {
  onSubmit: (occupation: string, dataType: string) => void;
  isLoading: boolean;
}

const SurveyScreen: React.FC<SurveyScreenProps> = ({ onSubmit, isLoading }) => {
  const [occupation, setOccupation] = useState('');
  const [dataType, setDataType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (occupation && dataType) {
      onSubmit(occupation, dataType);
    }
  };

  const setExample = (occ: string, data: string) => {
    setOccupation(occ);
    setDataType(data);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl mx-auto">
        <div className="text-center mb-10">
          <LogoIcon className="h-16 w-16 mx-auto text-emerald-500" />
          <h1 className="text-4xl font-bold text-slate-100 mt-4">Customize Your Workspace</h1>
          <p className="text-slate-400 mt-2">Tell us about your work to generate the perfect database.</p>
        </div>
        
        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl shadow-2xl shadow-emerald-500/10 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-slate-800 bg-opacity-80 flex flex-col items-center justify-center rounded-2xl z-10">
              <Spinner />
              <p className="text-emerald-400 mt-4">Generating your workspace...</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="occupation" className="block text-sm font-medium text-slate-300 mb-2">
                What is your primary occupation?
              </label>
              <Input
                id="occupation"
                type="text"
                placeholder="e.g., Freelance Photographer, Project Manager"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="dataType" className="block text-sm font-medium text-slate-300 mb-2">
                What type of data will you be managing?
              </label>
              <Input
                id="dataType"
                type="text"
                placeholder="e.g., Client photoshoots, software development tasks"
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                required
              />
            </div>
            <Button type="submit" fullWidth disabled={isLoading || !occupation || !dataType}>
              Generate Database
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">Or try an example:</p>
            <div className="flex justify-center gap-2 mt-3 flex-wrap">
                <button onClick={() => setExample('Real Estate Agent', 'My property listings with status, price, and address')} className="text-xs bg-slate-700 hover:bg-emerald-800/50 text-slate-300 px-3 py-1 rounded-full transition-colors">Real Estate Agent</button>
                <button onClick={() => setExample('Personal Trainer', 'My clients, their fitness goals, and session dates')} className="text-xs bg-slate-700 hover:bg-emerald-800/50 text-slate-300 px-3 py-1 rounded-full transition-colors">Personal Trainer</button>
                <button onClick={() => setExample('Event Planner', 'Upcoming events, their venues, budgets, and client contacts')} className="text-xs bg-slate-700 hover:bg-emerald-800/50 text-slate-300 px-3 py-1 rounded-full transition-colors">Event Planner</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyScreen;