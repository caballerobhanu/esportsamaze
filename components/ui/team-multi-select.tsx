'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface TeamMultiSelectOption {
  value: string;
  label: string;
  subtitle?: string | null;
  imageUrl?: string | null;
}

/** A named bucket of values that can be added to the selection in one click. */
export interface TeamMultiSelectGroup {
  label: string;
  values: string[];
}

export interface TeamMultiSelectProps {
  options: TeamMultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Quick-add chips — e.g. one per stage, adding every team that played it. */
  quickSelectGroups?: TeamMultiSelectGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Set equality for the quick-pick's "is this exact stage showing?" check. */
function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

/**
 * Multi-select team picker: a searchable checkbox dropdown with optional quick-add buckets.
 *
 * The value is a plain `string[]` of team ids; an empty array means "all teams", matching the
 * way the Statistics tab's stage filter treats "no stages selected". The popover follows the
 * same interaction conventions as `SearchableSelect` (outside-click close, search autofocus,
 * Esc to close) so the two controls feel like one family.
 */
export function TeamMultiSelect({
  options,
  value,
  onChange,
  quickSelectGroups,
  placeholder = 'All teams',
  searchPlaceholder = 'Search teams…',
  className = '',
  disabled = false,
}: TeamMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => new Set(value), [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        (opt.subtitle ? opt.subtitle.toLowerCase().includes(term) : false),
    );
  }, [options, searchTerm]);

  const commit = (next: string[]) => {
    // De-dupe and keep the option order stable so the count never lies.
    const wanted = new Set(next);
    onChange(options.filter((opt) => wanted.has(opt.value)).map((opt) => opt.value));
  };

  const toggleTeam = (id: string) => {
    commit(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  // A stage quick-pick is exclusive: choosing one stage shows exactly its field, choosing
  // a different one replaces it, and choosing the active one clears back to all teams.
  // Manually toggling a team afterwards simply falls off the stage (no group matches the
  // set any more), so the chips read as a single-choice shortcut over the checkbox list.
  const activeGroupLabel = useMemo(
    () =>
      (quickSelectGroups ?? []).find((g) => g.values.length > 0 && sameSet(g.values, value))?.label ??
      null,
    [quickSelectGroups, value],
  );

  const selectGroup = (group: TeamMultiSelectGroup) => {
    if (group.label === activeGroupLabel) commit([]);
    else commit(group.values);
  };

  const label = value.length === 0 ? placeholder : `Teams (${value.length})`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex w-full items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
          isOpen
            ? 'border-[#0A5FC4] bg-white shadow-sm ring-2 ring-[#0A5FC4]/20 dark:bg-[#0b1220]'
            : 'border-slate-200 bg-slate-50/90 text-slate-900 hover:border-slate-300 dark:border-white/10 dark:bg-[#141e33] dark:text-white hover:dark:border-white/20'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <span className={`truncate ${value.length === 0 ? 'text-slate-400 dark:text-slate-500' : ''}`}>
            {label}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#0A5FC4]' : ''
            }`}
          />
        </button>
        {value.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            aria-label="Clear team filter"
            onClick={() => onChange([])}
            className="shrink-0 rounded-full p-0.5 text-slate-400 transition hover:text-slate-600 disabled:opacity-50 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute left-0 top-full z-[100] mt-1.5 w-full min-w-[260px] rounded-xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsOpen(false);
                  setSearchTerm('');
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-[#0A5FC4] focus:outline-none focus:ring-1 focus:ring-[#0A5FC4] dark:border-white/10 dark:bg-[#141e33] dark:text-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mb-2 flex items-center justify-between px-3">
            <button
              type="button"
              onClick={() => commit(options.map((opt) => opt.value))}
              className="text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] transition hover:opacity-70 dark:text-blue-300"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={value.length === 0}
              className="text-[10px] font-black uppercase tracking-wider text-slate-400 transition hover:text-slate-600 disabled:opacity-40 dark:hover:text-white"
            >
              Clear
            </button>
          </div>

          {quickSelectGroups && quickSelectGroups.length > 0 && (
            <div className="mb-2 border-b border-slate-100 pb-2 dark:border-white/10">
              <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Add a whole stage
              </p>
              <div className="space-y-0.5">
                {quickSelectGroups.map((group) => {
                  const active = group.label === activeGroupLabel;
                  return (
                    <button
                      key={group.label}
                      type="button"
                      onClick={() => selectGroup(group)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-bold transition-colors ${
                        active
                          ? 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/25 dark:text-blue-300'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                      }`}
                    >
                      <span className="min-w-0 truncate">{group.label}</span>
                      <span
                        className={`shrink-0 text-[10px] font-black ${
                          active ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'
                        }`}
                      >
                        {group.values.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs font-semibold text-slate-400">
                No teams match &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleTeam(opt.value)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/25 dark:text-blue-300'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-[#0A5FC4] bg-[#0A5FC4] text-white'
                          : 'border-slate-300 dark:border-white/20'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    {opt.imageUrl ? (
                      <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-black/40">
                        {/* same-origin /api/media asset, matching the rest of the filter chrome */}
                        <img src={opt.imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {opt.subtitle && (
                      <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">
                        {opt.subtitle}
                      </span>
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
