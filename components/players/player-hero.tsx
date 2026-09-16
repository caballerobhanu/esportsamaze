import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BarChart3, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';

import type { PlayerHeroProps } from '@/app/(public)/players/[slug]/player-data';

/**
 * The player masthead, shared by every profile tab so the four routes render an
 * identical header. Its numbers come from `buildHeroProps`, so the stat band
 * cannot disagree between tabs.
 */
export function PlayerHero({ player, standing, stats, prevPlayer, nextPlayer }: PlayerHeroProps) {
  const avatar = player.avatarUrl;
  const realName = [player.firstName, player.lastName].filter(Boolean).join(' ') || 'Name not disclosed';

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_42%,rgba(10,95,196,.06)_42%,rgba(10,95,196,.06)_43%,transparent_43%),radial-gradient(circle_at_85%_-10%,rgba(10,95,196,.18),transparent_45%)] dark:bg-[linear-gradient(115deg,transparent_42%,rgba(255,255,255,.03)_42%,rgba(255,255,255,.03)_43%,transparent_43%),radial-gradient(circle_at_85%_-10%,rgba(37,99,235,.25),transparent_45%)]" />
      <div className="pointer-events-none absolute -right-10 bottom-0 select-none text-[22vw] font-black leading-none tracking-tighter text-slate-900/[0.04] dark:text-white/[0.03]">
        {player.ign.slice(0, 3).toUpperCase()}
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-0 pt-3 sm:px-6 sm:pt-5 lg:px-8">
        {/* breadcrumb + pager */}
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-10">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-400 dark:text-slate-500 sm:gap-2 sm:text-[11px] sm:tracking-[.18em]">
            <Link href="/" className="hover:text-[#0A5FC4]">Home</Link>
            <span>/</span>
            <span className="truncate max-w-[110px] sm:max-w-none">
              <span className="sm:hidden">{player.game?.name?.toLowerCase().includes('battlegrounds') ? 'BGMI' : (player.game?.name || 'Esports')}</span>
              <span className="hidden sm:inline">{player.game?.name || 'Competitive'}</span>
            </span>
            <span>/</span>
            <span className="text-[#0A5FC4] dark:text-blue-300">Player profile</span>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            {prevPlayer && (
              <Link
                href={`/players/${prevPlayer.slug}`}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 sm:p-2"
                aria-label={`Previous player: ${prevPlayer.ign}`}
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            )}
            {nextPlayer && (
              <Link
                href={`/players/${nextPlayer.slug}`}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 sm:p-2"
                aria-label={`Next player: ${nextPlayer.ign}`}
              >
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            )}
          </div>
        </div>

        <div className="grid items-center gap-4 pb-5 sm:gap-10 sm:pb-12 lg:grid-cols-[auto_1fr] lg:pb-16">
          {/* Portrait card */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-2 -rotate-2 rounded-[1.8rem] bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20 sm:-inset-3 sm:rounded-[2.8rem]" />
              <div className="relative h-32 w-32 overflow-hidden rounded-[1.8rem] border-4 border-white bg-gradient-to-br from-blue-100 via-slate-100 to-blue-200 shadow-[0_25px_70px_-20px_rgba(10,95,196,.5)] dark:border-[#182338] dark:from-blue-950 dark:via-slate-900 dark:to-[#0A5FC4]/30 sm:h-72 sm:w-72 sm:rounded-[2.5rem] sm:border-8">
                {avatar ? (
                  <Image src={avatar} alt={player.ign} fill className="object-contain object-bottom" priority />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl font-black text-[#0A5FC4]/30 sm:text-8xl">
                    {player.ign.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Identity block */}
          <div className="text-center lg:text-left">
            <div className="mb-2.5 flex flex-wrap items-center justify-center gap-1.5 sm:mb-4 sm:gap-2 lg:justify-start">
              {player.isPlayer && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 sm:px-3 sm:py-1.5 sm:text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active player
                </span>
              )}
              {player.staffRole && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]">
                  <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {player.staffRole}
                </span>
              )}
              <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300 sm:px-3 sm:py-1.5 sm:text-[11px]">
                <span className="sm:hidden">{player.game?.name?.toLowerCase().includes('battlegrounds') ? 'BGMI' : (player.game?.name || 'Competitive')}</span>
                <span className="hidden sm:inline">{player.game?.name || 'Competitive player'}</span>
              </span>
              {standing && (
                <Link
                  href={`/rankings/player/${player.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[#0A5FC4]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] transition hover:bg-[#0A5FC4]/20 dark:bg-[#0A5FC4]/20 dark:text-blue-300 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]"
                >
                  <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> #{standing.rank} KRAFTON Ranking
                </Link>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-[-.06em] text-slate-950 dark:text-white sm:text-6xl lg:text-7xl break-words">
              {player.ign}
            </h1>
            <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 sm:mt-4 sm:text-base">
              {realName}
              <span className="mx-2 text-slate-300">•</span>
              {player.role || (player.staffRole ? player.staffRole : 'Professional player')}
            </p>

            {player.currentTeam && (
              <Link
                href={`/teams/${player.currentTeam.slug}`}
                className="mt-3.5 inline-flex max-w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-extrabold transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 sm:mt-7 sm:gap-3 sm:px-4 sm:py-3 sm:text-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center sm:h-8 sm:w-8">
                  {player.currentTeam.logoUrl || player.currentTeam.imageDarkUrl ? (
                    <>
                      {player.currentTeam.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.currentTeam.logoUrl}
                          alt=""
                          className="max-h-full max-w-full object-contain dark:hidden"
                        />
                      )}
                      {player.currentTeam.imageDarkUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.currentTeam.imageDarkUrl}
                          alt=""
                          className={`max-h-full max-w-full object-contain ${player.currentTeam.logoUrl ? 'hidden dark:block' : ''}`}
                        />
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] font-black text-[#0A5FC4] dark:text-blue-300">
                      {player.currentTeam.tag?.slice(0, 3) || 'TM'}
                    </span>
                  )}
                </span>
                <span className="truncate">{player.currentTeam.name}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Stat band — full-bleed under hero */}
        <div className="grid grid-cols-2 divide-slate-200 border-t border-slate-200 dark:divide-white/10 dark:border-white/10 md:grid-cols-4 md:divide-x">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 px-2 py-4 text-center sm:py-6">
              <span className={`text-2xl font-black tracking-tight sm:text-3xl ${stat.accent ? 'text-[#0A5FC4] dark:text-blue-300' : ''}`}>
                {stat.value}
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
