import Link from 'next/link';
import { Calendar, MapPin, Users, Swords, Gamepad2, ChevronRight, Crown, Medal, Banknote, Trophy } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';

interface VenueEntry {
  stageName?: string | null;
  venue: { name: string; city?: string | null; country?: string | null };
}

interface OrganizerEntry {
  organizer: {
    id: string;
    name: string;
    logoUrl?: string | null;
    imageDarkUrl?: string | null;
  };
}

interface AppHeaderProps {
  tournament: {
    name: string;
    slug: string;
    tier?: string | null;
    status: string;
    series?: string | null;
    season?: string | null;
    eventType?: string | null;
    gameMode?: string | null;
    startDate: Date;
    endDate: Date;
    prizePool?: number | null;
    currency?: string | null;
    usdRate?: number | null;
    imageUrl?: string | null;
    imageDarkUrl?: string | null;
    game: { name: string };
    venues?: VenueEntry[];
    organizers?: OrganizerEntry[];
    winner?: string | null;
    runnerUp?: string | null;
  };
  matchesCount: number;
  teamsCount: number;
  editions?: { slug: string; name: string; season?: string | null }[];
  prevEdition?: { slug: string; name: string; season?: string | null } | null;
  nextEdition?: { slug: string; name: string; season?: string | null } | null;
  resolvedWinner?: string | null;
  resolvedRunnerUp?: string | null;
}

