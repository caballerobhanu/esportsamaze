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
  CornerDownLeft,
  ArrowUpDown,
} from 'lucide-react';
import { ModeToggle } from './mode-toggle';
import { cn } from '@/lib/utils';
import type { SearchResultItem } from '@/app/api/search/route';

export const OTHER_TITLES = [
  { name: 'Valorant', genre: 'Tactical FPS', status: 'Coming Soon' },
  { name: 'Counter-Strike 2', genre: 'Tactical FPS', status: 'Coming Soon' },
  { name: 'Mobile Legends: Bang Bang', genre: 'MOBA', status: 'Coming Soon' },
  { name: 'Honor of Kings', genre: 'MOBA', status: 'Coming Soon' },
  { name: 'Free Fire MAX', genre: 'Battle Royale', status: 'Coming Soon' },
  { name: 'Tekken 8', genre: 'Fighting', status: 'Coming Soon' },
  { name: 'EA Sports FC', genre: 'Sports Simulation', status: 'Coming Soon' },
];

// Flip to true to re-enable the "Other Games" dropdown in the navbar
const SHOW_OTHER_GAMES = false;

export const NAV_ITEMS = [
  { label: 'Tournaments', href: '/tournaments' },
  { label: 'Teams', href: '/teams' },
  { label: 'News', href: '/#news' },
  { label: 'Rankings', href: '/rankings' },
  { label: 'Support', href: '/about' },
];

interface SearchResponseData {
  teams: SearchResultItem[];
  players: SearchResultItem[];
  tournaments: SearchResultItem[];
  games: SearchResultItem[];
}

