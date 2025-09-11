import React, { useState } from 'react';
import Button from './common/Button';
import Input from './common/Input';
import LogoIcon from './icons/LogoIcon';

interface LoginScreenProps {
  onLogin: (supabaseUrl: string, supabaseAnonKey: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl && supabaseAnonKey) {
        onLogin(supabaseUrl, supabaseAnonKey);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-10">
          <LogoIcon className="h-20 w-20 mx-auto text-emerald-500" />
          <h1 className="text-4xl font-bold text-slate-100 mt-4">System Modeler</h1>
          <p className="text-slate-400 mt-2">Your AI-powered system workspace.</p>
        </div>
        
        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl shadow-2xl shadow-emerald-500/10">
          <h2 className="text-center text-xl font-semibold text-white mb-6">Connect to Your System's Supabase</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="supabaseUrl" className="block text-sm font-medium text-slate-300 mb-2">
                Supabase Project URL
              </label>
              <Input
                id="supabaseUrl"
                type="text"
                placeholder="https://<your-project-ref>.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                required
              />
            </div>
             <div>
              <label htmlFor="supabaseAnonKey" className="block text-sm font-medium text-slate-300 mb-2">
                Supabase Anon (public) Key
              </label>
              <Input
                id="supabaseAnonKey"
                type="password"
                placeholder="Enter your anon key"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                required
              />
            </div>
            <div className="pt-2">
              <Button type="submit" fullWidth disabled={!supabaseUrl || !supabaseAnonKey}>
                Connect & Start
              </Button>
            </div>
          </form>
          <p className="text-center text-xs text-slate-500 mt-6">
            You can find these values in your Supabase project's API settings. You will need a table named "systems".
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;