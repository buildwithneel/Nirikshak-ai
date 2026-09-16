import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

import { CountUp } from '../motion/CountUp';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositiveGood?: boolean;
    label?: string;
  };
  icon: React.ReactNode;
  variant?: 'default' | 'compliant' | 'review' | 'violation';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
}) => {
  const variantStyles = {
    default: {
      border: 'border-institutional-border',
      iconBg: 'bg-institutional-subtle text-govgreen-900',
      accent: 'border-l-govgreen-900',
    },
    compliant: {
      border: 'border-[#BBF7D0]',
      iconBg: 'bg-[#DCFCE7] text-[#166534]',
      accent: 'border-l-[#166534]',
    },
    review: {
      border: 'border-[#FDE68A]',
      iconBg: 'bg-[#FEF3C7] text-[#B45309]',
      accent: 'border-l-[#B45309]',
    },
    violation: {
      border: 'border-[#FECACA]',
      iconBg: 'bg-[#FEE4E2] text-[#B42318]',
      accent: 'border-l-[#B42318]',
    },
  };

  const style = variantStyles[variant];

  const getTrendElement = () => {
    if (!trend) return null;
    const isUp = trend.value > 0;
    const isNeutral = trend.value === 0;

    const isGood = trend.isPositiveGood !== undefined
      ? (isUp ? trend.isPositiveGood : !trend.isPositiveGood)
      : isUp;

    const colorClass = isNeutral
      ? 'text-ink-muted bg-cream-200'
      : isGood
      ? 'text-[#065F46] bg-[#ECFDF5] border-[#A7F3D0]'
      : 'text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]';

    return (
      <div className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-mono font-semibold border ${colorClass}`}>
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isUp ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        <span>{Math.abs(trend.value)}%</span>
        {trend.label && <span className="text-ink-muted font-normal ml-0.5 hidden sm:inline">{trend.label}</span>}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl border ${style.border} border-l-4 ${style.accent} p-4 sm:p-5 shadow-subtle flex flex-col justify-between transition-all hover-lift animate-page-enter`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-govink-secondary font-mono">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-govink-primary mt-1 tracking-tight">
            {typeof value === 'number' ? <CountUp end={value} /> : value}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${style.iconBg} flex-shrink-0 border border-institutional-border/80 transition-transform duration-200 hover:scale-110`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-institutional-border flex items-center justify-between text-xs text-govink-secondary">
        <div className="truncate text-[11px]">{subtitle || 'Legal Metrology Rules'}</div>
        <div>{getTrendElement()}</div>
      </div>
    </div>
  );
};

