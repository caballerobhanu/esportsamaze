'use client';

import * as React from 'react';
import { MobileDataCard, MobileToggle } from './mobile-data-card';
import type { PreviewCard } from './adapters';

/**
 * Per-map cards. Damage and survival are their own group, revealed on request —
 * they are the two the desktop table annotates with a sample count, and hiding
 * them keeps the box to five fields.
 */
export function MapCardsPanel({ cards }: { cards: PreviewCard[] }) {
  const [showTelemetry, setShowTelemetry] = React.useState(false);

  return (
    <>
      {cards.map((card) => (
        <MobileDataCard
          key={card.key}
          title={card.title}
          subtitle={card.subtitle}
          columns={3}
          metrics={card.metrics}
          telemetry={showTelemetry ? card.telemetry : undefined}
          footer={card.footer}
        />
      ))}
      <div className="flex justify-end pt-1">
        <MobileToggle
          label={showTelemetry ? 'Hide damage & survival' : 'Show damage & survival'}
          active={showTelemetry}
          onClick={() => setShowTelemetry((value) => !value)}
        />
      </div>
    </>
  );
}

/** Per-tournament cards, with the board's grand-finals cut wired up. */
export function TournamentCardsPanel({ all, gf }: { all: PreviewCard[]; gf: PreviewCard[] }) {
  const [gfOnly, setGfOnly] = React.useState(false);
  const cards = gfOnly ? gf : all;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <MobileToggle label="All events" active={!gfOnly} onClick={() => setGfOnly(false)} />
        <MobileToggle
          label="Grand finals only"
          active={gfOnly}
          onClick={() => setGfOnly(true)}
        />
      </div>

      {cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400 dark:border-white/10">
          No grand-final appearances recorded.
        </p>
      ) : (
        cards.map((card) => (
          <MobileDataCard
            key={card.key}
            title={card.title}
            subtitle={card.subtitle}
            columns={3}
            metrics={card.metrics}
            footer={card.footer}
          />
        ))
      )}
    </>
  );
}