const STATUS_BADGE: Record<string, { label: string; className: string; dot?: boolean }> = {
  ONGOING: { label: 'Live now', className: 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400', dot: true },
  UPCOMING: { label: 'Upcoming', className: 'text-(--ed-blue)' },
  COMPLETED: { label: 'Completed', className: 'text-(--ed-stone)' },
  CANCELED: { label: 'Canceled', className: 'text-(--ed-stone) line-through' },
};

export function TournamentAppHeader({
  tournament,
  matchesCount,
  teamsCount,
  editions,
  prevEdition,
  nextEdition,
  resolvedWinner,
  resolvedRunnerUp,
}: AppHeaderProps) {
  const primaryOrganizer = tournament.organizers?.[0]?.organizer;
  const statusCfg = STATUS_BADGE[tournament.status] ?? STATUS_BADGE.COMPLETED;

  const facts = [
    {
      icon: Calendar,
      label: 'Dates',
      value: <span className="num">{formatDate(tournament.startDate)} — {formatDate(tournament.endDate)}</span>,
    },
    {
      icon: MapPin,
      label: 'Location',
      value:
        tournament.venues && tournament.venues.length > 0 ? (
          <span className="block leading-snug">
            {tournament.venues.map((v, i) => (
              <span key={i} className="block">
                {[v.venue.name, v.venue.city].filter(Boolean).join(', ')}
                {v.stageName && <span className="text-(--ed-stone)"> · {v.stageName}</span>}
              </span>
            ))}
          </span>
        ) : (
          <span>{tournament.eventType || 'Online / LAN'}</span>
        ),
    },
    { icon: Users, label: 'Teams', value: <span className="num">{teamsCount}</span> },
    { icon: Swords, label: 'Matches', value: <span className="num">{matchesCount}</span> },
    { icon: Gamepad2, label: 'Format', value: <span className="truncate">{tournament.gameMode || tournament.eventType || 'Official'}</span> },
    {
      icon: Trophy,
      label: 'Series',
      value: <span className="truncate">{tournament.series ? `${tournament.series}${tournament.season ? ` · ${tournament.season}` : ''}` : tournament.game.name}</span>,
    },
  ];

  return (
    <header className="pt-4 sm:pt-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-(--ed-stone)">
        <Link href="/" className="transition-colors hover:text-(--ed-blue)">Home</Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <Link href="/tournaments" className="transition-colors hover:text-(--ed-blue)">Tournaments</Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <span className="font-medium text-(--ed-ink)">{tournament.game.name}</span>
      </nav>

      {/* Identity row */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-7">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-(--ed-hair) bg-(--ed-surface) p-2.5 sm:h-20 sm:w-20">
          {tournament.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tournament.imageUrl} alt={tournament.name} className="max-h-full max-w-full object-contain dark:hidden" />
          )}
          {tournament.imageDarkUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tournament.imageDarkUrl} alt={tournament.name} className={`max-h-full max-w-full object-contain ${tournament.imageUrl ? 'hidden dark:block' : ''}`} />
          )}
          {!tournament.imageUrl && !tournament.imageDarkUrl && (
            <Trophy className="h-7 w-7 text-(--ed-stone) opacity-50" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-lg border border-(--ed-hair) px-2.5 py-1 text-xs font-medium ${statusCfg.className}`}>
              {statusCfg.dot && <span className="h-1.5 w-1.5 animate-live rounded-full bg-rose-500" />}
              {statusCfg.label}
            </span>
            {tournament.tier && <span className="ed-chip text-(--ed-stone)">{tournament.tier}</span>}
            {tournament.eventType && <span className="ed-chip text-(--ed-stone)">{tournament.eventType}</span>}
          </div>

          <h1 className="font-display mt-2 text-2xl font-medium leading-[1.15] tracking-tight sm:text-3xl lg:text-4xl">
            {tournament.name}
          </h1>

          {(tournament.series || primaryOrganizer) && (
            <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-(--ed-stone)">
              {tournament.series && (
                <span>{tournament.series}{tournament.season ? ` · ${tournament.season}` : ''}</span>
              )}
              {tournament.series && primaryOrganizer && <span aria-hidden>—</span>}
              {primaryOrganizer && <span>Organised by <span className="font-medium text-(--ed-ink)">{primaryOrganizer.name}</span></span>}
            </p>
          )}

          {editions && editions.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {prevEdition && (
                <Link
                  href={`/tournaments/${prevEdition.slug}`}
                  className="ed-chip inline-flex items-center gap-1 font-semibold transition-colors hover:border-(--ed-blue) hover:text-(--ed-blue)"
                  title={prevEdition.name}
                >
                  <span className="opacity-60">Previous:</span>
                  <span className="font-bold">{prevEdition.season || prevEdition.name}</span>
                </Link>
              )}
              <span className="ed-chip inline-flex items-center gap-1 border-(--ed-blue) bg-(--ed-blue)/10 font-bold text-(--ed-blue)">
                <span className="opacity-60">Current:</span>
                <span>{tournament.season || tournament.series || 'Active Season'}</span>
              </span>
              {nextEdition && (
                <Link
                  href={`/tournaments/${nextEdition.slug}`}
                  className="ed-chip inline-flex items-center gap-1 font-semibold transition-colors hover:border-(--ed-blue) hover:text-(--ed-blue)"
                  title={nextEdition.name}
                >
                  <span className="opacity-60">Next:</span>
                  <span className="font-bold">{nextEdition.season || nextEdition.name}</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Facts strip + prize block */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="ed-card grid grid-cols-2 gap-px bg-(--ed-hair) sm:grid-cols-3 lg:col-span-8">
          {facts.map((f) => (
            <div key={f.label} className="bg-(--ed-surface) px-5 py-4">
              <p className="ed-label mb-1.5 flex items-center gap-1.5">
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
              </p>
              <div className="text-sm font-medium">{f.value}</div>
            </div>
          ))}
        </div>

        <div className="ed-card flex flex-col justify-between p-4 lg:col-span-4">
          <div>
            <p className="ed-label mb-2 flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" />
              Total Prize Pool
            </p>
            <div className="font-display text-3xl font-medium tracking-tight">
              <PrizePoolBadge
                amount={tournament.prizePool}
                currency={tournament.currency}
                usdRate={tournament.usdRate}
                secondaryClassName="text-(--ed-stone) font-normal"
              />
            </div>
          </div>

          {(resolvedWinner || resolvedRunnerUp) ? (
            <div className="mt-5 space-y-2.5 border-t border-(--ed-hair) pt-4 text-sm">
              {resolvedWinner && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-(--ed-stone)">
                    <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Champion
                  </span>
                  <span className="truncate font-medium">{resolvedWinner}</span>
                </div>
              )}
              {resolvedRunnerUp && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-(--ed-stone)">
                    <Medal className="h-4 w-4" />
                    Runner-up
                  </span>
                  <span className="truncate font-medium">{resolvedRunnerUp}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-5 border-t border-(--ed-hair) pt-4 text-sm text-(--ed-stone)">
              Champion to be crowned at the Grand Finals.
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
