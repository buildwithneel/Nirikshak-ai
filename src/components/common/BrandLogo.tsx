import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'icon' | 'text' | 'horizontal';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showSubtitle = false,
  className = '',
}) => {
  const iconSizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  const textSizeClasses = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <img
          src="/logo.png"
          alt="Nirikshak-AI Logo"
          className={`${
            size === 'xl' ? 'max-w-[280px]' : size === 'lg' ? 'max-w-[220px]' : 'max-w-[180px]'
          } w-auto h-auto object-contain drop-shadow-sm`}
        />
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-2xl bg-white dark:bg-[#15201A] p-1 shadow-sm border border-institutional-200/80 dark:border-institutional-800 ${iconSizeClasses} ${className}`}
      >
        <img
          src="/logo-icon.png"
          alt="Nirikshak-AI Emblem"
          className="w-full h-full object-contain rounded-xl"
        />
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`font-display font-extrabold tracking-tight ${textSizeClasses} ${className}`}>
        <span className="text-[#0B2545] dark:text-white">Nirikshak</span>
        <span className="text-[#16A34A] dark:text-[#22C55E] ml-0.5">-AI</span>
      </div>
    );
  }

  // Default 'horizontal' variant
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`shrink-0 rounded-xl bg-white dark:bg-[#15201A] p-0.5 shadow-xs border border-institutional-200/80 dark:border-institutional-800 flex items-center justify-center ${iconSizeClasses}`}
      >
        <img
          src="/logo-icon.png"
          alt="Nirikshak-AI"
          className="w-full h-full object-contain rounded-lg"
        />
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold tracking-tight font-display ${textSizeClasses}`}>
            <span className="text-[#0B2545] dark:text-white">Nirikshak</span>
            <span className="text-[#16A34A] dark:text-[#22C55E] ml-0.5">-AI</span>
          </span>
          <span className="text-[9px] font-mono font-bold bg-govgreen-50 dark:bg-govgreen-950 text-govgreen-800 dark:text-govgreen-300 px-1 py-0.2 rounded border border-govgreen-200 dark:border-govgreen-800">
            PCR
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] text-institutional-500 dark:text-institutional-400 font-medium tracking-tight">
            Legal Metrology Enforcement
          </span>
        )}
      </div>
    </div>
  );
};
