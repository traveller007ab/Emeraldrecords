import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<InputProps> = ({ className, ...props }) => {
  const baseStyles = 'w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200';
  
  const combinedClasses = [baseStyles, className].filter(Boolean).join(' ');
  
  return (
    <input className={combinedClasses} {...props} />
  );
};

export default Input;
