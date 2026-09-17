'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn, getTournamentShortName } from '@/lib/utils';

type EventTab = 'active' | 'past';
type EventStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELED';

interface EventCardData {
  id: string;
  slug?: string;
  name: string;
  shortName?: string | null;
  status: EventStatus;
  startDate: string;
  endDate: string;
  gameName: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  stageName: string;
}

export interface RawTournamentRow {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  status: EventStatus;
  startDate: string | Date;
  endDate: string | Date;
  imageUrl?: string | null;
  imageDarkUrl?: string | null;
  game: { name: string; logoUrl: string | null; logoDarkUrl: string | null } | null;
  stages: { sequence: number; name: string }[];
}

function normalizeEvent(raw: RawTournamentRow): EventCardData {
  const status: EventStatus = raw.status;

  let stageName: string;
  if (raw.stages.length > 0) {
    const sorted = [...raw.stages].sort((a, b) => a.sequence - b.sequence);
    stageName = status === 'UPCOMING' ? sorted[0].name : sorted[sorted.length - 1].name;
  } else {
    stageName =
      status === 'ONGOING'
        ? 'In Progress'
        : status === 'UPCOMING'
          ? 'Upcoming'
          : 'Concluded';
  }

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    shortName: raw.shortName ?? null,
    status,
    startDate: String(raw.startDate),
    endDate: String(raw.endDate),
    gameName: raw.game?.name ?? '',
    logoUrl: raw.imageUrl ?? raw.game?.logoUrl ?? null,
    logoDarkUrl: raw.imageDarkUrl ?? raw.game?.logoDarkUrl ?? null,
    stageName,
  };
}

function selectEvents(all: EventCardData[], tab: EventTab): EventCardData[] {
  const live = all
    .filter((e) => e.status === 'ONGOING')
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
  const upcoming = all
    .filter((e) => e.status === 'UPCOMING')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = all
    .filter((e) => e.status === 'COMPLETED')
    .sort((a, b) => b.endDate.localeCompare(a.endDate));

  if (tab === 'active') {
    return [...live, ...upcoming];
  }
  return past;
}

function EventLogo({
  event,
  className = 'h-14 w-14',
}: {
  event: EventCardData;
  className?: string;
}) {
  // Track broken images so a failed variant falls back to the other one / initials.
  const [failed, setFailed] = React.useState({ light: false, dark: false });

  const showLight = Boolean(event.logoUrl) && !failed.light;
  const showDark = Boolean(event.logoDarkUrl) && !failed.dark;

  if (!showLight && !showDark) {
    const initials = event.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');

    // Placeholder monogram — no circle, ink→blue plate like the emblem box.
    return (
      <div
        className={cn('flex items-center justify-center rounded-xl', className)}
        style={{ backgroundImage: 'linear-gradient(135deg, var(--ed-blue), var(--ed-ink))' }}
      >
        <span className="text-2xl font-black leading-none text-white">
          {initials || event.gameName.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <>
      {showLight && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.logoUrl ?? undefined}
          alt={showDark ? '' : event.name}
          onError={() => setFailed((f) => ({ ...f, light: true }))}
          className={cn(className, 'shrink-0 object-contain dark:hidden')}
        />
      )}
      {showDark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.logoDarkUrl ?? undefined}
          alt={event.name}
          onError={() => setFailed((f) => ({ ...f, dark: true }))}
          className={cn(className, 'hidden shrink-0 object-contain dark:block')}
        />
      )}
    </>
  );
}

