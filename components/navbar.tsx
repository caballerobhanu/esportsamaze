'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronDown,
  Menu,
  X,
  Loader2,
  Users,
  User,
  Trophy,
  Gamepad2,
  Newspaper,
  CornerDownLeft,
  ArrowUpDown,
} from 'lucide-react';
import { ModeToggle } from './mode-toggle';
import { cn } from '@/lib/utils';
import { SITE_SLOGAN } from '@/lib/seo';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import type { SearchResultItem } from '@/app/api/search/route';

export const NAV_ITEMS = [
  { label: 'Tournaments', href: gameHref(DEFAULT_GAME_SLUG, 'tournaments') },
  { label: 'Teams', href: gameHref(DEFAULT_GAME_SLUG, 'teams') },
  { label: 'News', href: '/news' },
  { label: 'Rankings', href: gameHref(DEFAULT_GAME_SLUG, 'rankings') },
  { label: 'Support', href: '/about' },
];

type MoreItem = { label: string; href: string } | { label: string; soon: true };

export const MORE_ITEMS: MoreItem[] = [
  { label: 'Players', href: gameHref(DEFAULT_GAME_SLUG, 'players') },
  { label: 'Compare', href: gameHref(DEFAULT_GAME_SLUG, 'compare') },
  { label: 'Statistics', soon: true },
];

const SOON_BADGE_CLASS =
  'rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide dark:border-slate-700';

const NAV_LINK_CLASS =
  'whitespace-nowrap text-sm font-semibold text-white/90 hover:text-white transition-colors duration-150';

const MORE_LINK_CLASS =
  'block rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60';

const DRAWER_LINK_CLASS =
  'block rounded-xl px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-white/15';

interface SearchResponseData {
  teams: SearchResultItem[];
  players: SearchResultItem[];
  tournaments: SearchResultItem[];
  games: SearchResultItem[];
  articles: SearchResultItem[];
}

const EMPTY_RESULTS: SearchResponseData = {
  teams: [],
  players: [],
  tournaments: [],
  games: [],
  articles: [],
};

