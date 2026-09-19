import Link from 'next/link';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Crown,
  Globe,
} from 'lucide-react';

import { ThemeLogo } from '@/components/ui/theme-logo';
import type { TeamContext } from '@/lib/team-data';

const socialIcons: Record<string, typeof Globe> = {
  instagram: Globe,
  youtube: Globe,
  twitter: Globe,
  x: Globe,
  discord: Globe,
  website: Globe,
};

function socialLinkHref(key: string, value: string) {
  const clean = value.trim();
  if (/^(javascript|data|vbscript):/i.test(clean)) return '#';
  if (/^https?:\/\//i.test(clean)) return clean;
  const handle = clean.replace(/^@/, '');
  if (key === 'instagram') return `https://instagram.com/${handle}`;
  if (key === 'youtube') return `https://youtube.com/@${handle}`;
  if (key === 'twitter' || key === 'x') return `https://twitter.com/${handle}`;
  if (key === 'discord') return `https://discord.gg/${handle}`;
  return `https://${clean}`;
}

export function teamHref(team: { slug: string | null; tag: string | null; id: string }) {
  return `/teams/${team.slug || team.tag || team.id}`;
}

/**
 * Identity masthead shared by every team tab route. The stat band is NOT here —
 * it is Overview content and lives in the Overview panel.
 *
 * `kraftonRank` is optional so the tabs that don't load the KRAFTON board simply
 * omit the pill instead of paying for the ranking computation.
 */
export function TeamHero({
  team,
  kraftonRank,
}: {
  team: TeamContext;
  kraftonRank?: number | null;
}) {
  const titles = team.won.length;
  const socials = team.socials;

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
      {/* watermark + brand wash */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(10,95,196,.16),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(10,95,196,.05)_42%,rgba(10,95,196,.05)_43%,transparent_43%)] dark:bg-[radial-gradient(circle_at_80%_-10%,rgba(37,99,235,.24),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(255,255,255,.03)_42%,rgba(255,255,255,.03)_43%,transparent_43%)]" />
      <div className="pointer-events-none absolute -bottom-8 right-0 select-none text-[16vw] font-black uppercase leading-none tracking-tighter text-slate-900/[0.04] dark:text-white/[0.03]">
        {team.tag || team.name}
      </div>

      <div className="relative mx-auto max-w-[var(--page-max-width)] px-4 pt-3 sm:px-6 sm:pt-5 lg:px-8">
        {/* breadcrumb + pager */}
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-10">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-400 dark:text-slate-500 sm:gap-2 sm:text-[11px] sm:tracking-[.18em]">
            <Link href="/" className="hover:text-[#0A5FC4]">Home</Link>
            <span>/</span>
            <span className="truncate max-w-[110px] sm:max-w-none">
              <span className="sm:hidden">{team.game?.name?.toLowerCase().includes('battlegrounds') ? 'BGMI' : (team.game?.name || 'Esports')}</span>
              <span className="hidden sm:inline">{team.game?.name || 'Esports'}</span>
            </span>
            <span>/</span>
            <span className="text-[#0A5FC4] dark:text-blue-300">Team profile</span>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            {team.prevTeam && (
              <Link
                href={teamHref(team.prevTeam)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 sm:p-2"
                aria-label={`Previous team: ${team.prevTeam.name}`}
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            )}
            {team.nextTeam && (
              <Link
                href={teamHref(team.nextTeam)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 sm:p-2"
                aria-label={`Next team: ${team.nextTeam.name}`}
              >
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            )}
          </div>
        </div>

        <div className="grid items-center gap-4 pb-5 sm:gap-10 sm:pb-10 lg:grid-cols-[auto_1fr] lg:pb-12">
          {/* Logo card */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-2 rotate-2 rounded-[1.8rem] bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20 sm:-inset-3 sm:rounded-[2.8rem]" />
              <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-[1.8rem] border-4 border-white bg-gradient-to-br from-blue-100 via-slate-100 to-blue-200 shadow-[0_25px_70px_-20px_rgba(10,95,196,.5)] dark:border-[#182338] dark:from-blue-950 dark:via-slate-900 dark:to-[#0A5FC4]/30 sm:h-56 sm:w-56 sm:rounded-[2.5rem] sm:border-8">
                {team.logoUrl || team.imageDarkUrl ? (
                  <ThemeLogo
                    lightSrc={team.logoUrl}
                    darkSrc={team.imageDarkUrl}
                    alt={team.name}
                    className="object-contain p-3 sm:p-4"
                    priority
                  />
                ) : (
                  <div className="text-4xl font-black text-[#0A5FC4]/40 sm:text-5xl">
                    {team.tag || team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="text-center lg:text-left">
            <div className="mb-2.5 flex flex-wrap items-center justify-center gap-1.5 sm:mb-4 sm:gap-2 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 sm:px-3 sm:py-1.5 sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {team.status || 'Active'}
              </span>
              <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300 sm:px-3 sm:py-1.5 sm:text-[11px]">
                <span className="sm:hidden">{team.game?.name?.toLowerCase().includes('battlegrounds') ? 'BGMI' : (team.game?.name || 'Esports')}</span>
                <span className="hidden sm:inline">{team.game?.name || 'Esports'}</span>
              </span>
              {titles > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-300 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]">
                  <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {titles}× Champion
                </span>
              )}
              {typeof kraftonRank === 'number' && (
                <Link
                  href={`/rankings/team/${team.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[#0A5FC4]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] transition hover:bg-[#0A5FC4]/20 dark:bg-[#0A5FC4]/20 dark:text-blue-300 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]"
                >
                  <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> #{kraftonRank} KRAFTON Ranking
                </Link>
              )}
            </div>
            <h1 className="text-2xl font-black uppercase tracking-[-.05em] text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              {team.name}
            </h1>
            <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 sm:mt-4 sm:text-sm">
              {team.region || 'Global'} region
              {team.sponsors && (
                <>
                  <span className="mx-2 text-slate-300">•</span> Sponsored by {team.sponsors}
                </>
              )}
            </p>
            {Object.keys(socials).length > 0 && (
              <div className="mt-6 flex justify-center gap-2 lg:justify-start">
                {Object.entries(socials).map(([key, value]) => {
                  const Icon = socialIcons[key] || Globe;
                  return (
                    <a
                      key={key}
                      href={socialLinkHref(key, value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                      aria-label={key}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
