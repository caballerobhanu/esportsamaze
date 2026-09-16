import { Crown } from 'lucide-react';

/**
 * KRAFTON rank, side by side — the same solid brand plate the profile pages
 * carry, so the ranking reads as the headline figure rather than one row among
 * twenty. The lower rank wins.
 */
export function KraftonRankBand({
  rankA,
  rankB,
  labelA,
  labelB,
}: {
  rankA: number | null;
  rankB: number | null;
  /** Used for the screen-reader label only — the visible names live in the masthead. */
  labelA: string;
  labelB: string;
}) {
  if (rankA === null && rankB === null) return null;

  const aLeads = rankA !== null && (rankB === null || rankA < rankB);
  const bLeads = rankB !== null && (rankA === null || rankB < rankA);

  // No names here: the pair sits directly under the masthead, in the same order,
  // so repeating them would just restate what is already on screen.
  const side = (label: string, rank: number | null, leads: boolean, align: 'left' | 'right') => (
    <div aria-label={`${label} KRAFTON rank`} className={align === 'right' ? 'text-right' : undefined}>
      <p className={`text-3xl font-black leading-none tracking-tight sm:text-4xl ${leads ? 'text-amber-300' : 'text-white'}`}>
        {rank === null ? '—' : `#${rank}`}
        {leads && <span className="ml-1.5 align-super text-sm text-amber-300">★</span>}
      </p>
    </div>
  );

  return (
    <div className="bg-[#0A5FC4] px-6 py-4 text-white dark:bg-[#0A5FC4]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">
          KRAFTON Ranking
        </span>
        <Crown className="h-4 w-4 text-amber-300" />
      </div>
      <div className="grid grid-cols-2 items-end gap-4">
        {side(labelA, rankA, aLeads, 'left')}
        {side(labelB, rankB, bLeads, 'right')}
      </div>
    </div>
  );
}
