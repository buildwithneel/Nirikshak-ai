import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, FileSearch, AlertTriangle, Package, BookOpen, ArrowRight } from 'lucide-react';
import { dashboardApi, SearchResultItem } from '../../services/api/dashboardApi';

interface AnimatedSearchBarProps {
  className?: string;
  placeholder?: string;
}

export const AnimatedSearchBar: React.FC<AnimatedSearchBarProps> = ({
  className = '',
  placeholder = 'Search inspections, complaints, rules, or commodities... (Ctrl+K)',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await dashboardApi.search(query.trim());
        setResults(res || []);
        setSelectedIndex(-1);
      } catch (err) {
        console.warn('Live search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 240);

    return () => clearTimeout(timer);
  }, [query]);

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (query.trim()) {
        navigate(`/inspections?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');
    navigate(item.url);
  };

  const getTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'INSPECTION':
        return <FileSearch className="w-3.5 h-3.5 text-govgreen-600 dark:text-govgreen-400" />;
      case 'COMPLAINT':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'PRODUCT':
        return <Package className="w-3.5 h-3.5 text-govnavy-600 dark:text-govnavy-400" />;
      case 'RULE':
        return <BookOpen className="w-3.5 h-3.5 text-govteal-600 dark:text-govteal-400" />;
      default:
        return <Search className="w-3.5 h-3.5 text-institutional-500" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative flex-1 max-w-md ${className}`}>
      {/* Search Input Container */}
      <div
        className={`relative flex items-center transition-all duration-200 rounded-xl border ${
          isOpen
            ? 'bg-white dark:bg-[#131B17] border-govgreen-600 dark:border-govgreen-500 ring-2 ring-govgreen-600/20 shadow-elevated'
            : 'bg-institutional-100/80 dark:bg-[#16201B] border-institutional-200 dark:border-institutional-800 hover:border-institutional-300 dark:hover:border-institutional-700'
        }`}
      >
        <Search className="w-4 h-4 text-institutional-400 dark:text-institutional-500 ml-3 shrink-0 pointer-events-none" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-2 text-xs text-institutional-900 dark:text-institutional-100 placeholder:text-institutional-400 dark:placeholder:text-institutional-500 focus:outline-none"
          aria-label="Universal institutional search"
        />

        {/* Right Adornments: Loading Spinner, Clear Button, or Shortcut Badge */}
        <div className="flex items-center gap-1.5 mr-2 shrink-0">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-govgreen-600 dark:text-govgreen-400 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-institutional-400 hover:text-institutional-700 dark:hover:text-institutional-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-institutional-500 dark:text-institutional-400 bg-institutional-200/70 dark:bg-[#1E2923] rounded border border-institutional-300/50 dark:border-institutional-700">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Floating Search Results Dropdown */}
      {isOpen && (query.trim().length > 0 || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#131B17] border border-institutional-200 dark:border-institutional-800 rounded-2xl shadow-modal overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="px-3 py-2 bg-institutional-50 dark:bg-[#19241F] border-b border-institutional-100 dark:border-institutional-800 flex items-center justify-between text-[11px] text-institutional-500 dark:text-institutional-400 font-mono">
            <span>REGISTRY INTELLIGENCE</span>
            <span>{results.length} results</span>
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-institutional-100 dark:divide-institutional-800/60">
            {isLoading && results.length === 0 ? (
              <div className="p-6 text-center text-xs text-institutional-400">
                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-govgreen-600" />
                Scanning statutory records...
              </div>
            ) : results.length > 0 ? (
              results.map((item, index) => {
                const isHighlighted = selectedIndex === index;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between p-3 text-left transition-colors cursor-pointer ${
                      isHighlighted
                        ? 'bg-govgreen-50/80 dark:bg-govgreen-950/40 text-govgreen-950 dark:text-govgreen-100'
                        : 'hover:bg-institutional-50 dark:hover:bg-[#1A2420] text-institutional-800 dark:text-institutional-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-institutional-100 dark:bg-[#1E2923] shrink-0 mt-0.5">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          <span>{item.title}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                              item.type === 'COMPLAINT'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-govgreen-100 dark:bg-govgreen-950/60 text-govgreen-800 dark:text-govgreen-300'
                            }`}
                          >
                            {item.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-institutional-500 dark:text-institutional-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-3.5 h-3.5 text-institutional-400 transition-transform ${
                        isHighlighted ? 'translate-x-1 text-govgreen-600 dark:text-govgreen-400' : ''
                      }`}
                    />
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-institutional-400">
                No matching records found for "{query}".
                <div className="mt-1 text-[11px] text-institutional-500">
                  Try searching by Inspection ID, Brand name, or PCR Rule.
                </div>
              </div>
            )}
          </div>

          {/* Quick Footer */}
          <div className="px-3 py-2 bg-institutional-50 dark:bg-[#19241F] border-t border-institutional-100 dark:border-institutional-800 flex items-center justify-between text-[10px] text-institutional-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-institutional-200 dark:bg-[#131B17] rounded border border-institutional-300 dark:border-institutional-700 font-mono">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-institutional-200 dark:bg-[#131B17] rounded border border-institutional-300 dark:border-institutional-700 font-mono">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-institutional-200 dark:bg-[#131B17] rounded border border-institutional-300 dark:border-institutional-700 font-mono">esc</kbd> Dismiss
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
