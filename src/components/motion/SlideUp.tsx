import React from 'react';

interface SlideUpProps {
  children: React.ReactNode;
  delayMs?: number;
  durationMs?: number;
  className?: string;
}

export const SlideUp: React.FC<SlideUpProps> = ({
  children,
  delayMs = 0,
  durationMs = 260,
  className = '',
}) => {
  return (
    <div
      className={`animate-slide-up ${className}`}
      style={{
        animationDelay: `${delayMs}ms`,
        animationDuration: `${durationMs}ms`,
      }}
    >
      {children}
    </div>
  );
};

export default SlideUp;