export function Navbar() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResponseData>({
    teams: [],
    players: [],
    tournaments: [],
    games: [],
  });
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [otherGamesOpen, setOtherGamesOpen] = React.useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Flattened results for keyboard navigation
  const allResults = React.useMemo(() => {
    return [
      ...searchResults.teams,
      ...searchResults.players,
      ...searchResults.tournaments,
      ...searchResults.games,
    ];
  }, [searchResults]);

  // Focus search input when modal opens
  React.useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [searchOpen]);

  // Debounced search query fetching
  React.useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < 2) {
      setSearchResults({ teams: [], players: [], tournaments: [], games: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
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
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Global Keyboard shortcuts: Ctrl+K / Cmd+K / Slash to open, Escape to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      if (!searchOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setSearchOpen(false);
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
  }, [searchOpen, allResults, selectedIndex]);

  const openSearch = () => {
    setOtherGamesOpen(false);
    setSearchQuery('');
    setSearchResults({ teams: [], players: [], tournaments: [], games: [] });
    setSelectedIndex(0);
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults({ teams: [], players: [], tournaments: [], games: [] });
  };

  const handleItemSelect = (href: string) => {
    closeSearch();
    router.push(href);
  };

  const totalResults = allResults.length;

  // Track item index across categories for unified keyboard selection
  let currentRunningIndex = 0;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#0A5FC4] dark:bg-[#041129] text-white shadow-md transition-colors border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-14 sm:h-16 gap-4">
            {/* SET 1 (left aligned): Logo + spacing + nav items */}
            <div className="flex items-center min-w-0">
              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden shrink-0 p-1.5 -ml-1.5 rounded-lg text-white hover:bg-white/10 active:scale-95 transition"
                aria-label="Open Navigation Menu"
                aria-expanded={mobileDrawerOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="md:hidden shrink-0 w-px h-5 bg-white/25 mx-3" aria-hidden="true" />

              <Link href="/" className="shrink-0 flex items-center group">
                <img
                  src="/logo.svg"
                  alt="esportsamaze"
                  className="h-7 sm:h-8 w-auto object-contain brightness-0 invert"
                />
              </Link>

              {/* Desktop navigation items */}
              <nav className="hidden md:flex items-center gap-5 lg:gap-6 xl:gap-9 ml-6 lg:ml-8 xl:ml-14 min-w-0">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="whitespace-nowrap text-sm font-semibold text-white/85 hover:text-white transition-colors duration-150"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* SET 2 (right aligned): Search Trigger + Other Games + Mode Switcher */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Search Trigger Button (Desktop pill with shortcut, mobile compact icon) */}
              <button
                onClick={openSearch}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 hover:text-white transition shadow-sm group"
                aria-label="Search"
                title="Search (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-white/70 group-hover:text-white transition-colors" />
                <span className="hidden lg:inline">Search wiki...</span>
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

              {/* Other Games Dropdown */}
              {SHOW_OTHER_GAMES && (
                <div className="relative">
                  <button
                    onClick={() => setOtherGamesOpen(!otherGamesOpen)}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-1.5 transition"
                    title="Other Games Roadmap"
                    aria-expanded={otherGamesOpen}
                  >
                    <span>Other Games</span>
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 text-white/70 transition-transform duration-200',
                        otherGamesOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {otherGamesOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07090e] p-2 shadow-2xl z-50 text-xs text-slate-800 dark:text-slate-200">
                      <div className="px-2 py-1.5 font-bold uppercase tracking-wider text-slate-400 text-[10px] border-b border-slate-100 dark:border-slate-800/80 mb-1">
                        Multi-Game Roadmap
                      </div>
                      <div className="space-y-1">
                        {OTHER_TITLES.map((g) => (
                          <div
                            key={g.name}
                            className="px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-between text-slate-700 dark:text-slate-300 cursor-default"
                          >
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{g.name}</div>
                              <div className="text-[10px] text-slate-500">{g.genre}</div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                              {g.status}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center text-[10px] text-slate-400">
                        Active focus on BGMI & PUBG Mobile circuits.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode Switcher Toggle */}
              <ModeToggle />
            </div>
          </div>
        </div>

        {/* Mobile slide-over drawer */}
        <div
          className="fixed inset-0 z-50 md:hidden pointer-events-none"
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
              'relative w-72 max-w-[80vw] h-full shadow-2xl p-5 flex flex-col justify-between bg-[#0A5FC4] dark:bg-[#041129] text-white z-10 transition-transform duration-300 ease-out pointer-events-auto',
              mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <img
                  src="/logo.svg"
                  alt="esportsamaze"
                  className="h-6 w-auto object-contain brightness-0 invert"
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
                    className="block px-3.5 py-2.5 rounded-xl font-bold text-sm text-white hover:bg-white/15 transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-2 text-xs text-white/70">
              <div className="font-semibold text-white">Battle Royale Statistics Hub</div>
              <p className="text-[11px]">BGMI India & PUBG Mobile Global Circuits</p>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* COMMAND PALETTE SEARCH MODAL (No screen swipe / layout jump)     */}
      {/* ================================================================ */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 pb-6">
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
            aria-label="Search Wiki"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#070b14]/50">
              {isSearching ? (
                <Loader2 className="w-5 h-5 shrink-0 text-[#0A5FC4] animate-spin" />
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
                  <div className="w-10 h-10 rounded-full bg-[#0A5FC4]/10 text-[#0A5FC4] flex items-center justify-center mx-auto mb-3">
                    <Search className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Search Esports Amaze
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Type the name of any BGMI team (e.g. <em>GodLike</em>, <em>Soul</em>), player (e.g. <em>Jonathan</em>), or tournament.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    {['GodLike', 'Team Soul', 'Jonathan', 'BGIS 2026', 'Carnival Gaming'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSearchQuery(tag)}
                        className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-[#0A5FC4] hover:text-white transition"
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
                  <Loader2 className="w-4 h-4 animate-spin text-[#0A5FC4]" /> Searching database...
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
                    <Users className="w-3.5 h-3.5 text-[#0A5FC4]" /> Teams ({searchResults.teams.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.teams.map((item) => {
                      const itemIdx = currentRunningIndex++;
                      const isSelected = itemIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={cn(
                            'w-full px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 group',
                            isSelected
                              ? 'bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20 border border-[#0A5FC4]/30'
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
                                isSelected ? 'text-[#0A5FC4] dark:text-blue-400' : 'text-slate-900 dark:text-white'
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
                    {searchResults.players.map((item) => {
                      const itemIdx = currentRunningIndex++;
                      const isSelected = itemIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={cn(
                            'w-full px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 group',
                            isSelected
                              ? 'bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20 border border-[#0A5FC4]/30'
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
                                isSelected ? 'text-[#0A5FC4] dark:text-blue-400' : 'text-slate-900 dark:text-white'
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
                    {searchResults.tournaments.map((item) => {
                      const itemIdx = currentRunningIndex++;
                      const isSelected = itemIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={cn(
                            'w-full px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 group',
                            isSelected
                              ? 'bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20 border border-[#0A5FC4]/30'
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
                                isSelected ? 'text-[#0A5FC4] dark:text-blue-400' : 'text-slate-900 dark:text-white'
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
                    {searchResults.games.map((item) => {
                      const itemIdx = currentRunningIndex++;
                      const isSelected = itemIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={cn(
                            'w-full px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 group',
                            isSelected
                              ? 'bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20 border border-[#0A5FC4]/30'
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
                                isSelected ? 'text-[#0A5FC4] dark:text-blue-400' : 'text-slate-900 dark:text-white'
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
