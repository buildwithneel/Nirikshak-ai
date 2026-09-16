import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './locales/en.json';
import hi from './locales/hi.json';
import gu from './locales/gu.json';

export type SupportedLanguage = 'en' | 'hi' | 'gu';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'gu', label: 'Gujarati', nativeName: 'ગુજરાતી' },
];

const dictionaries: Record<SupportedLanguage, any> = {
  en,
  hi,
  gu,
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (keyPath: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'nirikshak_selected_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'hi' || saved === 'gu') {
        return saved;
      }
    } catch (e) {
      console.error('Failed reading language from localStorage', e);
    }
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch (e) {
      console.error('Failed saving language', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (keyPath: string, fallback?: string): string => {
    const keys = keyPath.split('.');
    
    // Attempt lookup in current language
    let current: any = dictionaries[language];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        current = undefined;
        break;
      }
    }

    if (typeof current === 'string') {
      return current;
    }

    // Fallback to English
    let enCurrent: any = dictionaries['en'];
    for (const key of keys) {
      if (enCurrent && typeof enCurrent === 'object' && key in enCurrent) {
        enCurrent = enCurrent[key];
      } else {
        enCurrent = undefined;
        break;
      }
    }

    if (typeof enCurrent === 'string') {
      return enCurrent;
    }

    return fallback || keyPath;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
