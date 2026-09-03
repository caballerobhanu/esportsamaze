'use client';

import * as React from 'react';
import { Plus, Trash2, Trophy, Link as LinkIcon, ArrowUpRight, Check } from 'lucide-react';

export interface SeedEventItem {
  name: string;
  tournamentId?: string;
  tournamentSlug?: string;
}

export interface QualificationSlot {
  place: string; // e.g. "1st Place (Champion)", "1st - 2nd", "Top 4"
  events: SeedEventItem[];
  description?: string; // e.g. "Direct invite to Grand Finals"
}

export interface TournamentSummaryOption {
  id: string;
  name: string;
  slug: string;
  tier?: string;
}

interface TournamentQualificationsInputProps {
  initialQualifications?: any[];
  allTournaments?: TournamentSummaryOption[];
}

export function TournamentQualificationsInput({
  initialQualifications = [],
  allTournaments = [],
}: TournamentQualificationsInputProps) {
  // Normalize initial data (convert string arrays to SeedEventItem objects if legacy)
  const [slots, setSlots] = React.useState<QualificationSlot[]>(() => {
    if (initialQualifications && Array.isArray(initialQualifications) && initialQualifications.length > 0) {
      return initialQualifications.map((slot: any) => ({
        place: slot.place || '1st Place',
        description: slot.description || '',
        events: Array.isArray(slot.events)
          ? slot.events.map((ev: any) => {
              if (typeof ev === 'string') {
                const match = allTournaments.find((t) => t.name.toLowerCase() === ev.toLowerCase());
                return {
                  name: ev,
                  tournamentId: match?.id,
                  tournamentSlug: match?.slug,
                };
              }
              return {
                name: ev.name || '',
                tournamentId: ev.tournamentId,
                tournamentSlug: ev.tournamentSlug,
              };
            })
          : [],
      }));
    }
    return [];
  });

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        place: prev.length === 0 ? '1st Place (Champion)' : prev.length === 1 ? '2nd - 4th Place' : `Top ${prev.length * 4}`,
        events: [],
        description: '',
      },
    ]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePlace = (index: number, place: string) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], place };
      return copy;
    });
  };

  const updateDescription = (index: number, description: string) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], description };
      return copy;
    });
  };

  const addEventToSlot = (slotIndex: number, eventItem: SeedEventItem) => {
    if (!eventItem.name.trim()) return;
    setSlots((prev) => {
      const copy = [...prev];
      const targetSlot = { ...copy[slotIndex] };
      // Check duplicate
      if (!targetSlot.events.some((e) => e.name.toLowerCase() === eventItem.name.toLowerCase())) {
        targetSlot.events = [...targetSlot.events, eventItem];
      }
      copy[slotIndex] = targetSlot;
      return copy;
    });
  };

  const removeEventFromSlot = (slotIndex: number, eventIndex: number) => {
    setSlots((prev) => {
      const copy = [...prev];
      const targetSlot = { ...copy[slotIndex] };
      targetSlot.events = targetSlot.events.filter((_, i) => i !== eventIndex);
      copy[slotIndex] = targetSlot;
      return copy;
    });
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="qualificationsJson" value={JSON.stringify(slots)} />

      {slots.length === 0 && (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center">
          <p className="text-xs text-slate-500 mb-2">
            No qualification seeds or next-event qualification slots added for this tournament.
          </p>
          <button
            type="button"
            onClick={addSlot}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> + Add Qualification / Seed Slot
          </button>
        </div>
      )}

      {slots.map((slot, idx) => (
        <SlotEditor
          key={idx}
          index={idx}
          slot={slot}
          allTournaments={allTournaments}
          onUpdatePlace={(p) => updatePlace(idx, p)}
          onUpdateDescription={(d) => updateDescription(idx, d)}
          onAddEvent={(ev) => addEventToSlot(idx, ev)}
          onRemoveEvent={(evIdx) => removeEventFromSlot(idx, evIdx)}
          onRemoveSlot={() => removeSlot(idx)}
        />
      ))}

      {slots.length > 0 && (
        <button
          type="button"
          onClick={addSlot}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-(--ed-blue) dark:text-blue-400 hover:bg-(--ed-blue)/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Another Qualification / Seed Tier
        </button>
      )}
    </div>
  );
}

function SlotEditor({
  index,
  slot,
  allTournaments,
  onUpdatePlace,
  onUpdateDescription,
  onAddEvent,
  onRemoveEvent,
  onRemoveSlot,
}: {
  index: number;
  slot: QualificationSlot;
  allTournaments: TournamentSummaryOption[];
  onUpdatePlace: (p: string) => void;
  onUpdateDescription: (d: string) => void;
  onAddEvent: (ev: SeedEventItem) => void;
  onRemoveEvent: (evIdx: number) => void;
  onRemoveSlot: () => void;
}) {
  const [customEventInput, setCustomEventInput] = React.useState('');

  const handleSelectTournament = (tourneyId: string) => {
    if (!tourneyId) return;
    const match = allTournaments.find((t) => t.id === tourneyId);
    if (match) {
      onAddEvent({
        name: match.name,
        tournamentId: match.id,
        tournamentSlug: match.slug,
      });
    }
  };

  const handleAddCustom = () => {
    if (!customEventInput.trim()) return;
    const parts = customEventInput.split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const match = allTournaments.find((t) => t.name.toLowerCase() === part.toLowerCase());
      onAddEvent({
        name: match ? match.name : part,
        tournamentId: match?.id,
        tournamentSlug: match?.slug,
      });
    }
    setCustomEventInput('');
  };

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[10px] flex items-center justify-center">
            #{index + 1}
          </span>
          <input
            type="text"
            value={slot.place}
            onChange={(e) => onUpdatePlace(e.target.value)}
            placeholder="e.g. 1st Place / Top 2 / 1st - 4th"
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-(--ed-blue) w-48 sm:w-60"
          />
        </div>

        <button
          type="button"
          onClick={onRemoveSlot}
          className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
          title="Remove tier"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Seeded / Qualified Events List with Badges */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Seeded Events (Select existing tournament to link directly, or type custom):
        </label>

        {slot.events.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {slot.events.map((ev, evIdx) => (
              <div
                key={evIdx}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  ev.tournamentSlug
                    ? 'bg-blue-500/10 border-blue-500/30 text-(--ed-blue) dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {ev.tournamentSlug ? (
                  <LinkIcon className="w-3 h-3 text-(--ed-blue) shrink-0" />
                ) : (
                  <Trophy className="w-3 h-3 text-slate-400 shrink-0" />
                )}
                <span>{ev.name}</span>
                {ev.tournamentSlug && (
                  <span className="text-[9px] font-mono opacity-60">(/tournaments/{ev.tournamentSlug})</span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveEvent(evIdx)}
                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors ml-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add event tools: Dropdown of existing DB tournaments + text input for custom/external events */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div>
            <select
              value=""
              onChange={(e) => handleSelectTournament(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
            >
              <option value="">+ Link to an existing DB tournament…</option>
              {allTournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.tier ? `(${t.tier})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={customEventInput}
              onChange={(e) => setCustomEventInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              placeholder="…or type custom event (e.g. PMGC 2026)"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Slot / Seeding Note (Optional)
        </label>
        <input
          type="text"
          value={slot.description || ''}
          onChange={(e) => onUpdateDescription(e.target.value)}
          placeholder="e.g. Direct Grand Finals Seed, Survival Stage Slot"
          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
        />
      </div>
    </div>
  );
}
