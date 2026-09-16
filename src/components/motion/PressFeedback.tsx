import React from 'react';

interface PressFeedbackProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  scaleDown?: number;
}

export const PressFeedback: React.FC<PressFeedbackProps> = ({
  children,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`press-spring hover-lift transition-transform duration-150 active:scale-[0.97] cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
};

export default PressFeedback;
