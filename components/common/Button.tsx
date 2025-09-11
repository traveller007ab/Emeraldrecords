import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({ children, fullWidth = false, variant = 'primary', size = 'md', className, ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-emerald-500 from-emerald-500 to-emerald-600 bg-gradient-to-br text-white shadow-md shadow-emerald-700/20 hover:from-emerald-400 hover:to-emerald-500 focus-visible:ring-emerald-400',
    secondary: 'bg-slate-700/50 text-slate-200 border border-slate-600 hover:bg-slate-700/80 hover:border-slate-500 focus-visible:ring-slate-500'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base'
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  const combinedClasses = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    widthStyles,
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;