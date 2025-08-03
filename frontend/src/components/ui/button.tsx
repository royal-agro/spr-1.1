import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'default',
  size = 'default',
  disabled = false,
  type = 'button',
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900';
      case 'secondary':
        return 'bg-gray-100 text-gray-900 hover:bg-gray-200';
      case 'ghost':
        return 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
      case 'destructive':
        return 'bg-red-500 text-white hover:bg-red-600';
      default:
        return 'bg-blue-500 text-white hover:bg-blue-600';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-md
        transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
    >
      {children}
    </button>
  );
};