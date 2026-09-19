'use client';

import * as React from 'react';
import { formatAverage, formatDuration, formatRate, scorecardLabel } from '@/lib/team-stats';
import type { TeamMapRow } from '@/lib/team-data';
import { MobileChipToggle, MobileDataCard } from '@/components/ui/mobile-card';

/**
 * Per-map record as cards, for narrow screens.
 *
 * Five fields by default, in the desktop table's column order. Damage and
 * survival are the two the desktop table annotates with a sample count and the
 * two worth hiding on a phone, so they sit behind their own toggle and render as
 * their own row of two equal columns.
 */
export function TeamMapCards({ rows }: { rows: TeamMapRow[] }) {
  const [showTelemetry, setShowTelemetry] = React.useState(false);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <MobileDataCard
          key={row.mapName}
          title={row.mapName}
          columns={3}
          metrics={[
            { label: 'Matches', value: row.matches },
            { label: 'Wins', value: row.wins },
            { label: 'Top-5 %', value: formatRate(row.topFiveRate, row.matches) },
            { label: 'Avg place pts', value: formatAverage(row.avgPlacePoints, row.matches, 1) },
            {
              label: 'Avg points',
              value: formatAverage(row.matches > 0 ? row.points / row.matches : null, row.matches, 1),
            },
          ]}
          telemetry={
            showTelemetry
              ? [
                  {
                    label: 'Avg damage',
                    value: `${formatAverage(row.avgDamage, row.damageSamples, 0)}${
                      row.damageSamples > 0 ? ` · ${scorecardLabel(row.damageSamples)}` : ''
                    }`,
                  },
                  {
                    label: 'Avg survival',
                    value: `${formatDuration(row.avgSurvival, row.survivalSamples)}${
                      row.survivalSamples > 0 ? ` · ${scorecardLabel(row.survivalSamples)}` : ''
                    }`,
                  },
                ]
              : undefined
          }
        />
      ))}

      <div className="flex justify-end pt-1">
        <MobileChipToggle
          label={showTelemetry ? 'Hide damage & survival' : 'Show damage & survival'}
          active={showTelemetry}
          onClick={() => setShowTelemetry((value) => !value)}
        />
      </div>
    </div>
  );
}
