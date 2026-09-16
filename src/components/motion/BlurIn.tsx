import React from 'react';

interface BlurInProps {
  children: React.ReactNode;
  delayMs?: number;
  durationMs?: number;
  className?: string;
}

export const BlurIn: React.FC<BlurInProps> = ({
  children,
  delayMs = 0,
  durationMs = 280,
  className = '',
}) => {
  return (
    <div
      className={`animate-blur-in ${className}`}
      style={{
        animationDelay: `${delayMs}ms`,
        animationDuration: `${durationMs}ms`,
      }}
    >
      {children}
    </div>
  );
};

export default BlurIn;
