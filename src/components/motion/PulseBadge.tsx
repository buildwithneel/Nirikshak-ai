import React from 'react';

interface PulseBadgeProps {
  status: 'compliant' | 'review' | 'violation' | 'active';
  label: string;
  className?: string;
  icon?: React.ReactNode;
}

export const PulseBadge: React.FC<PulseBadgeProps> = ({
  status,
  label,
  className = '',
  icon,
}) => {
  const styles = {
    compliant: 'bg-govgreen-100 text-govgreen-900 border-govgreen-200',
    review: 'bg-govamber-100 text-govamber-700 border-govamber-200 animate-amber-pulse',
    violation: 'bg-govred-100 text-govred-700 border-govred-200',
    active: 'bg-govgreen-100 text-govgreen-900 border-govgreen-200 animate-soft-pulse',
  };

  const dotStyles = {
    compliant: 'bg-govgreen-600',
    review: 'bg-govamber-600',
    violation: 'bg-govred-600',
    active: 'bg-govgreen-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${styles[status]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[status]}`} />
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};

export default PulseBadge;