export function Navbar() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResponseData>(EMPTY_RESULTS);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const lastTriggerRef = React.useRef<HTMLElement | null>(null);
  const moreRef = React.useRef<HTMLDivElement>(null);
  const moreCloseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flattened results for keyboard navigation
  const allResults = React.useMemo(() => {
    return [
      ...searchResults.teams,
      ...searchResults.players,
      ...searchResults.tournaments,
      ...searchResults.games,
      ...searchResults.articles,
    ];
  }, [searchResults]);

  // Focus search input when modal opens
  React.useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => {
        searchInputRef.current?.focus();
        setSelectedIndex(0);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  // Debounced search query fetching
  React.useEffect(() => {
    const query = searchQuery.trim();
    const timeoutId = setTimeout(
      async () => {
        if (!query || query.length < 2) {
          setSearchResults(EMPTY_RESULTS);
          setIsSearching(false);
          return;
        }

        setIsSearching(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=4`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.results) {
              setSearchResults(data.results);
              setSelectedIndex(0);
            }
          }
        } catch (err) {
          console.error('Search fetch error:', err);
        } finally {
          setIsSearching(false);
        }
      },
      query && query.length >= 2 ? 200 : 0
    );

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const openMore = React.useCallback(() => {
    if (moreCloseTimer.current) {
      clearTimeout(moreCloseTimer.current);
      moreCloseTimer.current = null;
    }
    setMoreOpen(true);
  }, []);

  // The panel sits a few px below the trigger, so leaving must not dismiss it
  // instantly — a short grace period lets the pointer cross that gap.
  const closeMoreSoon = React.useCallback(() => {
    if (moreCloseTimer.current) clearTimeout(moreCloseTimer.current);
    moreCloseTimer.current = setTimeout(() => {
      moreCloseTimer.current = null;
      setMoreOpen(false);
    }, 140);
  }, []);

  React.useEffect(
    () => () => {
      if (moreCloseTimer.current) clearTimeout(moreCloseTimer.current);
    },
    []
  );

  // The More menu is a hover popover — dismiss it on any outside press.
  React.useEffect(() => {
    if (!moreOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [moreOpen]);

  const openSearch = () => {
    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    setMoreOpen(false);
    setSearchQuery('');
    setSearchResults(EMPTY_RESULTS);
    setSelectedIndex(0);
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = React.useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(EMPTY_RESULTS);
    lastTriggerRef.current?.focus();
    lastTriggerRef.current = null;
  }, []);

  const handleItemSelect = React.useCallback(
    (href: string) => {
      closeSearch();
      router.push(href);
    },
    [closeSearch, router]
  );

  // Global Keyboard shortcuts: Ctrl+K / Cmd+K / Slash to open, Escape to close
  React.useEffect(() => {    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Ctrl+K or Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      // Open with "/" if not typing in an input
      if (
        e.key === '/' &&
        !searchOpen &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (mobileDrawerOpen && e.key === 'Escape') {
        setMobileDrawerOpen(false);
        return;
      }

      if (moreOpen && e.key === 'Escape') {
        setMoreOpen(false);
        return;
      }

      if (!searchOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setSearchOpen(false);
        lastTriggerRef.current?.focus();
        lastTriggerRef.current = null;
        return;
      }

      if (allResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allResults.length) % allResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = allResults[selectedIndex];
        if (selected) {
          handleItemSelect(selected.href);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, allResults, selectedIndex, mobileDrawerOpen, moreOpen, handleItemSelect]);

  const totalResults = allResults.length;
  // Precomputed flat indices per category for unified keyboard selection —
  // a running counter mutated during JSX render would make the render impure.
  const categoryOffsets = React.useMemo(() => {
    let acc = 0;
    const offsets = {} as Record<keyof SearchResponseData, number>;
    (Object.keys(searchResults) as (keyof SearchResponseData)[]).forEach((key) => {
      offsets[key] = acc;
      acc += searchResults[key].length;
    });
    return offsets;
  }, [searchResults]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-(--ed-blue) dark:bg-[#041129] text-white shadow-md transition-colors border-b border-white/10 pt-[var(--ed-safe-top)]">
        <div className="max-w-[var(--page-max-width)] w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-14 items-center justify-between gap-4 lg:grid lg:grid-cols-[auto_auto_1fr_auto] lg:items-stretch lg:gap-x-0">
            {/* ZONE 1 — menu button (below lg) + wordmark */}
            <div className="flex items-center min-w-0">
              {/* Tablet/mobile hamburger (desktop nav appears at lg) */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden shrink-0 p-1.5 -ml-1.5 rounded-lg text-white hover:bg-white/10 active:scale-95 transition"
                aria-label="Open Navigation Menu"
                aria-expanded={mobileDrawerOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="lg:hidden shrink-0 w-px h-5 bg-white/25 mx-3" aria-hidden="true" />

              <Link href="/" className="flex min-w-0 items-center group">
                <img
                  src="/logo.svg"
                  alt="eSportsAmaze"
                  className="h-[34px] w-auto object-contain brightness-0 invert"
                />
              </Link>
            </div>

            {/* ZONE 2 — primary links, clustered just after the wordmark */}
            <nav className="hidden min-w-0 items-center gap-x-7 lg:ml-7 lg:flex">
              {NAV_ITEMS.map((item) => (
                <Link key={item.label} href={item.href} className={NAV_LINK_CLASS}>
                  {item.label}
                </Link>
              ))}

              <div
                className="relative flex h-full items-center"
                ref={moreRef}
                onMouseEnter={openMore}
                onMouseLeave={closeMoreSoon}
              >
                <button
                  type="button"
                  onClick={openMore}
                  aria-haspopup="true"
                  aria-expanded={moreOpen}
                  className={cn(NAV_LINK_CLASS, 'flex items-center gap-1')}
                >
                  More
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-200', moreOpen && 'rotate-180')}
                  />
                </button>

                {moreOpen && (
                  <div className="absolute top-full left-0 z-50 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-2xl dark:border-slate-800 dark:bg-[#07090e] dark:text-slate-200">
                    {MORE_ITEMS.map((item) =>
                      'href' in item ? (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={MORE_LINK_CLASS}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span
                          key={item.label}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-semibold text-slate-400 dark:text-slate-500"
                        >
                          {item.label}
                          <span className={SOON_BADGE_CLASS}>Soon</span>
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            </nav>

            {/* ZONE 3 — the single flexible space, so the utilities stay pinned right */}
            <div className="hidden lg:block" aria-hidden="true" />

            {/* ZONE 4 — search + theme switch */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Search Trigger Button (Desktop pill with shortcut, mobile compact icon) */}
              <button
                onClick={openSearch}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 hover:text-white transition shadow-sm group"
                aria-label="Search"
                title="Search (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-white/70 group-hover:text-white transition-colors" />
                <span className="hidden lg:inline">Search teams, players...</span>
                <kbd className="hidden xl:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white/70 border border-white/10">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </button>

              {/* Mobile Search Icon Button */}
              <button
                onClick={openSearch}
                className="sm:hidden w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95"
                aria-label="Search"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Mode Switcher Toggle */}
              <ModeToggle />
            </div>
          </div>
        </div>

        {/* Mobile slide-over drawer */}
        <div
          className="fixed inset-0 z-50 lg:hidden pointer-events-none"
          aria-hidden={!mobileDrawerOpen}
        >
          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto',
              mobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div
            className={cn(
              'relative w-72 max-w-[80vw] h-full shadow-2xl p-5 flex flex-col justify-between bg-(--ed-blue) dark:bg-[#041129] text-white z-10 transition-transform duration-300 ease-out pointer-events-auto',
              mobileDrawerOpen ? 'translate-x-0' : 'invisible -translate-x-full'
            )}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <img
                  src="/logo.svg"
                  alt="eSportsAmaze"
                  className="h-[34px] w-auto object-contain brightness-0 invert"
                />
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={DRAWER_LINK_CLASS}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="space-y-1.5 border-t border-white/10">
                <p className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                  More
                </p>
                {MORE_ITEMS.map((item) =>
                  'href' in item ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={DRAWER_LINK_CLASS}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      key={item.label}
                      className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold text-white/45"
                    >
                      {item.label}
                      <span className="rounded-md border border-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        Soon
                      </span>
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-semibold text-white/70">{SITE_SLOGAN}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* COMMAND PALETTE SEARCH MODAL (No screen swipe / layout jump)     */}
      {/* ================================================================ */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[calc(4rem+var(--ed-safe-top))] sm:pt-[calc(6rem+var(--ed-safe-top))] px-4 pb-6">
          {/* Subtle blurred backdrop */}
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={closeSearch}
          />

          {/* Centered Modal Container */}
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-[#0b101c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#070b14]/50">
              {isSearching ? (
                <Loader2 className="w-5 h-5 shrink-0 text-(--ed-blue) animate-spin" />
              ) : (
                <Search className="w-5 h-5 shrink-0 text-slate-400" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search teams, players, tournaments, games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Clear query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={closeSearch}
                className="px-2 py-1 text-xs font-semibold rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                ESC
              </button>
            </div>

            {/* Modal Body / Results */}
            <div className="overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 dark:divide-slate-800">
              {/* Quick suggestions when empty */}
              {!searchQuery.trim() && (
                <div className="py-6 px-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-(--ed-blue)/10 text-(--ed-blue) flex items-center justify-center mx-auto mb-3">
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Search eSportsAmaze
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Type the name of any BGMI team (e.g. <em>Team Soul</em>, <em>GodLike</em>), player (e.g. <em>Jonathan</em>), or tournament.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    {['Team Soul', 'Team Apex Gaming', 'GodLike Esports', 'BMPS 2026', 'Jonathan'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSearchQuery(tag)}
                        className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-(--ed-blue) hover:text-white transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Searching Indicator */}
              {isSearching && totalResults === 0 && (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-(--ed-blue)" /> Searching database...
                </div>
              )}

              {/* No Results */}
              {!isSearching && searchQuery.trim().length >= 2 && totalResults === 0 && (
                <div className="py-12 text-center text-xs text-slate-500">
                  No results found for &ldquo;<strong className="text-slate-900 dark:text-white font-semibold">{searchQuery}</strong>&rdquo;
                </div>
              )}

              {/* 1. Teams Category */}
              {searchResults.teams.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-(--ed-blue)" /> Teams ({searchResults.teams.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.teams.map((item, idx) => {
                      const itemIdx = categoryOffsets.teams + idx;
                      const isSelected = itemIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={cn(
                            'w-full px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 group',
                            isSelected
                              ? 'bg-(--ed-blue)/10 dark:bg-(--ed-blue)/20 border border-(--ed-blue)/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Users className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className={cn(
                                'text-sm font-bold truncate transition-colors',
                                isSelected ? 'text-(--ed-blue)' : 'text-slate-900 dark:text-white'
                              )}>
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Players Category */}
              {searchResults.players.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-500" /> Players ({searchResults.players.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.players.map((item, idx) => {
                      const itemIdx = categoryOffsets.players + idx;
                      const isSelected = itemIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={cn(
                            'w-full px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 group',
                            isSelected
                              ? 'bg-(--ed-blue)/10 dark:bg-(--ed-blue)/20 border border-(--ed-blue)/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className={cn(
                                'text-sm font-bold truncate transition-colors',
                                isSelected ? 'text-(--ed-blue)' : 'text-slate-900 dark:text-white'
                              )}>
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Tournaments Category */}
              {searchResults.tournaments.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-emerald-500" /> Tournaments ({searchResults.tournaments.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.tournaments.map((item, idx) => {
                      const itemIdx = categoryOffsets.tournaments + idx;
                      const isSelected = itemIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={cn(
                            'w-full px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 group',
                            isSelected
                              ? 'bg-(--ed-blue)/10 dark:bg-(--ed-blue)/20 border border-(--ed-blue)/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={`/images/tournaments/${item.imageUrl}`} alt={item.title} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Trophy className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className={cn(
                                'text-sm font-bold truncate transition-colors',
                                isSelected ? 'text-(--ed-blue)' : 'text-slate-900 dark:text-white'
                              )}>
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Games Category */}
              {searchResults.games.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" /> Games ({searchResults.games.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.games.map((item, idx) => {
                      const itemIdx = categoryOffsets.games + idx;
                      const isSelected = itemIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={cn(
                            'w-full px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 group',
                            isSelected
                              ? 'bg-(--ed-blue)/10 dark:bg-(--ed-blue)/20 border border-(--ed-blue)/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <Gamepad2 className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                              <div className={cn(
                                'text-sm font-bold truncate transition-colors',
                                isSelected ? 'text-(--ed-blue)' : 'text-slate-900 dark:text-white'
                              )}>
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Articles Category */}
              {searchResults.articles.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Newspaper className="w-3.5 h-3.5 text-(--ed-blue)" /> News & Articles ({searchResults.articles.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.articles.map((item, idx) => {
                      const itemIdx = categoryOffsets.articles + idx;
                      const isSelected = itemIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={cn(
                            'w-full px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 group',
                            isSelected
                              ? 'bg-(--ed-blue)/10 dark:bg-(--ed-blue)/20 border border-(--ed-blue)/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                              ) : (
                                <Newspaper className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className={cn(
                                'text-sm font-bold truncate transition-colors',
                                isSelected ? 'text-(--ed-blue)' : 'text-slate-900 dark:text-white'
                              )}>
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-(--ed-blue)/10 text-(--ed-blue) border border-(--ed-blue)/20 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Keyboard Helper Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#070b14] border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" /> Select
                </span>
              </div>
              <div>
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">ESC</kbd> to close
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
