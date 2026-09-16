import React from 'react';

interface FadeInProps {
  children: React.ReactNode;
  delayMs?: number;
  durationMs?: number;
  className?: string;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delayMs = 0,
  durationMs = 220,
  className = '',
}) => {
  return (
    <div
      className={`animate-page-enter ${className}`}
      style={{
        animationDelay: `${delayMs}ms`,
        animationDuration: `${durationMs}ms`,
      }}
    >
      {children}
    </div>
  );
};

export default FadeIn;