export function EventsSection({ initialTournaments = [] }: { initialTournaments?: RawTournamentRow[] }) {
  const [tab, setTab] = React.useState<EventTab>('active');
  const events = React.useMemo(
    () => initialTournaments.map(normalizeEvent),
    [initialTournaments]
  );

  const visible = selectEvents(events, tab);

  return (
    <section className="border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-[#0b1220]/90">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 sm:py-3.5 space-y-3">
        {/* Header: label + tab toggle on the right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Tournament Circuit
            </h2>
          </div>

          <div className="flex items-center rounded-full bg-slate-100 p-1 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => setTab('active')}
              className={cn(
                'px-3.5 py-1 rounded-full text-xs font-bold transition-all',
                tab === 'active'
                  ? 'bg-[#0A5FC4] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
              aria-pressed={tab === 'active'}
            >
              Active
            </button>
            <button
              onClick={() => setTab('past')}
              className={cn(
                'px-3.5 py-1 rounded-full text-xs font-bold transition-all',
                tab === 'past'
                  ? 'bg-[#0A5FC4] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
              aria-pressed={tab === 'past'}
            >
              Past
            </button>
          </div>
        </div>

        {/* Cards strip */}
        {events === null ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] w-[112px] sm:w-[148px] shrink-0 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]/60 animate-pulse"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--ed-stone)]">
            No {tab === 'active' ? 'active or upcoming' : 'past'} events right now.
          </p>
        ) : (
          <div className="rail pb-1">
            {visible.map((event) => {
              const isLive = event.status === 'ONGOING';
              const isUpcoming = event.status === 'UPCOMING';

              // Logo plate — full-bleed square with a soft brand wash
              const plateStyle =
                event.status === 'ONGOING'
                  ? {
                      backgroundImage:
                        'radial-gradient(circle at 50% 32%, color-mix(in srgb, var(--ed-magenta) 22%, var(--ed-sand)), var(--ed-sand) 78%)',
                    }
                  : event.status === 'UPCOMING'
                    ? {
                        backgroundImage:
                          'radial-gradient(circle at 50% 32%, color-mix(in srgb, var(--ed-blue) 22%, var(--ed-sand)), var(--ed-sand) 78%)',
                      }
                    : {
                        backgroundImage:
                          'linear-gradient(180deg, var(--ed-sand) 0%, var(--ed-canvas) 100%)',
                      };

              // Bottom band — different backdrop with the short name
              const bandStyle =
                event.status === 'ONGOING'
                  ? {
                      backgroundImage:
                        'linear-gradient(90deg, var(--ed-magenta), color-mix(in oklab, var(--ed-magenta) 55%, var(--ed-blue)))',
                    }
                  : event.status === 'UPCOMING'
                    ? {
                        backgroundImage:
                          'linear-gradient(90deg, var(--ed-blue), color-mix(in oklab, var(--ed-blue) 55%, var(--ed-ink)))',
                      }
                    : {
                        backgroundImage:
                          'linear-gradient(90deg, color-mix(in oklab, var(--ed-stone) 38%, var(--ed-sand)), var(--ed-sand))',
                      };

              const bandTextClass =
                event.status === 'ONGOING' || event.status === 'UPCOMING'
                  ? 'text-white'
                  : 'text-[var(--ed-ink)]';

              const cardClasses = cn(
                'group relative aspect-[3/4] w-[112px] sm:w-[148px] shrink-0 overflow-hidden rounded-2xl flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md'
              );

              const inner = (
                <>
                  {/* Top 3/4 — full-bleed logo plate (no circle, no border) */}
                  <div
                    className="relative aspect-square w-full flex items-center justify-center p-2.5 sm:p-4"
                    style={plateStyle}
                  >
                    <EventLogo
                      event={event}
                      className="h-full w-full group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  {/* Bottom 1/4 — the short name on a phone, the full name once the card
                      is wide enough to carry it. Three lines clamped: a long event name
                      has to fit the ribbon without pushing the logos around. */}
                  <div
                    className={cn('flex min-h-0 flex-1 items-center justify-center px-1.5 relative overflow-hidden', bandTextClass)}
                    style={bandStyle}
                  >
                    <span className="truncate text-[10px] font-black uppercase tracking-wide sm:hidden">
                      {getTournamentShortName({ name: event.name, shortName: event.shortName })}
                    </span>
                    <span className="line-clamp-3 text-center text-[10px] font-black uppercase leading-tight tracking-wide max-sm:hidden">
                      {event.name}
                    </span>
                  </div>

                  {isLive && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--ed-magenta)] ring-2 ring-white/70 animate-pulse z-10" />
                  )}
                  {isUpcoming && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ed-blue)] z-10" />
                  )}
                </>
              );

              return event.slug ? (
                <Link key={event.id} href={`/tournaments/${event.slug}`} className={cardClasses} title={event.name}>
                  {inner}
                </Link>
              ) : (
                <article key={event.id} className={cardClasses}>
                  {inner}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
