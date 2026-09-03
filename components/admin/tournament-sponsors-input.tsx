'use client';

import * as React from 'react';
import { Tag, Trash2, ChevronDown, Check } from 'lucide-react';

export const POPULAR_SPONSOR_TIERS = [
  'Title Sponsor',
  'Powered By',
  'Driven By',
  'Associate Sponsor',
  'Device Partner',
  'Beverage Partner',
  'Official Partner',
  'Ticketing Partner',
  'Broadcast Partner',
  'Payment Partner',
  'Snack Partner',
  'Audio Partner',
  'Co-Sponsor',
];

export interface SponsorOption {
  id: string;
  name: string;
  category?: string | null;
  logoUrl?: string | null;
}

export interface SelectedSponsor {
  id?: string;
  name: string;
  tier: string;
}

interface TournamentSponsorsInputProps {
  initialSponsors?: SelectedSponsor[];
  existingSponsors?: SponsorOption[];
}

export function TournamentSponsorsInput({
  initialSponsors = [],
  existingSponsors = [],
}: TournamentSponsorsInputProps) {
  const [sponsors, setSponsors] = React.useState<SelectedSponsor[]>(() => {
    if (initialSponsors.length > 0) return initialSponsors;
    return [];
  });
  const [query, setQuery] = React.useState('');
  const [showSuggs, setShowSuggs] = React.useState(false);

  // Add one or multiple comma-separated names
  const handleAddNames = (input: string) => {
    const parts = input
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return;

    setSponsors((prev) => {
      const copy = [...prev];
      for (const part of parts) {
        // Check if already in selected list
        const exists = copy.some(
          (s) => s.name.toLowerCase() === part.toLowerCase()
        );
        if (!exists) {
          // Check if matches an existing DB sponsor
          const dbMatch = existingSponsors.find(
            (es) => es.name.toLowerCase() === part.toLowerCase()
          );

          copy.push({
            id: dbMatch?.id,
            name: dbMatch ? dbMatch.name : part,
            tier: copy.length === 0 ? 'Title Sponsor' : (dbMatch?.category || 'Associate Sponsor'),
          });
        }
      }
      return copy;
    });

    setQuery('');
  };

  const selectExisting = (sponsor: SponsorOption) => {
    setSponsors((prev) => {
      if (prev.some((s) => s.id === sponsor.id || s.name.toLowerCase() === sponsor.name.toLowerCase())) {
        return prev;
      }
      return [
        ...prev,
        {
          id: sponsor.id,
          name: sponsor.name,
          tier: prev.length === 0 ? 'Title Sponsor' : (sponsor.category || 'Associate Sponsor'),
        },
      ];
    });
    setQuery('');
    setShowSuggs(false);
  };

  const updateTier = (index: number, newTier: string) => {
    setSponsors((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], tier: newTier };
      return copy;
    });
  };

  const removeSponsor = (index: number) => {
    setSponsors((prev) => prev.filter((_, i) => i !== index));
  };

  // Filter max 4-5 suggestions
  const suggestions = React.useMemo(() => {
    if (!query.trim()) return existingSponsors.slice(0, 5);
    const q = query.toLowerCase();
    return existingSponsors
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query, existingSponsors]);

  return (
    <div className="space-y-3">
      {/* Hidden input to pass data with the form submission */}
      <input type="hidden" name="sponsorsJson" value={JSON.stringify(sponsors)} />

      {/* Selected Sponsors list with customizable tier labels */}
      {sponsors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {sponsors.map((sp, idx) => (
            <SponsorCard
              key={idx}
              sponsor={sp}
              onTierChange={(tier) => updateTier(idx, tier)}
              onRemove={() => removeSponsor(idx)}
            />
          ))}
        </div>
      )}

      {/* Input box with Typeahead */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            if (val.includes(',')) {
              handleAddNames(val);
            } else {
              setQuery(val);
              setShowSuggs(true);
            }
          }}
          onFocus={() => setShowSuggs(true)}
          onBlur={() => setTimeout(() => setShowSuggs(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (query.trim()) handleAddNames(query);
            }
          }}
          placeholder="Type sponsor name (e.g. iQOO, Monster Energy, AMD) — comma separated to add multiple…"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
        />

        {showSuggs && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            <div className="p-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 px-2">
              Existing Sponsors (Select or type new)
            </div>
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => selectExisting(s)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-bold">{s.name}</span>
                </div>
                {s.category && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {s.category}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400">
        💡 You can label each sponsor individually (e.g. <em>Title Sponsor, Powered By, Device Partner, Beverage Partner</em>) or type any custom label.
      </p>
    </div>
  );
}

function SponsorCard({
  sponsor,
  onTierChange,
  onRemove,
}: {
  sponsor: SelectedSponsor;
  onTierChange: (tier: string) => void;
  onRemove: () => void;
}) {
  const isTitle =
    sponsor.tier.toLowerCase().includes('title') ||
    sponsor.tier.toLowerCase().includes('powered');

  return (
    <div
      className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 transition-all shadow-sm ${
        isTitle
          ? 'bg-amber-500/8 border-amber-500/30 dark:bg-amber-500/10'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Tag className={`w-3.5 h-3.5 shrink-0 ${isTitle ? 'text-amber-500' : 'text-(--ed-blue)'}`} />
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
            {sponsor.name}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors shrink-0"
          title="Remove Sponsor"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Customizable Label / Tier with Presets & Free-Text */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={sponsor.tier}
          onChange={(e) => onTierChange(e.target.value)}
          placeholder="e.g. Title Sponsor"
          className={`w-full px-2 py-1 rounded-md text-[11px] font-bold border focus:outline-none focus:ring-1 focus:ring-(--ed-blue) ${
            isTitle
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-300'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        />

        {/* Quick presets dropdown */}
        <div className="relative group">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onTierChange(e.target.value);
            }}
            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] cursor-pointer opacity-70 hover:opacity-100 focus:outline-none"
            title="Choose from popular label presets"
          >
            <option value="" disabled>
              ▾
            </option>
            {POPULAR_SPONSOR_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
