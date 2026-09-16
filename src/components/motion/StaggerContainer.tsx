import React from 'react';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className = '',
}) => {
  return <div className={className}>{children}</div>;
};

interface StaggerItemProps {
  children: React.ReactNode;
  index: number;
  baseDelayMs?: number;
  incrementMs?: number;
  className?: string;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  index,
  baseDelayMs = 0,
  incrementMs = 35,
  className = '',
}) => {
  const delay = baseDelayMs + index * incrementMs;
  return (
    <div
      className={`animate-slide-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};
