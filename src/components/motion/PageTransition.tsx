import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 21st.dev-inspired lightweight page entrance transition
 * Uses pure CSS animation (220ms, ease-out institutional curve)
 * Respects prefers-reduced-motion via index.css
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`animate-page-enter ${className}`}>
      {children}
    </div>
  );
};

export default PageTransition;
