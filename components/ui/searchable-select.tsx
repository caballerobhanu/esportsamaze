'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SearchableSelectProps {
  name?: string;
  options: SearchableSelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  /** When set, typing queries this URL (?q=...) instead of filtering the
      options array — server-side search over the whole database. */
  searchUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'admin';
  triggerClassName?: string;
  showInitialsFallback?: boolean;
  onChange?: (value: string) => void;
  /** Called whenever remote search results are fetched, useful for caching option labels. */
  onRemoteOptions?: (opts: SearchableSelectOption[]) => void;
  className?: string;
  disabled?: boolean;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return <>{text}</>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <span className="text-[#0A5FC4] dark:text-blue-400 font-black bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/25 px-0.5 rounded">
        {match}
      </span>
      <HighlightMatch text={after} query={query} />
    </>
  );
}

export function SearchableSelect({
  name,
  options,
  value: controlledValue,
  defaultValue = '',
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  showSearch = true,
  searchUrl,
  size = 'md',
  triggerClassName,
  showInitialsFallback = false,
  onChange,
  onRemoteOptions,
  className = '',
  disabled = false,
}: SearchableSelectProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    isControlled ? controlledValue : defaultValue
  );

  const selectedValue = isControlled ? controlledValue : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Server-side search state (only active when searchUrl is provided)
  const isRemote = Boolean(searchUrl);
  const [remoteOptions, setRemoteOptions] = useState<SearchableSelectOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const searchSeqRef = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  // Selected option lookup (may come from remote search results)
  const allKnownOptions = React.useMemo(
    () => (remoteOptions.length > 0 ? [...options, ...remoteOptions] : options),
    [options, remoteOptions]
  );
  const selectedOption = allKnownOptions.find((opt) => opt.value === selectedValue);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && showSearch) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showSearch]);

  // Server-side search: debounce typing, fetch matches, drop stale responses
  useEffect(() => {
    if (!searchUrl) return;
    const term = searchTerm.trim();
    if (term.length < 2) {
      // Keep remoteOptions — the selected value may be one of them; the
      // displayed list already falls back to the local options here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSearching(false);
      setSearchFailed(false);
      return;
    }

    const seq = ++searchSeqRef.current;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${searchUrl}${searchUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(term)}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (seq !== searchSeqRef.current) return; // a newer query superseded this one
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (seq !== searchSeqRef.current) return;
        const fetched = Array.isArray(data.options) ? data.options : [];
        setRemoteOptions(fetched);
        if (fetched.length > 0) onRemoteOptions?.(fetched);
        setSearchFailed(false);
      } catch {
        if (seq === searchSeqRef.current) setSearchFailed(true);
      } finally {
        if (seq === searchSeqRef.current) setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, searchUrl]);

  // Client-side filter for the local options list
  const localFiltered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(term);
      const matchSub = opt.subtitle ? opt.subtitle.toLowerCase().includes(term) : false;
      const matchVal = opt.value.toLowerCase().includes(term);
      return matchLabel || matchSub || matchVal;
    });
  }, [options, searchTerm]);

  // What the dropdown displays: remote results while a remote query is active,
  // otherwise the (filtered) local list.
  const filteredOptions =
    isRemote && searchTerm.trim().length >= 2 ? remoteOptions : localFiltered;

  // Keep highlightedIndex in bounds when filtered options change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Scroll highlighted item into view if navigating with keyboard
  useEffect(() => {
    if (!isOpen || !optionsListRef.current) return;
    const activeEl = optionsListRef.current.children[highlightedIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (val: string) => {
    if (!isControlled) {
      setInternalValue(val);
    }
    onChange?.(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setSearchTerm(e.key);
      setIsOpen(true);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Size variations
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    admin: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-2xl',
    lg: 'px-5 py-3 text-base rounded-2xl',
  }[size];

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for standard HTML form submissions */}
      {name && <input type="hidden" name={name} value={selectedValue} />}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 font-medium border transition-all text-left cursor-pointer ${
          triggerClassName ? triggerClassName : sizeClasses
        } ${
          isOpen
            ? 'border-[#0A5FC4] ring-2 ring-[#0A5FC4]/20 bg-white dark:bg-[#0b1220] shadow-sm'
            : size === 'admin'
              ? 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white hover:dark:border-slate-600'
              : 'border-slate-200 bg-slate-50/90 text-slate-900 hover:border-slate-300 dark:border-white/10 dark:bg-[#141e33] dark:text-white hover:dark:border-white/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.imageUrl ? (
            <div className="relative w-4 h-4 shrink-0 overflow-hidden rounded border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-black/40">
              <img
                src={selectedOption.imageUrl}
                alt=""
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          ) : selectedOption?.icon ? (
            <selectedOption.icon className="w-3.5 h-3.5 shrink-0 text-[#0A5FC4] dark:text-blue-300" />
          ) : selectedOption && showInitialsFallback ? (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-[8px] font-black text-slate-500 dark:border-white/10 dark:bg-[#141e33] dark:text-slate-400">
              {selectedOption.label.slice(0, 2).toUpperCase()}
            </span>
          ) : null}
          <span className="truncate">
            {selectedOption ? selectedOption.label : (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            )}
          </span>
          {selectedOption?.subtitle && (
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 truncate max-w-[120px]">
              ({selectedOption.subtitle})
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0A5FC4]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full mt-1.5 left-0 right-0 z-[100] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in slide-in-from-top-1 duration-150 min-w-[240px]"
        >
          {/* Search Box */}
          {showSearch && (
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0A5FC4] focus:ring-1 focus:ring-[#0A5FC4] dark:border-white/10 dark:bg-[#141e33] dark:text-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div
            ref={optionsListRef}
            className="max-h-64 overflow-y-auto space-y-0.5 no-scrollbar"
          >
            {isSearching ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400">
                Searching&hellip;
              </div>
            ) : searchFailed ? (
              <div className="py-6 text-center text-xs font-semibold text-rose-500">
                Search failed &mdash; check connection and retry
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400">
                No matching results found for &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === selectedValue;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/25 dark:text-blue-300'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-950 dark:bg-white/10 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/5 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {opt.imageUrl ? (
                        <div className="relative w-5 h-5 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-black/40">
                          <img
                            src={opt.imageUrl}
                            alt=""
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : opt.icon ? (
                        <opt.icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'
                          }`}
                        />
                      ) : showInitialsFallback ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-[9px] font-black text-slate-500 dark:border-white/10 dark:bg-[#141e33] dark:text-slate-400">
                          {opt.label.slice(0, 2).toUpperCase()}
                        </span>
                      ) : null}
                      <span className="truncate">
                        <HighlightMatch text={opt.label} query={searchTerm} />
                      </span>
                      {opt.subtitle && (
                        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                          (<HighlightMatch text={opt.subtitle} query={searchTerm} />)
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#0A5FC4] dark:text-blue-300" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
