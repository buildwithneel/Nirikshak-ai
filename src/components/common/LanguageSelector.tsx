import React, { useState, useRef, useEffect } from 'react';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { useLanguage, LANGUAGE_OPTIONS, SupportedLanguage } from '../../i18n/LanguageContext';

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  compact = false,
  className = '',
}) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = LANGUAGE_OPTIONS.find(opt => opt.code === language) || LANGUAGE_OPTIONS[0];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cream-400 bg-cream-100 hover:bg-cream-200 text-ink-primary text-xs font-semibold shadow-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-forest-600"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Change Language / भाषा बदलें"
      >
        <Languages className="w-3.5 h-3.5 text-forest-700 flex-shrink-0" />
        <span className="hidden sm:inline">{currentOption.nativeName}</span>
        <span className="sm:hidden font-mono uppercase text-[10px]">{currentOption.code}</span>
        <ChevronDown className={`w-3 h-3 text-ink-muted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-cream-100 border border-cream-400 shadow-modal py-1 z-50 animate-fadeIn">
          <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase text-ink-muted border-b border-cream-300">
            Language / भाषा
          </div>
          {LANGUAGE_OPTIONS.map(opt => {
            const isSelected = opt.code === language;
            return (
              <button
                key={opt.code}
                onClick={() => {
                  setLanguage(opt.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-forest-50 text-forest-800 font-bold'
                    : 'text-ink-primary hover:bg-cream-200'
                }`}
              >
                <div>
                  <div className="leading-tight">{opt.nativeName}</div>
                  <div className="text-[10px] text-ink-muted leading-tight">{opt.label}</div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-forest-700" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
