import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';
import { useTheme, Theme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'compact';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon', className = '' }) => {
  const { theme, effectiveTheme, setTheme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const getIcon = (t: Theme | 'effective') => {
    if (t === 'light' || (t === 'effective' && effectiveTheme === 'light')) {
      return <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 hover:rotate-45" />;
    }
    if (t === 'dark' || (t === 'effective' && effectiveTheme === 'dark')) {
      return <Moon className="w-4 h-4 text-emerald-400 transition-transform duration-300 hover:-rotate-12" />;
    }
    return <Laptop className="w-4 h-4 text-institutional-500 dark:text-institutional-400" />;
  };

  const getLabel = (t: Theme) => {
    switch (t) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`relative inline-flex items-center justify-center p-2 rounded-lg border border-institutional-200 dark:border-institutional-800 bg-white dark:bg-[#131B17] text-institutional-700 dark:text-institutional-200 hover:bg-institutional-50 dark:hover:bg-[#1A2420] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-govgreen-500/20 ${className}`}
        title={`Theme: ${getLabel(theme)} (Click to switch)`}
        aria-label="Toggle visual theme"
      >
        <span className="transition-all duration-300">
          {getIcon('effective')}
        </span>
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-institutional-200 dark:border-institutional-800 bg-white dark:bg-[#131B17] text-xs font-medium text-institutional-700 dark:text-institutional-200 hover:bg-institutional-50 dark:hover:bg-[#1A2420] transition-colors"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          {getIcon('effective')}
          <span className="capitalize">{getLabel(theme)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-institutional-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-1.5 w-32 rounded-lg border border-institutional-200 dark:border-institutional-800 bg-white dark:bg-[#131B17] shadow-elevated py-1 z-50 animate-scale-in">
            {(['light', 'dark', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTheme(t);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                  theme === t
                    ? 'bg-govgreen-50 dark:bg-govgreen-950/40 text-govgreen-800 dark:text-govgreen-300 font-semibold'
                    : 'text-institutional-700 dark:text-institutional-300 hover:bg-institutional-50 dark:hover:bg-[#1A2420]'
                }`}
              >
                {getIcon(t)}
                <span>{getLabel(t)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default: interactive icon cycle button
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-institutional-200 dark:border-institutional-800 bg-white dark:bg-[#131B17] text-institutional-700 dark:text-institutional-200 hover:bg-institutional-50 dark:hover:bg-[#1A2420] transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-govgreen-500/20 active:scale-95 ${className}`}
      title={`Current: ${getLabel(theme)} theme. Click to toggle.`}
      aria-label="Toggle theme"
    >
      <div className="transition-transform duration-300">
        {getIcon('effective')}
      </div>
    </button>
  );
};
