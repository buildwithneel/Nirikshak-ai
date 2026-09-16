import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  footer,
  className = '',
  bodyClassName = '',
  noPadding = false,
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-institutional-border shadow-subtle overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="px-4 sm:px-5 py-3 border-b border-institutional-border/80 flex items-center justify-between gap-3 bg-institutional-subtle/70">
          <div className="min-w-0">
            {typeof title === 'string' ? (
              <h3 className="font-bold text-govink-primary text-sm sm:text-base tracking-tight truncate">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-govink-secondary mt-0.5 leading-relaxed line-clamp-1 sm:line-clamp-none">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className={`${noPadding ? '' : 'p-4 sm:p-5'} ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className="px-4 sm:px-5 py-3 border-t border-institutional-border bg-institutional-subtle/50 text-xs text-govink-secondary">
          {footer}
        </div>
      )}
    </div>
  );
};
