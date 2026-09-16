import prisma from '@/lib/prisma';
import {
  ReportedTotalsManager,
  type ReportedTotalsRowView,
} from '@/components/admin/reported-totals-manager';
import {
  PLAYER_TOTAL_COLUMNS,
  TEAM_TOTAL_COLUMNS,
  type TotalsMetricColumn,
} from '@/lib/tournament-totals-import';
import { deleteReportedTotals, saveReportedTotals } from './actions';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

/**
 * Reported totals live here rather than inside the tournament edit form, which is
 * already long. Per-event data, so the page is driven by an event picker.
 *
 * These are the match-free day / stage / event totals entered when an event has
 * no scorecards. They never touch match data, and levels roll upward — so a
 * parent level is refused while its children exist.
 */
export default async function AdminReportedTotalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tournament?: string;
    totals?: string;
    rows?: string;
    skipped?: string;
    headers?: string;
    missing?: string;
    msg?: string;
    scope?: string;
  }>;
}) {
  const { tournament: selectedId, totals, rows, skipped, headers, missing, msg, scope } = await searchParams;

  const tournaments = await prisma.tournament.findMany({
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      name: true,
      startDate: true,
      series: true,
      _count: { select: { teamTotals: true, playerTotals: true } },
    },
  });

  const selected = selectedId
    ? await prisma.tournament.findUnique({
        where: { id: selectedId },
        select: {
          id: true,
          name: true,
          stages: { orderBy: { sequence: 'asc' }, select: { id: true, name: true } },
        },
      })
    : null;

  const [teamTotals, playerTotals] = selected
    ? await Promise.all([
        prisma.tournamentTeamTotals.findMany({
          where: { tournamentId: selected.id },
          include: { team: { select: { name: true } }, stage: { select: { name: true } } },
          orderBy: { label: 'asc' },
        }),
        prisma.tournamentPlayerTotals.findMany({
          where: { tournamentId: selected.id },
          include: { player: { select: { ign: true } }, stage: { select: { name: true } } },
          orderBy: { label: 'asc' },
        }),
      ])
    : [[], []];

  const summariseTotals = (row: Record<string, unknown>, columns: readonly TotalsMetricColumn[]) => {
    const parts = columns
      .map((column) => {
        const value = row[column.key];
        if (typeof value !== 'number') return null;
        return `${column.label.replace(/\s*\(.*\)$/, '').toLowerCase()} ${value.toLocaleString('en-IN')}`;
      })
      .filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join(' · ') : 'no metrics recorded';
  };

  const teamRows: ReportedTotalsRowView[] = teamTotals.map((row) => ({
    id: row.id,
    scope: row.scope,
    label: row.label,
    stageName: row.stage?.name ?? null,
    entityName: row.team.name,
    summary: summariseTotals(row as unknown as Record<string, unknown>, TEAM_TOTAL_COLUMNS),
  }));

  const playerRows: ReportedTotalsRowView[] = playerTotals.map((row) => ({
    id: row.id,
    scope: row.scope,
    label: row.label,
    stageName: row.stage?.name ?? null,
    entityName: row.player.ign,
    summary: summariseTotals(row as unknown as Record<string, unknown>, PLAYER_TOTAL_COLUMNS),
  }));

  const notice: { tone: 'ok' | 'error'; text: string } | null = (() => {
    if (!totals) return null;
    if (totals === 'ok') {
      const parts = [`Saved ${rows ?? '0'} reported row(s).`];
      if (skipped) parts.push(`${skipped} skipped (no name).`);
      if (headers) parts.push(`Ignored unrecognised columns: ${headers}.`);
      if (missing) parts.push(`Could not match these names to a record: ${missing}.`);
      return { tone: missing ? 'error' : 'ok', text: parts.join(' ') };
    }
    if (totals === 'conflict') {
      return {
        tone: 'error',
        text: `A ${(scope ?? 'parent').toLowerCase()} level already has child rows on this event, so it cannot be entered as well — levels roll upward and both at once would double-count. Delete the child rows first, or enter at that level.`,
      };
    }
    if (totals === 'need-stage') return { tone: 'error', text: 'Pick a stage for a stage-level paste.' };
    if (totals === 'need-label') {
      return { tone: 'error', text: 'Give a day paste a label (e.g. "Day 3") so each day is its own slice.' };
    }
    if (totals === 'empty') return { tone: 'error', text: 'Paste a header row and at least one data row.' };
    if (totals === 'parse') {
      return { tone: 'error', text: `Could not read the paste: ${msg ?? 'unknown problem'}.` };
    }
    if (totals === 'deleted') return { tone: 'ok', text: 'Reported totals deleted.' };
    return null;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black uppercase tracking-tight">Reported Totals</h1>
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Day / stage / whole-event totals for events that have no match-by-match scorecards. They are
          stored separately from match data and never mixed with it. Levels roll upward, so entering days
          produces the stage and event totals automatically — which is why a parent level is refused while
          its children exist. Blank cells are stored as “not reported”, never as zero. Entry is by pasting
          a table; for match-by-match scorecards use the Score Matrix instead.
        </p>
      </div>

      <form action="/admin/totals" method="get" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b101c]">
        <label className={labelCls}>Event</label>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <select name="tournament" defaultValue={selectedId ?? ''} className={inputCls}>
              <option value="">— Select an event —</option>
              {tournaments.map((event) => {
                const count = event._count.teamTotals + event._count.playerTotals;
                return (
                  <option key={event.id} value={event.id}>
                    {event.startDate.toISOString().slice(0, 10)} · {event.name}
                    {count > 0 ? ` (${count} reported)` : ''}
                  </option>
                );
              })}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110"
          >
            Load event
          </button>
        </div>
      </form>

      {selected ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b101c]">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            {selected.name}
          </p>
          <ReportedTotalsManager
            tournamentId={selected.id}
            stageOptions={selected.stages.map((stage) => ({ id: stage.id, name: stage.name }))}
            teamRows={teamRows}
            playerRows={playerRows}
            notice={notice}
            saveAction={saveReportedTotals}
            deleteAction={deleteReportedTotals}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-slate-800">
          Select an event to enter or review its reported totals.
        </div>
      )}
    </div>
  );
}
