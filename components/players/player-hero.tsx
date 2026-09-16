import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BarChart3, Briefcase, Check } from 'lucide-react';

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

      <div className="relative mx-auto max-w-7xl px-4 pb-0 pt-5 sm:px-6 lg:px-8">
        {/* breadcrumb + pager */}
        <div className="mb-10 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">
            <Link href="/" className="hover:text-[#0A5FC4]">Home</Link>
            <span>/</span>
            <span>{player.game?.name || 'Esports'}</span>
            <span>/</span>
            <span className="text-[#0A5FC4] dark:text-blue-300">Player profile</span>
          </div>
          <div className="flex gap-2">
            {prevPlayer && (
              <Link
                href={`/players/${prevPlayer.slug}`}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                aria-label={`Previous player: ${prevPlayer.ign}`}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Link>
            )}
            {nextPlayer && (
              <Link
                href={`/players/${nextPlayer.slug}`}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                aria-label={`Next player: ${nextPlayer.ign}`}
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        <div className="grid items-center gap-10 pb-12 lg:grid-cols-[auto_1fr] lg:pb-16">
          {/* Portrait card */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-3 -rotate-2 rounded-[2.8rem] bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20" />
              <div className="relative h-56 w-56 overflow-hidden rounded-[2.5rem] border-8 border-white bg-gradient-to-br from-blue-100 via-slate-100 to-blue-200 shadow-[0_25px_70px_-20px_rgba(10,95,196,.5)] dark:border-[#182338] dark:from-blue-950 dark:via-slate-900 dark:to-[#0A5FC4]/30 sm:h-72 sm:w-72">
                {avatar ? (
                  <Image src={avatar} alt={player.ign} fill className="object-contain object-bottom" priority />
                ) : (
                  <div className="flex h-full items-center justify-center text-8xl font-black text-[#0A5FC4]/30">
                    {player.ign.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white dark:border-[#182338]">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>

          {/* Identity block */}
          <div className="text-center lg:text-left">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              {player.isPlayer && (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active player
                </span>
              )}
              {player.staffRole && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                  <Briefcase className="h-3.5 w-3.5" /> {player.staffRole}
                </span>
              )}
              <span className="rounded-full bg-[#0A5FC4]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
                {player.game?.name || 'Competitive player'}
              </span>
              {standing && (
                <Link
                  href={`/rankings/player/${player.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0A5FC4]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] transition hover:bg-[#0A5FC4]/20 dark:bg-[#0A5FC4]/20 dark:text-blue-300"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> #{standing.rank} KRAFTON Ranking
                </Link>
              )}
            </div>
            <h1 className="text-4xl font-black tracking-[-.06em] text-slate-950 dark:text-white sm:text-6xl lg:text-7xl break-words">
              {player.ign}
            </h1>
            <p className="mt-4 text-base font-medium text-slate-500 dark:text-slate-400">
              {realName}
              <span className="mx-2 text-slate-300">•</span>
              {player.role || (player.staffRole ? player.staffRole : 'Professional player')}
            </p>

            {player.currentTeam && (
              <Link
                href={`/teams/${player.currentTeam.slug}`}
                className="mt-7 inline-flex max-w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center">
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
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            )}
          </div>
        </div>

        {/* Stat band — full-bleed under hero */}
        <div className="grid grid-cols-2 divide-slate-200 border-t border-slate-200 dark:divide-white/10 dark:border-white/10 md:grid-cols-4 md:divide-x">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 px-2 py-6 text-center">
              <span className={`text-3xl font-black tracking-tight ${stat.accent ? 'text-[#0A5FC4] dark:text-blue-300' : ''}`}>
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
