'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, Menu, X, Loader2, Users, User, Trophy, Gamepad2 } from 'lucide-react';
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
  { label: 'Tournaments', href: '#tournaments' },
  { label: 'Teams', href: '#teams' },
  { label: 'News', href: '#news' },
  { label: 'Rankings', href: '#rankings' },
  { label: 'Support', href: '#support' },
];

const SEARCH_ICON_SIZE = 36;
const ANCHOR_GAP = 16;
const MOBILE_QUERY = '(max-width: 767px)';

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
  const [otherGamesOpen, setOtherGamesOpen] = React.useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [actionsWidth, setActionsWidth] = React.useState(0);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const rowRef = React.useRef<HTMLDivElement>(null);
  const logoRef = React.useRef<HTMLAnchorElement>(null);
  const separatorRef = React.useRef<HTMLSpanElement>(null);
  const rootRef = React.useRef<HTMLElement>(null);

  // Measure dynamic width for the search bar
  React.useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const measure = () => {
      const anchor = mediaQuery.matches ? separatorRef.current : logoRef.current;
      if (!anchor) return;
      const rowRect = row.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const inset = anchorRect.right - rowRect.left + ANCHOR_GAP;
      setActionsWidth(Math.max(rowRect.width - inset, SEARCH_ICON_SIZE));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    if (logoRef.current) observer.observe(logoRef.current);
    if (separatorRef.current) observer.observe(separatorRef.current);
    mediaQuery.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', measure);
    };
  }, []);

  // Focus search input when the expanding box opens
  React.useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
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

  // Close popovers on outside click / Escape
  React.useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (e.target instanceof Node && rootRef.current && !rootRef.current.contains(e.target)) {
        setSearchOpen(false);
        setOtherGamesOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setOtherGamesOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const openSearch = () => {
    setOtherGamesOpen(false);
    setSearchQuery('');
    setSearchResults({ teams: [], players: [], tournaments: [], games: [] });
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

  const totalResults =
    searchResults.teams.length +
    searchResults.players.length +
    searchResults.tournaments.length +
    searchResults.games.length;

  return (
    <header
      ref={rootRef}
      className="sticky top-0 z-50 w-full bg-[#0A5FC4] dark:bg-[#041129] text-white shadow-md transition-colors border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={rowRef} className="relative flex items-center justify-between h-14 sm:h-16 gap-4">
          {/* SET 1 (left aligned): Logo + spacing + nav items */}
          <div className="flex items-center min-w-0">
            {/* Mobile Hamburger (icon only, left edge) + separator before the logo */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden shrink-0 p-1.5 -ml-1.5 rounded-lg text-white hover:bg-white/10 active:scale-95 transition"
              aria-label="Open Navigation Menu"
              aria-expanded={mobileDrawerOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span
              ref={separatorRef}
              className="md:hidden shrink-0 w-px h-5 bg-white/25 mx-3"
              aria-hidden="true"
            />

            <Link ref={logoRef} href="/" className="shrink-0 flex items-center group">
              <img
                src="/logo.svg"
                alt="esportsamaze"
                className="h-7 sm:h-8 w-auto object-contain brightness-0 invert"
              />
            </Link>

            {/* Desktop navigation items (text only, no icons) */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-9 ml-8 lg:ml-14 min-w-0">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="whitespace-nowrap text-sm font-semibold text-white/85 hover:text-white transition-colors duration-150"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* SET 2 (right aligned): Other Games + Mode Switcher + Search (rightmost) */}
          <div className="flex items-center shrink-0">
            {/* Controls underneath (hidden while the search box is expanded) */}
            <div
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 transition-opacity duration-150',
                searchOpen && 'opacity-0 pointer-events-none'
              )}
            >
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
                      className={cn('w-3 h-3 text-white/70 transition-transform duration-200', otherGamesOpen && 'rotate-180')}
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

              {/* Search Icon (rightmost) */}
              <button
                onClick={openSearch}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white transition active:scale-95"
                aria-label="Search"
                aria-expanded={searchOpen}
                title="Search Teams, Events, Players"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanding search box growing out of the search icon */}
          <div
            aria-hidden={!searchOpen}
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2 z-20 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07090e] shadow-2xl overflow-visible transition-all duration-300 ease-out',
              searchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            style={{ width: searchOpen ? actionsWidth : SEARCH_ICON_SIZE }}
          >
            <div
              className="h-full flex items-center gap-2 pl-3 pr-1.5"
              style={{ width: actionsWidth }}
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 shrink-0 text-[#0A5FC4] animate-spin" />
              ) : (
                <Search className="w-4 h-4 shrink-0 text-slate-400" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Teams, Events, Players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                tabIndex={searchOpen ? 0 : -1}
                className="w-full min-w-0 bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Clear search"
                  tabIndex={searchOpen ? 0 : -1}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={closeSearch}
                className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close search"
                tabIndex={searchOpen ? 0 : -1}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Search Results Floating Panel */}
            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0b101c] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-[70vh] overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-200 text-slate-900 dark:text-white">
                {isSearching && totalResults === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A5FC4]" /> Searching database...
                  </div>
                )}

                {!isSearching && totalResults === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    No teams, players, or tournaments found for <strong className="text-slate-900 dark:text-white font-semibold">"{searchQuery}"</strong>
                  </div>
                )}

                {/* 1. Teams Category */}
                {searchResults.teams.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-[#0A5FC4]" /> Teams ({searchResults.teams.length})
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {searchResults.teams.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-900/80 transition flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0A5FC4] transition truncate">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Players Category */}
                {searchResults.players.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-amber-500" /> Players ({searchResults.players.length})
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {searchResults.players.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-900/80 transition flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0A5FC4] transition truncate">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Tournaments Category */}
                {searchResults.tournaments.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Trophy className="w-3 h-3 text-emerald-500" /> Tournaments ({searchResults.tournaments.length})
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {searchResults.tournaments.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-900/80 transition flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={`/images/tournaments/${item.imageUrl}`} alt={item.title} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Trophy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0A5FC4] transition truncate">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Games Category */}
                {searchResults.games.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Gamepad2 className="w-3 h-3 text-indigo-500" /> Games ({searchResults.games.length})
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {searchResults.games.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleItemSelect(item.href)}
                          className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-900/80 transition flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#0A5FC4] transition truncate">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MOBILE LEFT SLIDE-OVER DRAWER                                    */}
      {/* ================================================================ */}
      <div
        className="fixed inset-0 z-50 md:hidden"
        aria-hidden={!mobileDrawerOpen}
        inert={!mobileDrawerOpen}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            mobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setMobileDrawerOpen(false)}
        />

        {/* Drawer Content sliding in from the left */}
        <div
          className={cn(
            'relative w-72 max-w-[80vw] h-full shadow-2xl p-5 flex flex-col justify-between bg-[#0A5FC4] dark:bg-[#041129] text-white z-10 transition-transform duration-300 ease-out',
            mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="space-y-6">
            {/* Header inside drawer */}
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

            {/* Navigation list (text only, no icons) */}
            <nav className="space-y-1.5">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="block px-3.5 py-2.5 rounded-xl font-bold text-sm text-white hover:bg-white/15 transition"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Bottom Drawer Footer */}
          <div className="border-t border-white/10 pt-4 space-y-2 text-xs text-white/70">
            <div className="font-semibold text-white">Battle Royale Statistics Hub</div>
            <p className="text-[11px]">BGMI India & PUBG Mobile Global Circuits</p>
          </div>
        </div>
      </div>
    </header>
  );
}
