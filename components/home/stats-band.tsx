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
    <section className="border-y border-[var(--ed-hair)] bg-[var(--ed-surface)]">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 md:grid-cols-2 md:items-end">
          <div>
            <p className="kicker text-[var(--ed-blue)]">eSportsAmaze</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Esports statistics and tournament coverage
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--ed-stone)]">
              Standings, match results, rankings, roster moves, and news for competitive BGMI —
              updated as tournaments happen.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 md:justify-items-end">
            {counters.map(({ label, value }) => (
              <div key={label} className="border-l-2 border-[var(--ed-blue)] pl-3 md:border-l md:border-[var(--ed-hair)] md:pl-5">
                <dd className="text-xl font-bold leading-tight tabular-nums sm:text-2xl">
                  {value.toLocaleString('en-IN')}
                </dd>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ed-stone)]">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-t border-[var(--ed-hair)] pt-6">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="ed-chip px-3.5 py-1.5 transition-colors hover:border-[var(--ed-blue)] hover:text-[var(--ed-blue)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
