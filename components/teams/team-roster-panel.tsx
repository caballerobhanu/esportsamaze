'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TournamentName } from '@/components/ui/tournament-name';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  ClipboardList,
  Eye,
  EyeOff,
  Swords,
  UserMinus,
  Users,
} from 'lucide-react';

import { TeamCrest } from './team-crest';
import { formatAverage, formatRate, type PlayerElimMetrics } from '@/lib/team-stats';
import { parseRoster } from '@/lib/team-roster';
import type { TeamContext, TeamContextTransfer, TransferDirection } from '@/lib/team-data';
import { playerHref } from '@/lib/entity-links';
import { gameHref, gameSlugOf } from '@/lib/games';

/**
 * Movement types that still earn a badge. JOINED/LEFT merely restate the
 * Arrived/Departed pill beside them; only LOANED and BENCHED carry anything the
 * direction cannot express, so those are the only ones shown.
 */
const TYPED_MOVEMENTS = new Set(['LOANED', 'BENCHED']);

const transferTypeClass = (type: string) =>
  type === 'LOANED'
    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400';

/**
 * Direction as read from THIS team. `BOTH` (a row whose origin and destination
 * are the same team) is a data-entry artefact; the player is on the roster, so
 * it reads as an arrival and its counterpart renders as "not recorded".
 */
const directionMeta: Record<
  TransferDirection,
  { label: string; preposition: string; className: string; icon: typeof ArrowDownLeft }
> = {
  ARRIVED: {
    label: 'Arrived',
    preposition: 'from',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: ArrowDownLeft,
  },
  DEPARTED: {
    label: 'Departed',
    preposition: 'to',
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    icon: ArrowUpRight,
  },
  BOTH: {
    label: 'Arrived',
    preposition: 'from',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: ArrowDownLeft,
  },
};

/**
 * One row of the transfer timeline.
 *
 * Every `Transfer` row is rendered as itself — no per-player collapse, because
 * a player who joined, left and returned has three real movements, and picking
 * one of them hides two. The direction is computed against this team, so the
 * row's own `type` (which describes the move to the DESTINATION) is never read
 * backwards.
 */
