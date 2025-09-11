import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<InputProps> = ({ className, ...props }) => {
  const baseStyles = 'w-full px-4 py-3 bg-slate-900/70 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200';
  
  const combinedClasses = [baseStyles, className].filter(Boolean).join(' ');
  
  return (
    <input className={combinedClasses} {...props} />
  );
};

export default Input;