'use client';

import React from 'react';
import Link from 'next/link';
import {
  Flame,
  ExternalLink,
  Shield,
  Award,
} from 'lucide-react';

interface TournamentSidebarInfoProps {
  tournament: {
    id: string;
    name: string;
    slug: string;
    tier: string;
    eventType?: string | null;
    gameMode?: string | null;
    platform?: string | null;
    device?: string | null;
    region?: string | null;
    startDate: Date | string;
    endDate: Date | string;
    prizePool?: number | null;
    currency: string;
    usdRate?: number | null;
    game: { name: string; slug: string };
    venues?: Array<{
      stageName?: string | null;
      venue: {
        name: string;
        city?: string | null;
        country?: string | null;
        address?: string | null;
      };
    }>;
    organizers?: Array<{ organizer: { name: string; logoUrl?: string | null; website?: string | null }; role?: string | null }>;
    sponsors?: Array<{ sponsor: { name: string; logoUrl?: string | null; website?: string | null }; tier?: string | null }>;
    socialLinks?: any;
    liquipedia?: string | null;
  };
  topFraggers: Array<{
    playerId: string;
    ign: string;
    avatarUrl?: string | null;
    teamName: string;
    teamTag?: string | null;
    elims: number;
    damage: number;
  }>;
  upcomingMatches: any[];
  prizeTopRanks?: Array<{ rank: string; prize: number; teamName?: string }>;
}

export function TournamentSidebarInfo({
  tournament,
  topFraggers,
  prizeTopRanks = [],
}: TournamentSidebarInfoProps) {
  const rawSocials = (tournament.socialLinks ?? {}) as Record<string, unknown>;
  const socials: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawSocials)) {
    if (typeof v === 'string' && v.trim().length > 0) {
      socials[k] = v.trim();
    }
  }

  const maxElims = Math.max(...topFraggers.map((f) => f.elims), 1);

  return (
    <div className="space-y-4">
      {/* ═══ 1. TOP FRAGGER MVP RACE (TOP 5) ═══ */}
      {topFraggers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4" /> MVP Fragger Race
            </span>
            <Link
              href={`/tournaments/${tournament.slug}?tab=fraggers`}
              className="text-[11px] font-bold text-[#0A5FC4] hover:underline flex items-center"
            >
              All Stats →
            </Link>
          </div>

          <div className="space-y-2.5">
            {topFraggers.slice(0, 5).map((player, idx) => {
              const pct = (player.elims / maxElims) * 100;
              return (
                <div key={player.playerId || idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 text-center font-mono font-bold text-[10px] ${
                          idx === 0
                            ? 'text-amber-500 font-black'
                            : idx === 1
                            ? 'text-slate-400 font-bold'
                            : idx === 2
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {player.ign}
                      </span>
                      {player.teamTag && (
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          [{player.teamTag}]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {player.elims} <span className="text-[9px] font-sans font-normal text-slate-400">kills</span>
                      </span>
                    </div>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0
                          ? 'bg-rose-500'
                          : idx === 1
                          ? 'bg-amber-500'
                          : 'bg-[#0A5FC4]'
                      }`}
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 2. ORGANIZERS & OFFICIAL SPONSORS ═══ */}
      {((tournament.organizers && tournament.organizers.length > 0) ||
        (tournament.sponsors && tournament.sponsors.length > 0)) && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-4 shadow-sm space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
            Organizers &amp; Partners
          </span>

          {tournament.organizers && tournament.organizers.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Host Organizer</span>
              <div className="flex flex-wrap gap-2">
                {tournament.organizers.map((org, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    {org.organizer.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={org.organizer.logoUrl}
                        alt=""
                        className="w-4 h-4 object-contain rounded"
                      />
                    )}
                    <span>{org.organizer.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tournament.sponsors && tournament.sponsors.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Official Sponsors</span>
              <div className="flex flex-wrap gap-2">
                {tournament.sponsors.map((sp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2 py-0.8 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                  >
                    {sp.sponsor.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sp.sponsor.logoUrl}
                        alt=""
                        className="w-3.5 h-3.5 object-contain rounded"
                      />
                    )}
                    <span>{sp.sponsor.name}</span>
                    {sp.tier && (
                      <span className="text-[8px] font-bold uppercase px-1 rounded bg-[#0A5FC4]/10 text-[#0A5FC4]">
                        {sp.tier}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 3. OFFICIAL CHANNELS & COMMUNITY ═══ */}
      {Object.keys(socials).length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-4 shadow-sm space-y-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
            Official Broadcast &amp; Community
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(socials).map(([net, url]) => (
              <a
                key={net}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 capitalize transition-colors flex items-center gap-1.5"
              >
                <span>{net}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
