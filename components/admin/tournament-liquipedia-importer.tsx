'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Trophy,
  Users,
  DollarSign,
  Calendar,
  MapPin,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  PlusCircle,
  FileCode,
} from 'lucide-react';
import {
  fetchTournamentFromLiquipediaAction,
  createTournamentFromImportAction,
  type TournamentImportPreviewResult,
} from '@/app/admin/(panel)/tournaments/importer-actions';
import type { ParsedLiquipediaTournament, ParsedSquad } from '@/lib/liquipedia-tournament-parser';

interface TournamentLiquipediaImporterProps {
  games: Array<{ id: string; name: string; slug: string }>;
  allTeams: Array<{ id: string; name: string; tag?: string | null }>;
}

export function TournamentLiquipediaImporter({
  games,
  allTeams,
}: TournamentLiquipediaImporterProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState('');
  const [wikitextInput, setWikitextInput] = React.useState('');
  const [showWikitextFallback, setShowWikitextFallback] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [previewResult, setPreviewResult] = React.useState<TournamentImportPreviewResult | null>(null);
  const [selectedGameId, setSelectedGameId] = React.useState<string>(games[0]?.id || '');
  const [autoCreateMissing, setAutoCreateMissing] = React.useState(true);
  const [teamFilter, setTeamFilter] = React.useState<'all' | 'matched' | 'new'>('all');

  // Quick preset links
  const presets = [
    { label: 'PMWC 2026', url: 'https://liquipedia.net/pubgmobile/PUBG_Mobile_World_Cup/2026' },
    { label: 'BGIS 2026', url: 'https://liquipedia.net/pubgmobile/Battlegrounds_Mobile_India_Series/2026' },
  ];

  const handleFetch = async (targetUrl?: string) => {
    const toFetch = targetUrl || urlInput || wikitextInput;
    if (!toFetch.trim()) {
      setErrorMsg('Please enter a Liquipedia URL or paste wikitext.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await fetchTournamentFromLiquipediaAction(toFetch);
      if (!res.success || !res.tournament) {
        setErrorMsg(res.message);
        if (res.rawWikitext) {
          setWikitextInput(res.rawWikitext);
          setShowWikitextFallback(true);
        }
      } else {
        setPreviewResult(res);
        setSuccessMsg(res.message);

        // Auto-select matching game if possible
        if (res.tournament.gameSlug) {
          const matchGame = games.find(
            (g) =>
              g.slug.toLowerCase() === res.tournament?.gameSlug?.toLowerCase() ||
              g.name.toLowerCase().includes(res.tournament?.gameSlug?.toLowerCase() || '')
          );
          if (matchGame) setSelectedGameId(matchGame.id);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while fetching tournament data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!previewResult?.tournament) return;

    setErrorMsg(null);
    setIsCreating(true);

    try {
      const res = await createTournamentFromImportAction({
        tournament: previewResult.tournament,
        gameId: selectedGameId || games[0]?.id || '',
        autoCreateMissingTeams: autoCreateMissing,
      });

      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg(res.message);
        // Redirect to editor
        if (res.tournamentId) {
          router.push(`/admin/tournaments?edit=${res.tournamentId}#tournament-editor`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create tournament.');
    } finally {
      setIsCreating(false);
    }
  };

  const tournament = previewResult?.tournament;
  const filteredSquads = (tournament?.squads || []).filter((s) => {
    if (teamFilter === 'matched') return s.isMatched;
    if (teamFilter === 'new') return !s.isMatched;
    return true;
  });

  return (
    <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-cyan-500/5 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-cyan-950/20 overflow-hidden shadow-xs">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-blue-500/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <span>⚡ 1-Click Liquipedia Tournament Setup</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  Instant Importer
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Auto-create any PUBG Mobile / BGMI tournament, tier, dates, prize pool &amp; all 32 participating squads
              directly from Liquipedia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
          <span>{isOpen ? 'Close' : 'Import Tournament'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="p-4 border-t border-blue-500/10 space-y-4">
          {/* URL Input Group */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://liquipedia.net/pubgmobile/PUBG_Mobile_World_Cup/2026"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetch();
                    }
                  }}
                />
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => handleFetch()}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching Tournament...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fetch &amp; Preview</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick preset links & wikitext toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Quick Try:</span>
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setUrlInput(p.url);
                      handleFetch(p.url);
                    }}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 font-semibold cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowWikitextFallback(!showWikitextFallback)}
                className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium underline flex items-center gap-1 cursor-pointer"
              >
                <FileCode className="w-3 h-3" />
                <span>{showWikitextFallback ? 'Hide Wikitext Paste Box' : 'Paste Wikitext Manually (Cloudflare Fallback)'}</span>
              </button>
            </div>

            {/* Wikitext Fallback Textarea */}
            {showWikitextFallback && (
              <div className="space-y-1.5 pt-2 border-t border-blue-500/10">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Paste Raw Liquipedia Wikitext / Infobox:
                </label>
                <textarea
                  rows={4}
                  value={wikitextInput}
                  onChange={(e) => setWikitextInput(e.target.value)}
                  placeholder="Paste {{Infobox league ...}} or full page source here..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleFetch()}
                  disabled={isLoading || !wikitextInput.trim()}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                >
                  Parse Pasted Wikitext
                </button>
              </div>
            )}
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && !previewResult && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ════════════════ PREVIEW RESULTS CARD ════════════════ */}
          {tournament && (
            <div className="space-y-4 p-4 rounded-xl bg-white dark:bg-[#070b14] border border-blue-500/20 shadow-sm">
              {/* Header Details */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white uppercase">
                      {tournament.tier}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {tournament.eventType}
                    </span>
                    {tournament.series && (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Series: {tournament.series}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {tournament.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Slug: <span className="text-blue-500">{tournament.slug}</span>
                  </p>
                </div>

                {/* Dates & Location */}
                <div className="text-left md:text-right text-xs space-y-1">
                  {(tournament.startDate || tournament.endDate) && (
                    <div className="flex items-center md:justify-end gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>
                        {tournament.startDate} {tournament.endDate && `→ ${tournament.endDate}`}
                      </span>
                    </div>
                  )}
                  {tournament.location && (
                    <div className="flex items-center md:justify-end gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>{tournament.location} {tournament.venue && `(${tournament.venue})`}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Prize Pool & Organizers Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">
                    <DollarSign className="w-3.5 h-3.5" /> Total Prize Pool
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    ${tournament.prizePool.toLocaleString()} {tournament.currency}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {Object.keys(tournament.prizeDistribution).length} placement reward tiers extracted
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">
                    <Building2 className="w-3.5 h-3.5" /> Organizers
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {tournament.organizers.length > 0 ? tournament.organizers.join(', ') : 'Krafton / Level Infinite'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Auto-created &amp; linked in database
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                  <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 uppercase text-[10px]">
                    <Users className="w-3.5 h-3.5" /> Participating Squads
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {tournament.squads.length} Teams
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    <span className="text-emerald-600 font-bold">{previewResult?.stats?.matchedCount || 0} matched</span>,{' '}
                    <span className="text-amber-600 font-bold">{previewResult?.stats?.newCount || 0} new</span>
                  </div>
                </div>
              </div>

              {/* Participating Squads Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Participating Teams ({tournament.squads.length}):
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setTeamFilter('all')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        teamFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({tournament.squads.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamFilter('matched')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        teamFilter === 'matched'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 hover:bg-slate-200'
                      }`}
                    >
                      Matched ({previewResult?.stats?.matchedCount || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamFilter('new')}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        teamFilter === 'new'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-amber-600 hover:bg-slate-200'
                      }`}
                    >
                      New ({previewResult?.stats?.newCount || 0})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                  {filteredSquads.map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-xs transition-all ${
                        s.isMatched
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200'
                          : 'bg-amber-500/5 border-amber-500/20 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold truncate text-[11px]">{s.teamName}</span>
                        {s.isMatched ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Matched in DB" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Will be created" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Tag: {s.tag}</span>
                        {s.roster.length > 0 && <span>{s.roster.length} players</span>}
                      </div>
                      {s.seedLabel && (
                        <div className="text-[9px] text-blue-500 dark:text-blue-400 truncate mt-0.5">
                          {s.seedLabel}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-600 dark:text-slate-400 text-[11px] uppercase">
                      Game:
                    </label>
                    <select
                      value={selectedGameId}
                      onChange={(e) => setSelectedGameId(e.target.value)}
                      className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {games.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoCreateMissing}
                      onChange={(e) => setAutoCreateMissing(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Auto-create missing teams in database ({previewResult?.stats?.newCount || 0})</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleCreateTournament}
                  disabled={isCreating}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Tournament in Database...</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      <span>Create Tournament with {tournament.squads.length} Teams</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
