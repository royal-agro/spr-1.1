import React from 'react';

interface CommodityIconProps {
  commodity: string;
  size?: number;
  className?: string;
}

const CommodityIcon: React.FC<CommodityIconProps> = ({ commodity, size = 20, className = '' }) => {
  const iconStyle = {
    width: size,
    height: size,
  };

  switch (commodity) {
    case 'soja':
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#10B981" fillOpacity="0.1" stroke="#10B981" strokeWidth="2"/>
          <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
          <path d="M10 14c0 1.1.9 2 2 2s2-.9 2-2" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="10" cy="10" r="1" fill="#10B981"/>
          <circle cx="14" cy="10" r="1" fill="#10B981"/>
          <circle cx="12" cy="16" r="1" fill="#10B981"/>
        </svg>
      );
    
    case 'milho':
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="9" fill="#F59E0B" fillOpacity="0.1" stroke="#F59E0B" strokeWidth="2"/>
          <path d="M9 7v10M12 7v10M15 7v10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
          <path d="M7 9h10M7 12h10M7 15h10" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="9" cy="9" r="0.5" fill="#F59E0B"/>
          <circle cx="12" cy="9" r="0.5" fill="#F59E0B"/>
          <circle cx="15" cy="9" r="0.5" fill="#F59E0B"/>
        </svg>
      );
    
    case 'algodao':
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="10" fill="#EF4444" fillOpacity="0.1" stroke="#EF4444" strokeWidth="2"/>
          <circle cx="8" cy="8" r="2" fill="#EF4444" fillOpacity="0.3" stroke="#EF4444" strokeWidth="1"/>
          <circle cx="16" cy="8" r="2" fill="#EF4444" fillOpacity="0.3" stroke="#EF4444" strokeWidth="1"/>
          <circle cx="8" cy="16" r="2" fill="#EF4444" fillOpacity="0.3" stroke="#EF4444" strokeWidth="1"/>
          <circle cx="16" cy="16" r="2" fill="#EF4444" fillOpacity="0.3" stroke="#EF4444" strokeWidth="1"/>
          <circle cx="12" cy="12" r="2.5" fill="#EF4444" fillOpacity="0.2" stroke="#EF4444" strokeWidth="1.5"/>
        </svg>
      );
    
    case 'boi':
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="20" height="20" rx="10" fill="#8B5CF6" fillOpacity="0.1" stroke="#8B5CF6" strokeWidth="2"/>
          <path d="M6 10c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 8c-.55 0-1 .45-1 1s.45 1 1 1M16 8c.55 0 1 .45 1 1s-.45 1-1 1" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M10 14h4" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
          <path d="M9 18h6" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="10" cy="12" r="1" fill="#8B5CF6"/>
          <circle cx="14" cy="12" r="1" fill="#8B5CF6"/>
        </svg>
      );
    
    case 'dolar':
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#3B82F6" fillOpacity="0.1" stroke="#3B82F6" strokeWidth="2"/>
          <path d="M12 6v12M9 8h6a2 2 0 0 1 0 4h-6M9 16h6a2 2 0 0 0 0-4h-6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="8" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="2,2"/>
        </svg>
      );
    
    default:
      return (
        <svg style={iconStyle} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#6B7280" fillOpacity="0.1" stroke="#6B7280" strokeWidth="2"/>
          <path d="M12 8v8M8 12h8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
  }
};

export default CommodityIcon; 