/**
 * The event's partners, grouped by the tier the admin gave each one.
 *
 * This is the surface the `Sponsor` model was entered for — the data has been written and
 * loaded since the model existed, with nothing rendering it.
 *
 * Renders nothing at all when the event has no sponsors, so an unsponsored event does not get
 * an empty "Partners" heading.
 */

import { SponsorMark } from '@/components/tournaments/sponsor-mark';

export interface TournamentSponsorEntry {
  tier?: string | null;
  sponsor: {
    id: string;
    name: string;
    logoUrl?: string | null;
    website?: string | null;
  };
}

const TIER_LABELS: Record<string, string> = {
  TITLE: 'Title Sponsor',
  POWERED_BY: 'Powered By',
  ASSOCIATE: 'Associate Sponsors',
};

/** Title first, then powered-by, then everything else — the order a sponsor expects. */
const TIER_ORDER: Record<string, number> = { TITLE: 0, POWERED_BY: 1, ASSOCIATE: 2 };

function tierRank(tier?: string | null): number {
  return tier ? TIER_ORDER[tier] ?? 3 : 3;
}

export function TournamentSponsors({ sponsors }: { sponsors: readonly TournamentSponsorEntry[] }) {
  if (sponsors.length === 0) return null;

  // Grouped by label, and the iteration order is the tier order, so the Map's insertion order
  // is already the display order.
  const groups = new Map<string, TournamentSponsorEntry[]>();
  for (const entry of [...sponsors].sort((a, b) => tierRank(a.tier) - tierRank(b.tier))) {
    const label = TIER_LABELS[entry.tier ?? ''] ?? entry.tier ?? 'Sponsors';
    groups.set(label, [...(groups.get(label) ?? []), entry]);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
      <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Partners &amp; Sponsors
      </h3>

      <div className="mt-3.5 space-y-3.5">
        {[...groups.entries()].map(([label, entries]) => (
          <div key={label}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-2.5">
              {entries.map((entry) => {
                const mark = <SponsorMark name={entry.sponsor.name} logoUrl={entry.sponsor.logoUrl} />;

                // A sponsor link is a commercial one, so it is nofollowed the way search
                // engines ask paid placements to be.
                return entry.sponsor.website ? (
                  <a
                    key={entry.sponsor.id}
                    href={entry.sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    title={entry.sponsor.name}
                    className="opacity-90 transition-opacity hover:opacity-100"
                  >
                    {mark}
                  </a>
                ) : (
                  <span key={entry.sponsor.id} title={entry.sponsor.name}>
                    {mark}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
