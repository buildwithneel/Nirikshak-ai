import React from 'react';

interface ScaleInProps {
  children: React.ReactNode;
  delayMs?: number;
  durationMs?: number;
  className?: string;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  delayMs = 0,
  durationMs = 240,
  className = '',
}) => {
  return (
    <div
      className={`animate-scale-in ${className}`}
      style={{
        animationDelay: `${delayMs}ms`,
        animationDuration: `${durationMs}ms`,
      }}
    >
      {children}
    </div>
  );
};

export default ScaleIn;
