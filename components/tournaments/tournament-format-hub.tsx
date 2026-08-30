'use client';

import React from 'react';
import {
  Layers,
  Award,
  Shield,
  PlaySquare,
  CheckCircle2,
  MapPin,
  Calendar,
  Zap,
  Users,
  Target,
  FileText,
  Clock,
  Tv,
} from 'lucide-react';

interface StageInfo {
  id?: string;
  name: string;
  sequence?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  description?: string;
}

interface TournamentFormatHubProps {
  stages: StageInfo[];
  formatDetails?: any;
  pointsMatrix?: Record<string, number>;
  killMultiplier?: number;
  gameMode?: string | null;
  eventType?: string | null;
  device?: string | null;
  streamUrl?: string | null;
  vods?: any;
}

const DEFAULT_PLACEMENT_POINTS: Record<number, number> = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: 0,
  14: 0,
  15: 0,
  16: 0,
};

export function TournamentFormatHub({
  stages,
  formatDetails,
  pointsMatrix,
  killMultiplier = 1,
  gameMode = 'Squads TPP',
  eventType = 'LAN',
  device,
  streamUrl,
  vods,
}: TournamentFormatHubProps) {
  // Determine embeddable YouTube video if present
  const youtubeEmbedUrl = React.useMemo(() => {
    let rawUrl = streamUrl;
    if (!rawUrl && Array.isArray(vods) && vods.length > 0) {
      rawUrl = vods[0]?.url;
    }
    if (!rawUrl) return null;

    if (rawUrl.includes('youtube.com/watch?v=')) {
      const v = rawUrl.split('watch?v=')[1]?.split('&')[0];
      return `https://www.youtube-nocookie.com/embed/${v}`;
    }
    if (rawUrl.includes('youtu.be/')) {
      const v = rawUrl.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube-nocookie.com/embed/${v}`;
    }
    if (rawUrl.includes('youtube.com/embed/')) {
      return rawUrl;
    }
    return null;
  }, [streamUrl, vods]);

  // Points matrix
  const matrix = pointsMatrix || (formatDetails?.placementPoints as Record<string, number>) || DEFAULT_PLACEMENT_POINTS;

  return (
    <div className="space-y-6">
      {/* ═══ FORMAT OVERVIEW SUMMARY ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Competition Mode</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block">
            {gameMode || 'Squads TPP'}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">16 Teams Battle Royale</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Environment</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block">
            {eventType === 'LAN' ? '🏟️ Offline LAN Arena' : '🌐 Online Championship'}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Dedicated Server Protocol</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Scoring System</span>
          <span className="text-sm font-extrabold text-[#0A5FC4] dark:text-blue-400 mt-1 block">
            Official 10-Pt BR Matrix
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">10 Place Pts + 1 Pt / Frag</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tournament Device</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block truncate">
            {device || 'Official Esports Flagship'}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">90 / 120 FPS Optimized</span>
        </div>
      </div>

      {/* ═══ TOURNAMENT PROGRESSION ROADMAP ═══ */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Stage-by-Stage Roadmap
            </span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
              Championship Structure &amp; Progression
            </h3>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {stages.length || 3} Phases
          </span>
        </div>

        {/* Progression Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stages.length > 0 ? (
            stages.map((stg, idx) => (
              <div
                key={stg.id || idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17] relative space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-md bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
                    0{idx + 1}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Phase {idx + 1}
                  </span>
                </div>

                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{stg.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {stg.description ||
                    (idx === stages.length - 1
                      ? 'The championship culmination where the top 16 qualifying teams battle in an 18-match LAN series for the trophy and lion share of the prize pool.'
                      : 'Contenders clash in intense group matches to secure qualification thresholds and points.')}
                </p>
              </div>
            ))
          ) : (
            <>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-md bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
                    01
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Phase 1
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">League Stage</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  24 or 32 invited and qualified squads divided into groups competing across round-robin match days.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-md bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
                    02
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Phase 2
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Survival / Semifinals</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  High-stakes elimination round where middle-bracket teams battle for the final Grand Finals tickets.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-md bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
                    03
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    Grand Finals LAN
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Grand Finals</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The ultimate 16 finalists battle across 3 intense LAN days (18 matches) to crown the champions.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ OFFICIAL POINTS SYSTEM MATRIX ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Placement Points Matrix */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Placement Point Distribution
            </span>
            <span className="text-[10px] font-mono text-slate-400">Standard BR System</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 px-3 text-left">Placement Finish</th>
                  <th className="py-2 px-3 text-right font-bold text-[#0A5FC4]">Points Awarded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {[
                  { rank: '1st Place (WWCD)', pts: matrix[1] ?? 10, special: '🏆 Winner' },
                  { rank: '2nd Place', pts: matrix[2] ?? 6 },
                  { rank: '3rd Place', pts: matrix[3] ?? 5 },
                  { rank: '4th Place', pts: matrix[4] ?? 4 },
                  { rank: '5th Place', pts: matrix[5] ?? 3 },
                  { rank: '6th Place', pts: matrix[6] ?? 2 },
                  { rank: '7th - 8th Place', pts: matrix[7] ?? 1 },
                  { rank: '9th - 16th Place', pts: matrix[9] ?? 0 },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-1.5 px-3 flex items-center gap-2">
                      <span className="text-slate-800 dark:text-slate-200">{row.rank}</span>
                      {row.special && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {row.special}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {row.pts} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-lg bg-[#0A5FC4]/5 border border-[#0A5FC4]/15 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#0A5FC4]" /> Frag / Elimination Points
            </span>
            <span className="font-mono font-black text-[#0A5FC4] dark:text-blue-400">
              +{killMultiplier} Point per Frag
            </span>
          </div>
        </div>

        {/* Right: Format Explainer & Video Embed */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5" /> Official Broadcast &amp; Format Explainer
            </span>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
              Live Stream &amp; Format Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Watch official stream highlights, rules explanation, and caster analysis for this championship.
            </p>
          </div>

          {youtubeEmbedUrl ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
              <iframe
                src={youtubeEmbedUrl}
                title="Tournament Format Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080d17] flex flex-col items-center justify-center text-center p-6 space-y-2">
              <PlaySquare className="w-8 h-8 text-slate-400" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Official Broadcast Stream Available
              </div>
              <p className="text-[10px] text-slate-400 max-w-xs">
                Broadcast VODs and tournament stream links are updated in real-time during match days.
              </p>
            </div>
          )}

          <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
            <span>Daily Schedule: 6 Matches / Day</span>
            <span>Map Order: Erangel · Miramar · Sanhok · Rondo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
