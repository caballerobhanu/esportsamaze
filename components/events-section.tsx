'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type EventTab = 'active' | 'past';
type EventStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELED';

interface EventCardData {
  id: string;
  slug?: string;
  name: string;
  status: EventStatus;
  startDate: string;
  endDate: string;
  gameName: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  stageName: string;
}

interface RawTournamentRow {
  id: string;
  slug: string;
  name: string;
  status: EventStatus;
  startDate: string;
  endDate: string;
  imageUrl?: string | null;
  imageDarkUrl?: string | null;
  game: { name: string; logoUrl: string | null } | null;
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
    status,
    startDate: String(raw.startDate),
    endDate: String(raw.endDate),
    gameName: raw.game?.name ?? '',
    logoUrl: raw.imageUrl ?? raw.game?.logoUrl ?? null,
    logoDarkUrl: raw.imageDarkUrl ?? null,
    stageName,
  };
}

function selectEvents(all: EventCardData[], tab: EventTab): EventCardData[] {
  const live = all
    .filter((e) => e.status === 'ONGOING')
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
  const upcoming = all
    .filter((e) => e.status === 'UPCOMING')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 4);
  const past = all
    .filter((e) => e.status === 'COMPLETED')
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
    .slice(0, 5);

  return tab === 'active' ? [...live, ...upcoming] : past;
}

function EventLogo({ event }: { event: EventCardData }) {
  const initials = event.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  // Logo files can 404 (e.g. paths backed by public/ assets that aren't
  // deployed); drop a broken variant and fall back to the other one/initials.
  const [failed, setFailed] = React.useState({ light: false, dark: false });
  const showLight = Boolean(event.logoUrl) && !failed.light;
  const showDark = Boolean(event.logoDarkUrl) && !failed.dark;

  if (showLight || showDark) {
    return (
      <div className="relative w-12 h-12 rounded-full overflow-hidden ring-1 ring-[var(--ed-hair)] shrink-0 bg-slate-50 dark:bg-black/40">
        {showLight && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.logoUrl ?? undefined}
            alt={showDark ? '' : event.name}
            onError={() => setFailed((f) => ({ ...f, light: true }))}
            className={`absolute inset-0 w-full h-full object-contain p-1 ${
              showDark ? 'dark:hidden' : ''
            }`}
          />
        )}
        {showDark && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.logoDarkUrl ?? undefined}
            alt={event.name}
            onError={() => setFailed((f) => ({ ...f, dark: true }))}
            className={`absolute inset-0 w-full h-full object-contain p-1 ${
              showLight ? 'hidden dark:block' : ''
            }`}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-[var(--ed-blue)] via-blue-700 to-slate-800'
      )}
    >
      <span className="text-sm font-bold text-white">
        {initials || event.gameName.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

export function EventsSection() {
  const [tab, setTab] = React.useState<EventTab>('active');
  const [events, setEvents] = React.useState<EventCardData[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/tournaments')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: { data?: RawTournamentRow[] }) => {
        if (cancelled) return;
        setEvents((json?.data ?? []).map(normalizeEvent));
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = events ? selectEvents(events, tab) : [];

  return (
    <section className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3.5 space-y-3">
        {/* Header: label + tab toggle on the right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--ed-magenta)]" />
            <h2 className="ed-label text-[var(--ed-ink)]">
              Tournament Circuit
            </h2>
          </div>

          <div className="flex items-center rounded-full bg-[var(--ed-sand)] p-1">
            <button
              onClick={() => setTab('active')}
              className={cn(
                'px-3.5 py-1 rounded-full text-xs font-bold transition-all',
                tab === 'active'
                  ? 'bg-[var(--ed-surface)] text-[var(--ed-blue)]'
                  : 'text-[var(--ed-stone)] hover:text-[var(--ed-ink)]'
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
                  ? 'bg-[var(--ed-surface)] text-[var(--ed-blue)]'
                  : 'text-[var(--ed-stone)] hover:text-[var(--ed-ink)]'
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
                className="min-w-[140px] sm:min-w-[156px] h-[144px] rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]/60 animate-pulse"
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
              const cardClasses =
                'group min-w-[140px] sm:min-w-[156px] rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-4 flex flex-col items-center text-center gap-2.5 cursor-pointer hover:border-[var(--ed-blue)] transition-colors';
              const inner = (
                <>
                  <EventLogo event={event} />

                  <h3 className="text-xs font-bold text-[var(--ed-ink)] leading-snug line-clamp-2 min-h-[2rem] group-hover:text-[var(--ed-blue)] transition-colors">
                    {event.name}
                  </h3>

                  <span className="mt-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ed-stone)] max-w-full">
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        event.status === 'ONGOING' &&
                          'bg-rose-500 animate-ping',
                        event.status === 'UPCOMING' && 'bg-[var(--ed-blue)]',
                        event.status === 'COMPLETED' && 'bg-slate-400'
                      )}
                    />
                    <span className="truncate">{event.stageName}</span>
                  </span>
                </>
              );

              return event.slug ? (
                <Link key={event.id} href={`/tournaments/${event.slug}`} className={cardClasses}>
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
