import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  className = '', 
  variant = 'default' 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'destructive':
        return 'bg-red-500 text-white hover:bg-red-600';
      case 'outline':
        return 'border border-gray-300 text-gray-700 bg-transparent hover:bg-gray-50';
      default:
        return 'bg-blue-500 text-white hover:bg-blue-600';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${getVariantClasses()} ${className}`}>
      {children}
    </span>
  );
};