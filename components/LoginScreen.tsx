import React from 'react';
import Button from './common/Button';
import Input from './common/Input';
import LogoIcon from './icons/LogoIcon';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-10">
          <LogoIcon className="h-20 w-20 mx-auto text-emerald-500" />
          <h1 className="text-4xl font-bold text-gray-100 mt-4">EmeraldRecords</h1>
          <p className="text-gray-400 mt-2">Your dynamic data workspace.</p>
        </div>
        
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl shadow-emerald-500/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input type="email" placeholder="Email" name="email" defaultValue="demo@emerald.io" />
            <Input type="password" placeholder="Password" name="password" defaultValue="password" />
            <Button type="submit" fullWidth>
              Log In
            </Button>
          </form>
          <p className="text-center text-xs text-gray-500 mt-6">
            This is a simulated login. Click "Log In" to proceed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
