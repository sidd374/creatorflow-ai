import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, Search, ChevronDown } from 'lucide-react';
import { LANGUAGES } from '../../data/languages';
import { Language } from '../../types';

interface LanguageSelectorProps {
  selectedLanguage: string; // language id or name
  onSelectLanguage: (lang: Language) => void;
  variant?: 'popover' | 'compact' | 'simple';
  className?: string;
  label?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  variant = 'popover',
  className = '',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang =
    LANGUAGES.find(
      (l) =>
        l.id.toLowerCase() === selectedLanguage.toLowerCase() ||
        l.name.toLowerCase() === selectedLanguage.toLowerCase()
    ) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLanguages = LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lang.nativeName && lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (variant === 'simple') {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && <label className="text-xs font-semibold text-neutral-700 tracking-tight">{label}</label>}
        <div className="relative">
          <select
            value={activeLang.id}
            onChange={(e) => {
              const found = LANGUAGES.find((l) => l.id === e.target.value);
              if (found) onSelectLanguage(found);
            }}
            className="w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} {l.nativeName ? `(${l.nativeName})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        </div>
      </div>
    );
  }

  const isCompact = variant === 'compact';

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {label && <span className="block text-xs font-semibold text-neutral-700 mb-1.5">{label}</span>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Select content language (${activeLang.name})`}
        className={`inline-flex items-center justify-between gap-2 bg-white text-neutral-800 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 whitespace-nowrap ${
          isCompact ? 'px-2.5 py-1.5 text-xs font-medium' : 'w-full px-3.5 py-2 text-sm font-medium'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <span className="whitespace-nowrap">{activeLang.name}</span>
          {!isCompact && activeLang.nativeName && activeLang.nativeName !== activeLang.name && (
            <span className="text-xs text-neutral-400 whitespace-nowrap hidden md:inline">
              · {activeLang.nativeName}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white p-2 shadow-[0_12px_36px_rgba(0,0,0,0.12)] border border-neutral-200/90 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative mb-2 px-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search 20+ languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-neutral-900 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto pr-1 space-y-0.5">
            {filteredLanguages.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-400">
                No languages found matching "{searchQuery}"
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = lang.id === activeLang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => {
                      onSelectLanguage(lang);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs rounded-xl transition-colors ${
                      isSelected
                        ? 'bg-neutral-900 text-white font-medium'
                        : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-500'}`}>
                        {lang.code}
                      </span>
                      <span className="truncate">{lang.name}</span>
                      {lang.nativeName && (
                        <span className={`truncate text-[11px] ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                          ({lang.nativeName})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-neutral-800 text-neutral-200'
                            : lang.supportTier === 'full'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {lang.supportTier === 'full' ? 'Full' : 'Titles'}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          <div className="mt-2 pt-2 border-t border-neutral-100 px-2 flex items-center justify-between gap-2 text-[10px] text-neutral-500">
            <span>Full packs: 6 languages</span>
            <span className="text-neutral-600 font-medium">Localized titles: +15 more</span>
          </div>
        </div>
      )}
    </div>
  );
};