function TransferTimelineRow({ transfer, gameSlug }: { transfer: TeamContextTransfer; gameSlug: string }) {
  const meta = directionMeta[transfer.direction];
  const DirectionIcon = meta.icon;
  const counterpart = transfer.counterpart;
  const counterpartSlug = counterpart?.slug || counterpart?.id;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-black/40">
          {transfer.player.avatarUrl ? (
            <Image
              src={transfer.player.avatarUrl}
              alt={transfer.player.ign}
              fill
              className="object-cover"
            />
          ) : (
            <span className="text-sm font-black text-slate-400">
              {transfer.player.ign.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <Link
            href={playerHref({ slug: transfer.player.slug, ign: transfer.player.ign })}
            className="block truncate text-sm font-extrabold transition-colors hover:text-[#0A5FC4]"
          >
            {transfer.player.ign}
          </Link>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
            {transfer.staffRole || transfer.player.role || 'Player'}
          </p>
        </div>
      </div>

      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${meta.className}`}
      >
        <DirectionIcon className="h-3 w-3" />
        {meta.label}
      </span>

      {TYPED_MOVEMENTS.has(transfer.type) && (
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${transferTypeClass(transfer.type)}`}
        >
          {transfer.type}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {meta.preposition}
        </span>
        {counterpart && counterpartSlug ? (
          <Link
            href={gameHref(gameSlug, `teams/${counterpartSlug}`)}
            className="group flex items-center gap-2"
            title={counterpart.tag ? `${counterpart.name} [${counterpart.tag}]` : counterpart.name}
          >
            <TeamCrest
              name={counterpart.name}
              lightSrc={counterpart.logoUrl}
              darkSrc={counterpart.imageDarkUrl}
              className="h-7 w-7"
            />
            <span className="max-w-[170px] truncate text-xs font-extrabold transition-colors group-hover:text-[#0A5FC4]">
              {counterpart.name}
            </span>
            {counterpart.tag && (
              <span className="hidden text-[10px] font-extrabold uppercase tracking-wider text-slate-400 sm:block">
                {counterpart.tag}
              </span>
            )}
          </Link>
        ) : (
          <span className="text-xs font-bold text-slate-400">No counterpart recorded</span>
        )}
      </div>

      <span className="ml-auto shrink-0 text-xs font-bold text-slate-400">
        {new Date(transfer.dateMs).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    </li>
  );
}

/**
 * Roster tab: active roster with an optional current-season stats grid, support
 * staff and organisation people, per-event line-ups (captain badge + staff
 * role), and the transfer timeline.
 */
export function TeamRosterPanel({
  team,
  metrics,
  playerIdToSlug,
}: {
  team: TeamContext;
  metrics: Record<string, PlayerElimMetrics>;
  playerIdToSlug: Record<string, string>;
}) {
  const [showStats, setShowStats] = React.useState(false);

  const playingRoster = team.players.filter((player) => player.isPlayer);
  const staffRoster = team.players.filter((player) => player.staffRole && player.isPlayer);
  // Organisation people: non-playing members (coaches, managers, owners, staff).
  const orgPeople = team.players.filter((player) => !player.isPlayer);

  const eventLineups = [...team.tournaments]
    .sort((a, b) => (b.startedAtMs ?? 0) - (a.startedAtMs ?? 0))
    .map((event) => ({ event, entries: parseRoster(event.rosterJson) }))
    .filter(({ entries }) => entries.length > 0);

  return (
    <div className="space-y-8">
      {/* Active roster */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Line-up
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Active roster</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Current-stats toggle */}
            <button
              onClick={() => setShowStats((value) => !value)}
              aria-pressed={showStats}
              title={showStats ? 'Hide current-season stats' : 'Show current-season stats'}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 cursor-pointer"
            >
              {showStats ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showStats ? 'Hide stats' : 'Show stats'}
            </button>
            <Users className="h-6 w-6 text-slate-300 dark:text-slate-700" />
          </div>
        </div>

        {playingRoster.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {playingRoster.map((player) => {
              const m = metrics[player.id];
              return (
                <Link
                  key={player.id}
                  href={playerHref({ slug: player.slug, ign: player.ign })}
                  className="group rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-[#0A5FC4] hover:shadow-md dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-black/40">
                      {player.avatarUrl ? (
                        <Image src={player.avatarUrl} alt={player.ign} fill className="object-cover" />
                      ) : (
                        <span className="font-black text-slate-400">
                          {player.ign.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-lg font-black uppercase tracking-tight transition-colors group-hover:text-[#0A5FC4]">
                        {player.ign}
                      </h4>
                      <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
                        {player.role || 'Player'}
                        {player.staffRole ? ` · ${player.staffRole}` : ''}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0A5FC4]" />
                  </div>

                  {showStats &&
                    (m ? (
                      <>
                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
                          {[
                            { label: 'Matches', value: m.matchesPlayed.toLocaleString('en-IN') },
                            { label: 'Elims', value: m.totalElims.toLocaleString('en-IN') },
                            { label: 'Avg elims', value: formatAverage(m.avgElims, m.matchesPlayed, 2) },
                            { label: 'Max / game', value: m.maxElims.toLocaleString('en-IN') },
                            { label: '≥5 elim games', value: m.gamesWithFivePlus.toLocaleString('en-IN') },
                            { label: '0-elim %', value: formatRate(m.zeroElimShare, m.matchesPlayed) },
                          ].map((cell) => (
                            <div key={cell.label} className="rounded-lg bg-white p-2 dark:bg-white/5">
                              <p className="text-sm font-black">{cell.value}</p>
                              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                                {cell.label}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2.5 text-[10px] font-bold text-slate-400">
                          from {m.matchesPlayed} scorecard{m.matchesPlayed === 1 ? '' : 's'} for {team.name}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-xs font-semibold text-slate-400">
                        No scorecards for {team.name} yet.
                      </p>
                    ))}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-white/10">
            No active roster found for this team.
          </div>
        )}

        {/* Staff and organisation people */}
        {(staffRoster.length > 0 || orgPeople.length > 0) && (
          <div className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 dark:border-white/10">
            {staffRoster.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-slate-400">
                  Support staff
                </p>
                <div className="space-y-2">
                  {staffRoster.map((member) => (
                    <Link
                      key={member.id}
                      href={playerHref({ slug: member.slug, ign: member.ign })}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                    >
                      <Briefcase className="h-4 w-4 shrink-0 text-[#0A5FC4] dark:text-blue-300" />
                      <span className="truncate text-sm font-extrabold transition-colors group-hover:text-[#0A5FC4]">
                        {member.ign}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {member.staffRole || member.role || 'Staff'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {orgPeople.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-slate-400">
                  Organisation
                </p>
                <div className="space-y-2">
                  {orgPeople.map((member) => (
                    <Link
                      key={member.id}
                      href={playerHref({ slug: member.slug, ign: member.ign })}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-[#0A5FC4] dark:text-blue-300" />
                      <span className="truncate text-sm font-extrabold transition-colors group-hover:text-[#0A5FC4]">
                        {member.ign}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {member.staffRole || member.role || 'Staff'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Event line-ups */}
      {eventLineups.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Event by event
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Event line-ups</h2>
            </div>
            <Swords className="h-6 w-6 text-slate-300 dark:text-slate-700" />
          </div>
          <p className="mb-6 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Rosters are tracked per event, so a player&rsquo;s line-up here reflects only the
            events they played for {team.name}. A{' '}
            <ClipboardList className="inline h-3 w-3 -translate-y-px text-amber-600 dark:text-amber-400" />{' '}
            mark means the appearance comes from reported totals for that event — there are no match
            scorecards behind it.
          </p>
          <div className="space-y-5">
            {eventLineups.map(({ event, entries }) => (
              <div
                key={event.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Link
                    href={gameHref(gameSlugOf(team), `tournaments/${event.slug}`)}
                    className="truncate text-sm font-extrabold transition-colors hover:text-[#0A5FC4]"
                  >
                    <TournamentName name={event.name} shortName={event.shortName} />
                  </Link>
                  <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {event.startedAtMs ? new Date(event.startedAtMs).getUTCFullYear() : 'TBD'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entries.map((entry, i) => {
                    // Resolved by player id only — a name-only entry stays
                    // unlinked rather than pointing at a look-alike profile.
                    const playerSlug =
                      (entry.playerId && playerIdToSlug[entry.playerId]) || entry.slug || null;
                    const playerHref = playerSlug
                      ? gameHref(gameSlugOf(team), `players/${playerSlug}`)
                      : entry.playerId
                        ? gameHref(gameSlugOf(team), `players/${entry.playerId}`)
                        : null;
                    const chip = (
                      <>
                        <span className="font-extrabold">{entry.ign}</span>
                        {entry.captain && (
                          <span className="rounded bg-amber-400/20 px-1 py-px text-[9px] font-black uppercase text-amber-600 dark:text-amber-300">
                            C
                          </span>
                        )}
                        {entry.staffRole && (
                          <span className="rounded bg-indigo-500/10 px-1 py-px text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-300">
                            {entry.staffRole}
                          </span>
                        )}
                        {entry.reported && (
                          <span
                            title="From reported totals — this event has no match scorecards"
                            className="flex items-center"
                          >
                            <ClipboardList className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          </span>
                        )}
                      </>
                    );
                    return playerHref ? (
                      <Link
                        key={`${entry.ign}-${i}`}
                        href={playerHref}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                      >
                        {chip}
                      </Link>
                    ) : (
                      <span
                        key={`${entry.ign}-${i}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-white/10 dark:bg-white/5"
                      >
                        {chip}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transfers — only when the team actually has rows (14 of 222 teams do) */}
      {team.transfers.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Transfer history
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Transfer timeline</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {team.transfers.length} recorded movement{team.transfers.length === 1 ? '' : 's'} in
                and out of {team.name}, newest first. A player who left and returned appears once per
                movement.
              </p>
            </div>
            <UserMinus className="h-6 w-6 shrink-0 text-slate-300 dark:text-slate-700" />
          </div>
          <ul className="space-y-2">
            {team.transfers.map((transfer) => (
              <TransferTimelineRow key={transfer.id} transfer={transfer} gameSlug={gameSlugOf(team)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}