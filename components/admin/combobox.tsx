'use client';

import * as React from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Extra searchable text (e.g. team tag, country code) matched alongside label. */
  keywords?: string;
}

interface ComboboxProps {
  /** Name of the hidden input that carries the submitted value. */
  name: string;
  options: ComboboxOption[];
  /** Currently stored value (option value, or free text when freeText is set). */
  defaultValue?: string;
  placeholder?: string;
  /** Shown as the selected state for an empty value (e.g. "Free Agent"). */
  emptyOptionLabel?: string;
  /** Allow submitting text that doesn't match any option (e.g. custom region). */
  freeText?: boolean;
  /** When set, typing (≥2 chars) queries this URL (?q=...) instead of filtering
      the options array — server-side search over the whole database. */
  searchUrl?: string;
  inputClassName?: string;
  ariaLabel?: string;
}

const DEFAULT_CLS =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';

/**
 * Type-ahead select for admin forms: typing filters options by substring against
 * label + keywords ("soul" finds "Team Soul"). Backed by a hidden input so it
 * submits like a native <select>.
 */
export function Combobox({
  name,
  options,
  defaultValue = '',
  placeholder = 'Type to search…',
  emptyOptionLabel,
  freeText = false,
  searchUrl,
  inputClassName,
  ariaLabel,
}: ComboboxProps) {
  const inputCls = inputClassName ?? DEFAULT_CLS;
  const [value, setValue] = React.useState(defaultValue);
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  // Server-side search state (only active when searchUrl is provided)
  const [remoteOptions, setRemoteOptions] = React.useState<ComboboxOption[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchFailed, setSearchFailed] = React.useState(false);
  const searchSeqRef = React.useRef(0);

  React.useEffect(() => {
    if (!searchUrl) return;
    const term = query.trim();
    if (term.length < 2) {
      setRemoteOptions([]);
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
        if (seq !== searchSeqRef.current) return;
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (seq !== searchSeqRef.current) return;
        setRemoteOptions(Array.isArray(data.options) ? data.options : []);
        setSearchFailed(false);
      } catch {
        if (seq === searchSeqRef.current) setSearchFailed(true);
      } finally {
        if (seq === searchSeqRef.current) setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, searchUrl]);

  const selected = [...remoteOptions, ...options].find((o) => o.value === value);
  const displayValue = selected ? selected.label : freeText ? value : emptyOptionLabel && !value ? '' : value;

  const localFiltered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === displayValue.toLowerCase()) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.keywords ?? '').toLowerCase().includes(q)
    );
  }, [options, query, displayValue]);

  const filtered =
    searchUrl && query.trim().length >= 2 ? remoteOptions : localFiltered;

  const commit = React.useCallback(
    (next: string) => {
      setValue(next);
      setQuery('');
      setOpen(false);
    },
    []
  );

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        commit(value);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, value, commit]);

  // Keep highlighted row in view
  React.useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const beginEdit = () => {
    setQuery(displayValue);
    setOpen(true);
    setHighlight(0);
  };

  const pick = (option: ComboboxOption | null) => commit(option ? option.value : '');

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        beginEdit();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) pick(filtered[highlight]);
      else if (freeText) commit(query.trim());
      else commit(value);
    } else if (e.key === 'Escape') {
      commit(value);
    }
  };

  const showClear = emptyOptionLabel !== undefined && value !== '';

  const listId = React.useId();

  return (
    <div ref={wrapRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel}
          className={inputCls + ' pr-14'}
          value={open ? query : displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={beginEdit}
          onKeyDown={onKeyDown}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
          {showClear && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(null);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={
              'w-4 h-4 text-slate-400 transition-transform pointer-events-none ' +
              (open ? 'rotate-180' : '')
            }
          />
        </div>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 text-sm"
          role="listbox"
        >
          {emptyOptionLabel !== undefined && (
            <ComboboxRow
              label={emptyOptionLabel}
              active={highlight === 0}
              selected={value === ''}
              onMouseDown={() => pick(null)}
              onMouseEnter={() => setHighlight(0)}
            />
          )}
          {filtered.map((o, i) => {
            const idx = emptyOptionLabel !== undefined ? i + 1 : i;
            return (
              <ComboboxRow
                key={o.value}
                label={o.label}
                active={highlight === idx}
                selected={o.value === value}
                onMouseDown={() => pick(o)}
                onMouseEnter={() => setHighlight(idx)}
              />
            );
          })}
          {isSearching && (
            <li className="px-3 py-2 text-slate-400">Searching…</li>
          )}
          {!isSearching && searchFailed && (
            <li className="px-3 py-2 text-rose-500">Search failed — retry</li>
          )}
          {filtered.length === 0 &&
            (freeText ? (
              <li
                className="px-3 py-2 text-(--ed-blue) font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(query.trim());
                }}
              >
                Use &ldquo;{query.trim()}&rdquo;
              </li>
            ) : (
              <li className="px-3 py-2 text-slate-400">No matches</li>
            ))}
        </ul>
      )}
    </div>
  );
}

function ComboboxRow({
  label,
  active,
  selected,
  onMouseDown,
  onMouseEnter,
}: {
  label: string;
  active: boolean;
  selected: boolean;
  onMouseDown: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <li
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
      onMouseEnter={onMouseEnter}
      className={
        'px-3 py-2 cursor-pointer flex items-center justify-between gap-2 ' +
        (active ? 'bg-(--ed-blue)/10 dark:bg-(--ed-blue)/20' : '')
      }
    >
      <span className={selected ? 'font-bold text-(--ed-blue) dark:text-blue-400' : ''}>{label}</span>
      {selected && <span className="text-[10px] font-bold uppercase text-(--ed-blue) dark:text-blue-400">✓</span>}
    </li>
  );
}
