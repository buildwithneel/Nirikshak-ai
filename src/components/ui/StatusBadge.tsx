import React from 'react';
import { ComplianceStatus } from '../../types';
import { CheckCircle2, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface StatusBadgeProps {
  status: ComplianceStatus | 'COMING_SOON' | 'NEXT_PHASE' | 'WATCHLIST' | 'HIGH_RISK';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
    lg: 'text-sm px-3.5 py-1.5 font-semibold tracking-wide',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  switch (status) {
    case 'COMPLIANT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] font-mono font-bold ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <CheckCircle2 className={`${iconSizes[size]} text-[#166534] flex-shrink-0`} />}
          <span>{t('status.compliant', 'Compliant')}</span>
        </span>
      );

    case 'REVIEW_REQUIRED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-mono font-bold ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <AlertCircle className={`${iconSizes[size]} text-[#B45309] flex-shrink-0`} />}
          <span>{t('status.reviewRequired', 'Requires Review')}</span>
        </span>
      );

    case 'POTENTIAL_VIOLATION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md bg-[#FEE4E2] text-[#B42318] border border-[#FECACA] font-mono font-bold ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <AlertTriangle className={`${iconSizes[size]} text-[#B42318] flex-shrink-0`} />}
          <span>{t('status.potentialViolation', 'Potential Non-Compliance')}</span>
        </span>
      );

    case 'COMING_SOON':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-institutional-subtle text-govink-secondary border border-institutional-border font-mono ${sizeClasses[size]} ${className}`}
        >
          <Clock className={`${iconSizes[size]} text-govink-muted`} />
          <span>{t('status.comingSoon', 'Coming Soon')}</span>
        </span>
      );

    case 'NEXT_PHASE':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-govnavy-100 text-govnavy-900 border border-govnavy-200 font-mono ${sizeClasses[size]} ${className}`}
        >
          <span>{t('status.nextPhase', 'Next Phase')}</span>
        </span>
      );

    case 'HIGH_RISK':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-[#FEE4E2] text-[#B42318] border border-[#FECACA] font-mono ${sizeClasses[size]} ${className}`}
        >
          <AlertTriangle className={`${iconSizes[size]} text-[#B42318]`} />
          <span>{t('status.highRisk', 'High Risk')}</span>
        </span>
      );

    case 'WATCHLIST':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-mono ${sizeClasses[size]} ${className}`}
        >
          <AlertCircle className={`${iconSizes[size]} text-[#B45309]`} />
          <span>{t('status.watchlist', 'Watchlist')}</span>
        </span>
      );

    default:
      return null;
  }
};
