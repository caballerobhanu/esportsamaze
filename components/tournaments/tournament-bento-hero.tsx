'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Shield,
  Gamepad2,
  Calendar,
  MapPin,
  ChevronRight,
  Tv,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';

interface BentoHeroProps {
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
    game: { name: string };
    venues?: Array<{ venue: { name: string; city?: string | null; country?: string | null }; stageName?: string | null }>;
    organizers?: Array<{ organizer: { name: string; logoUrl?: string | null }; role?: string | null }>;
    stages?: Array<{ name: string; sequence?: number }>;
  };
  activeStageName: string;
}

export function TournamentBentoHero({
  tournament,
  activeStageName,
}: BentoHeroProps) {
  const cleanTier = (tournament.tier || '').replace(/\s*tier\s*$/i, '');

  const primaryOrganizer = tournament.organizers?.find((o) =>
    o.role?.toLowerCase().includes('primary') || o.role?.toLowerCase().includes('host')
  ) || tournament.organizers?.[0];
  const organizerName = primaryOrganizer?.organizer?.name || 'Official Esports';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ═══ 1. CHAMPIONSHIP MAIN OVERVIEW BENTO (8 COLS) ═══ */}
      <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div>
          {/* Top metadata strip */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>{activeStageName || 'Grand Finals'}</span>
              </span>

              {cleanTier && (
                <span className="px-2 py-0.8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                  {cleanTier} Tier
                </span>
              )}

              <span className="px-2 py-0.8 rounded-md bg-blue-500/10 text-[#0A5FC4] dark:text-blue-400 text-xs font-bold flex items-center gap-1">
                <Gamepad2 className="w-3 h-3" />
                {tournament.game.name}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
              </span>
            </div>
          </div>

          {/* Organizer Header & Tournament Title */}
          <div className="py-6 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400">
              {primaryOrganizer?.organizer?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryOrganizer.organizer.logoUrl}
                  alt=""
                  className="w-4 h-4 object-contain rounded shrink-0"
                />
              ) : (
                <Shield className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{organizerName}</span>
              {primaryOrganizer?.role && (
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 lowercase">
                  · {primaryOrganizer.role}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {tournament.name}
            </h2>

            {/* Clean Spec Chips */}
            <div className="flex items-center gap-3 pt-2 flex-wrap text-xs">
              {tournament.gameMode && (
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-medium">Mode</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {tournament.gameMode}
                  </span>
                </div>
              )}

              {tournament.eventType && (
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-medium">Environment</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {tournament.eventType}
                  </span>
                </div>
              )}

              {tournament.platform && (
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-medium">Platform</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {tournament.platform}
                  </span>
                </div>
              )}

              {tournament.device && tournament.device.trim() && (
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-medium">Tournament Device</span>
                  <span className="font-bold text-[#0A5FC4] dark:text-blue-400">
                    {tournament.device}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <Link
            href={`/tournaments/${tournament.slug}?tab=standings`}
            className="font-bold text-[#0A5FC4] hover:underline flex items-center gap-1"
          >
            <span>View Full Stage Standings</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href={`/tournaments/${tournament.slug}?tab=matches`}
            className="px-4 py-2 rounded-xl bg-[#0A5FC4] hover:bg-[#084c9e] text-white font-bold transition-colors flex items-center gap-2 shadow-xs"
          >
            <span>Match Schedule &amp; Results</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ═══ 2. PRIZE POOL & VENUE BENTO (4 COLS) ═══ */}
      <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-6 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Prize &amp; Venue
            </span>
            {cleanTier && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {cleanTier} Tier
              </span>
            )}
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Prize Pool
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              <PrizePoolBadge
                amount={tournament.prizePool}
                currency={tournament.currency}
                usdRate={tournament.usdRate}
              />
            </div>
          </div>
        </div>

        {/* Venue Information (renders all configured venues with stage badges) */}
        {tournament.venues && tournament.venues.length > 0 ? (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5">
              <span className="text-[10px] text-slate-400 font-medium">
                Venue &amp; Physical Locations ({tournament.venues.length})
              </span>
              <MapPin className="w-3.5 h-3.5 text-[#0A5FC4] shrink-0" />
            </div>

            <div className="space-y-2">
              {tournament.venues.map((tv: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white truncate block text-[11px]">
                      {tv.venue.name}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {[tv.venue.city, tv.venue.country || tournament.region].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  {tv.stageName && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400 shrink-0">
                      {tv.stageName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-medium">Region</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block">
                {tournament.region || 'Online Region'}
              </span>
            </div>
            <MapPin className="w-4 h-4 text-[#0A5FC4] shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}
