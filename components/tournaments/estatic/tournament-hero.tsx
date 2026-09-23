import Link from 'next/link';
import { TournamentShortName } from '@/components/ui/tournament-name';
import { Crown, Trophy, Users, Layers, Swords } from 'lucide-react';
import { EditionPagerButtons, EditionSwitcher } from './edition-nav';
import { formatDate } from '@/lib/utils';
import { ThemeLogo } from './theme-logo';
import type { TournamentContext } from '@/app/(public)/[game]/tournaments/[slug]/tournament-data';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

/**
 * The estatic masthead shared by every tournament tab route:
 * breadcrumb + editions pager, emblem, title/chips, season switcher,
 * champion line, and the 4-cell stat band.
 */
export function TournamentHero({ ctx }: { ctx: TournamentContext }) {
  const { tournament } = ctx;

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
      {/* Dynamic radial glow and watermark */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(10,95,196,.16),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(10,95,196,.05)_42%,rgba(10,95,196,.05)_43%,transparent_43%)] dark:bg-[radial-gradient(circle_at_80%_-10%,rgba(37,99,235,.24),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(255,255,255,.03)_42%,rgba(255,255,255,.03)_43%,transparent_43%)]" />
      {ctx.backdropWatermark && (
        <div className="pointer-events-none absolute -bottom-8 right-0 select-none text-[15vw] font-black uppercase leading-none tracking-tighter text-slate-900/[0.04] dark:text-white/[0.03]">
          {ctx.backdropWatermark}
        </div>
      )}

      <div className="relative mx-auto max-w-[var(--page-max-width)] px-4 pb-0 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        {/* Breadcrumb + Editions Pager */}
        <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">
            <Link href="/" className="shrink-0 hover:text-[#0A5FC4]">Home</Link>
            <span className="shrink-0">/</span>
            <Link href={gameHref(DEFAULT_GAME_SLUG, 'tournaments')} className="shrink-0 hover:text-[#0A5FC4]">Tournaments</Link>
            <span className="shrink-0">/</span>
            <span className="truncate text-[#0A5FC4] dark:text-blue-300">
              <TournamentShortName name={tournament.name} shortName={tournament.shortName} />
            </span>
          </div>

          <EditionPagerButtons
            prevEdition={ctx.prevEdition}
            nextEdition={ctx.nextEdition}
          />
        </div>

        {/* Masthead grid: Emblem + Title */}
        <div className="grid items-center gap-5 pb-8 sm:gap-8 sm:pb-12 lg:grid-cols-[auto_1fr]">
          {/* Signature Emblem Box */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-2 rotate-2 rounded-[2.2rem] bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20 sm:-inset-3 sm:rounded-[2.8rem]" />
              <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-br from-blue-100 via-slate-100 to-blue-200 shadow-[0_25px_70px_-20px_rgba(10,95,196,.5)] dark:border-[#182338] dark:from-blue-950 dark:via-slate-900 dark:to-[#0A5FC4]/30 sm:h-48 sm:w-48 sm:rounded-[2.5rem] sm:border-8 lg:h-52 lg:w-52 xl:h-60 xl:w-60">
                {tournament.imageUrl || tournament.imageDarkUrl ? (
                  <ThemeLogo
                    lightSrc={tournament.imageUrl}
                    darkSrc={tournament.imageDarkUrl}
                    alt={tournament.name}
                    className="object-contain p-4"
                    priority
                  />
                ) : tournament.game?.logoUrl ? (
                  <ThemeLogo
                    lightSrc={tournament.game.logoUrl}
                    alt={tournament.name}
                    className="object-contain p-6"
                    priority
                  />
                ) : (
                  <div className="text-5xl font-black text-[#0A5FC4]/40">
                    {tournament.name.slice(0, 4).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="text-center lg:text-left">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {tournament.status || 'Active Event'}
              </span>
              <span className="rounded-full bg-[#0A5FC4]/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
                {tournament.game?.name || 'Battle Royale'}
              </span>
              {(tournament.games ?? [])
                .filter((g) => g.game.id !== tournament.gameId)
                .map((g) => (
                  <span key={g.game.slug} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {g.game.name}
                  </span>
                ))}
              {tournament.tier && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  <Crown className="h-3.5 w-3.5" /> {tournament.tier.toLowerCase().includes('tier') ? tournament.tier : `Tier ${tournament.tier}`}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black uppercase leading-[1.08] tracking-[-.04em] text-slate-950 dark:text-white sm:text-4xl sm:leading-tight sm:tracking-[-.05em] lg:text-5xl">
              {tournament.name}
            </h1>

            <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
              {ctx.organizerNames && (
                <>
                  Organized by <strong className="text-slate-900 dark:text-white">{ctx.organizerNames}</strong>
                  <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                </>
              )}
              {ctx.venueLocation && (
                <>
                  <span>{ctx.venueLocation}</span>
                  <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                </>
              )}
              <span>{formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}</span>
            </p>

            {/* Season / Edition Switcher */}
            {ctx.editions.length > 1 && (
              <EditionSwitcher
                prevEdition={ctx.prevEdition}
                nextEdition={ctx.nextEdition}
                currentLabel={tournament.season || tournament.series || 'Active Season'}
              />
            )}

            {(ctx.resolvedWinner || ctx.resolvedRunnerUp) && (
              <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-bold">
                {ctx.resolvedWinner && (
                  <span className="inline-flex items-center gap-1.5 text-amber-500">
                    <Crown className="h-4 w-4" /> Champion: <strong className="text-slate-950 dark:text-white">{ctx.resolvedWinner}</strong>
                  </span>
                )}
                {ctx.resolvedRunnerUp && (
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <Trophy className="h-4 w-4" /> Runner-up: <strong className="text-slate-950 dark:text-white">{ctx.resolvedRunnerUp}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Signature Stat Band */}
        <div className="grid grid-cols-2 divide-slate-200 border-t border-slate-200 dark:divide-white/10 dark:border-white/10 md:grid-cols-4 md:divide-x">
          {[
            {
              label: 'Prize Pool',
              value: ctx.prizePoolLabel,
              icon: Trophy,
            },
            {
              label: 'Competing Teams',
              // The announced field size wins. Without one, report squads actually
              // named — never the row count, which includes unfilled seats.
              value: `${tournament.teamsToShow ?? ctx.namedTeamsCount} Teams`,
              icon: Users,
            },
            {
              label: 'Tournament Stages',
              value: `${tournament.stages.length} Stages`,
              icon: Layers,
            },
            {
              label: 'Matches Scheduled',
              value: `${ctx.totalMatchesCount} Matches`,
              icon: Swords,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex min-w-0 flex-col items-center gap-1 px-2 py-4 sm:gap-1.5 sm:py-5">
              <Icon className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
              <span className="text-lg font-black tracking-tight sm:text-xl md:text-2xl xl:text-3xl">{value}</span>
              <span className="text-[9px] font-extrabold uppercase tracking-[.18em] text-slate-400 sm:text-[10px]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
