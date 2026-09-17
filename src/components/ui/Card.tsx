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
      className={`bg-white dark:bg-[#131B17] rounded-2xl border border-institutional-200 dark:border-institutional-800 shadow-subtle overflow-hidden transition-colors duration-200 ${className}`}
    >
      {(title || action) && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-institutional-100 dark:border-institutional-800 flex items-center justify-between gap-3 bg-institutional-50/70 dark:bg-[#19241F]/70">
          <div className="min-w-0">
            {typeof title === 'string' ? (
              <h3 className="font-bold text-institutional-900 dark:text-white text-sm sm:text-base tracking-tight truncate font-card-title">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-institutional-500 dark:text-institutional-400 mt-0.5 leading-relaxed line-clamp-1 sm:line-clamp-none">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className={`${noPadding ? '' : 'p-4 sm:p-5'} ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className="px-4 sm:px-5 py-3 border-t border-institutional-100 dark:border-institutional-800 bg-institutional-50/50 dark:bg-[#19241F]/50 text-xs text-institutional-500 dark:text-institutional-400">
          {footer}
        </div>
      )}
    </div>
  );
};
export default Card;
