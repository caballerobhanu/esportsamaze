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
  stageName: string;
}

interface RawTournamentRow {
  id: string;
  slug: string;
  name: string;
  status: EventStatus;
  startDate: string;
  endDate: string;
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
    logoUrl: raw.game?.logoUrl ?? null,
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

  if (event.logoUrl) {
    return (
      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/60 dark:ring-white/10 shadow-sm shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.logoUrl}
          alt={event.name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-(--ed-blue) via-indigo-600 to-slate-900'
      )}
    >
      <span className="text-base font-black text-white drop-shadow">
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
          <h2 className="ed-label">
            Events
          </h2>

          <div className="flex items-center rounded-lg bg-[var(--ed-sand)]/60 border border-[var(--ed-hair)] p-0.5">
            <button
              onClick={() => setTab('active')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                tab === 'active'
                  ? 'bg-[var(--ed-surface)] text-[var(--ed-blue)] shadow-xs'
                  : 'text-[var(--ed-stone)] hover:text-[var(--ed-ink)]'
              )}
              aria-pressed={tab === 'active'}
            >
              Active
            </button>
            <button
              onClick={() => setTab('past')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                tab === 'past'
                  ? 'bg-[var(--ed-surface)] text-[var(--ed-blue)] shadow-xs'
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
                className="min-w-[150px] sm:min-w-[168px] h-[172px] ed-card animate-pulse bg-[var(--ed-sand)]/30"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--ed-stone)]">
            No {tab === 'active' ? 'active or upcoming' : 'past'} events right now.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto snap-x pb-1 [scrollbar-width:thin]">
            {visible.map((event) => {
              const cardClasses =
                'group min-w-[150px] sm:min-w-[168px] snap-start ed-card p-4 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-[var(--ed-blue)] transition-colors';
              const inner = (
                <>
                  <EventLogo event={event} />

                  <h3 className="text-xs font-semibold text-[var(--ed-ink)] leading-snug line-clamp-2 min-h-[2rem] group-hover:text-[var(--ed-blue)] transition-colors">
                    {event.name}
                  </h3>

                  <span className="mt-auto inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ed-stone)] max-w-full">
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        event.status === 'ONGOING' &&
                          'bg-rose-500 animate-pulse',
                        event.status === 'UPCOMING' && 'bg-[var(--ed-blue)]',
                        event.status === 'COMPLETED' && 'bg-[var(--ed-stone)]'
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
