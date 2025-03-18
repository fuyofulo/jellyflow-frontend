import React from "react";

interface IconWrapperProps {
  icon: React.ReactNode;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * A wrapper component that properly sizes SVG icons, handling cases where
 * the SVG doesn't accept width and height props directly
 */
export const IconWrapper: React.FC<IconWrapperProps> = ({ 
  icon, 
  width = 24, 
  height = 24,
  className = ""
}) => {
  return (
    <div 
      className={className}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <div style={{ 
        transform: `scale(${width / 50})`,
        transformOrigin: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </div>
    </div>
  );
}; 