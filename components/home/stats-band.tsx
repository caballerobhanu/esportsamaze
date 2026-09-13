import Link from 'next/link';

/**
 * Closing masthead above the footer: the site statement (the page's single h1),
 * live database counters, and a quick-link row for crawlable internal linking.
 */
export function StatsBand({
  tournamentsCount,
  teamsCount,
  playersCount,
  matchesCount,
}: {
  tournamentsCount: number;
  teamsCount: number;
  playersCount: number;
  matchesCount: number;
}) {
  const quickLinks = [
    { label: 'All tournaments', href: '/tournaments' },
    { label: 'Team index', href: '/teams' },
    { label: 'Power rankings', href: '/rankings' },
    { label: 'Compare teams', href: '/compare' },
    { label: 'News & analysis', href: '/news' },
    { label: 'About the project', href: '/about' },
  ];

  const counters = [
    { label: 'Tournaments', value: tournamentsCount },
    { label: 'Teams', value: teamsCount },
    { label: 'Players', value: playersCount },
    { label: 'Matches', value: matchesCount },
  ];

  return (
    <section className="border-y border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 md:grid-cols-2 md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400">eSportsAmaze</p>
            <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black uppercase leading-tight tracking-tight text-slate-950 dark:text-white">
              Esports statistics and tournament coverage
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Standings, match results, rankings, roster moves, and news for competitive BGMI —
              updated as tournaments happen.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 md:justify-items-end">
            {counters.map(({ label, value }) => (
              <div key={label} className="border-l-2 border-[#0A5FC4] pl-3 md:border-l md:border-slate-200 dark:md:border-white/10 md:pl-5">
                <dd className="text-2xl font-black leading-tight tabular-nums text-slate-950 dark:text-white sm:text-3xl">
                  {value.toLocaleString('en-IN')}
                </dd>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-slate-200/80 dark:border-white/10 pt-6 text-xs font-bold text-slate-500 dark:text-slate-400">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[#0A5FC4] dark:hover:text-blue-300"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
