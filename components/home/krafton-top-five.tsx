import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { fetchBoardEntries, fetchTeamTransfers } from '@/lib/krafton-data';
import { computeBoard } from '@/lib/krafton-standings';

/** Compact KRAFTON rankings block for the homepage — top 5 of each board. */
export async function KraftonTopFive() {
  const [teamEntries, playerEntries, transfers] = await Promise.all([
    fetchBoardEntries('TEAM').catch(() => []),
    fetchBoardEntries('PLAYER').catch(() => []),
    fetchTeamTransfers().catch(() => []),
  ]);

  const topTeams = computeBoard(teamEntries, transfers)
    .slice(0, 5)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  const topPlayers = computeBoard(playerEntries)
    .slice(0, 5)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const column = (
    title: string,
    rows: Array<{ rank: number; entityName: string; totalPoints: number; key: string; board: string }>,
    detailBase: string
  ) => (
    <div className="ed-card p-5">
      <div className="flex items-center justify-between">
        <p className="ed-label">{title}</p>
        <Link href="/rankings" className="text-[10px] font-bold text-[var(--ed-blue)] hover:underline">
          Full rankings →
        </Link>
      </div>
      <ol className="mt-3 space-y-1">
        {rows.map((r) => (
          <li key={r.key}>
            <Link
              href={`${detailBase}/${encodeURIComponent(r.key)}`}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--ed-sand)]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="num w-4 text-center text-xs font-bold text-[var(--ed-stone)]">{r.rank}</span>
                <span className="truncate font-semibold text-[var(--ed-ink)]">{r.entityName}</span>
              </span>
              <span className="num shrink-0 text-xs font-bold text-[var(--ed-stone)]">
                {Math.round(r.totalPoints).toLocaleString('en-IN')}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <section id="krafton-rankings" className="space-y-4">
      <SectionHeading tag="KRAFTON Rankings" title="Official Points Race" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {column('Top Teams', topTeams, '/rankings/team')}
        {column('Top Players', topPlayers, '/rankings/player')}
      </div>
    </section>
  );
}

function SectionHeading({ tag, title }: { tag: string; title: string }) {
  return (
    <div>
      <p className="ed-label">{tag}</p>
      <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-[var(--ed-ink)]">{title}</h2>
    </div>
  );
}
