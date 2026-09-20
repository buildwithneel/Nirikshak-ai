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
      border: 'border-institutional-200 dark:border-institutional-800',
      iconBg: 'bg-institutional-100 dark:bg-[#1C2721] text-govgreen-800 dark:text-govgreen-300',
      accent: 'border-l-govgreen-800 dark:border-l-govgreen-500',
    },
    compliant: {
      border: 'border-emerald-200 dark:border-emerald-900/60',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
      accent: 'border-l-emerald-600 dark:border-l-emerald-500',
    },
    review: {
      border: 'border-amber-200 dark:border-amber-900/60',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
      accent: 'border-l-amber-500 dark:border-l-amber-400',
    },
    violation: {
      border: 'border-red-200 dark:border-red-900/60',
      iconBg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300',
      accent: 'border-l-red-600 dark:border-l-red-500',
    },
  };

  const style = variantStyles[variant];

  const getTrendElement = () => {
    if (!trend) return null;
    const isUp = trend.value > 0;
    const isNeutral = trend.value === 0;

    const isGood =
      trend.isPositiveGood !== undefined
        ? isUp
          ? trend.isPositiveGood
          : !trend.isPositiveGood
        : isUp;

    const colorClass = isNeutral
      ? 'text-institutional-700 dark:text-institutional-300 bg-institutional-100 dark:bg-institutional-800 border-institutional-300 dark:border-institutional-700'
      : isGood
      ? 'text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/80'
      : 'text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800/80';

    const labelColorClass = isNeutral
      ? 'text-institutional-700 dark:text-institutional-300'
      : isGood
      ? 'text-emerald-800 dark:text-emerald-300'
      : 'text-red-800 dark:text-red-300';

    return (
      <div
        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-mono font-semibold border ${colorClass}`}
      >
        {isNeutral ? (
          <Minus className="w-3 h-3" />
        ) : isUp ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        <span className="tabular-nums">{Math.abs(trend.value)}%</span>
        {trend.label && (
          <span className={`${labelColorClass} font-semibold ml-1 hidden sm:inline`}>
            {trend.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`bg-white dark:bg-[#131B17] rounded-2xl border ${style.border} border-l-4 ${style.accent} p-4 sm:p-5 shadow-subtle flex flex-col justify-between transition-all hover-lift duration-200`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-institutional-700 dark:text-institutional-300 font-mono">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-institutional-900 dark:text-white mt-1 tracking-tight tabular-nums">
            {typeof value === 'number' ? <CountUp end={value} /> : value}
          </div>
        </div>
        <div
          className={`p-2.5 rounded-xl ${style.iconBg} shrink-0 border border-black/5 dark:border-white/5 transition-transform duration-200 hover:scale-110`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-institutional-100 dark:border-institutional-800/80 flex items-center justify-between text-xs text-institutional-700 dark:text-institutional-300 font-medium">
        <div className="truncate text-[11px]">{subtitle || 'Legal Metrology Rules'}</div>
        <div>{getTrendElement()}</div>
      </div>
    </div>
  );
};
export default StatCard;
