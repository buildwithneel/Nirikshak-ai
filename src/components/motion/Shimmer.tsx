import React from 'react';

interface ShimmerProps {
  className?: string;
  children?: React.ReactNode;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  className = 'w-full h-4 rounded',
  children,
}) => {
  return (
    <div className={`animate-shimmer overflow-hidden bg-institutional-subtle ${className}`}>
      {children}
    </div>
  );
};

export default Shimmer;
