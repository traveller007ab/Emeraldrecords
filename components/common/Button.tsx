import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({ children, fullWidth = false, variant = 'primary', size = 'md', className, ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500',
    secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500'
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
