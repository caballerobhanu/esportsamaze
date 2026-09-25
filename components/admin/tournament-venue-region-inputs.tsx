'use client';

import * as React from 'react';
import { Plus, Trash2, MapPin, Building, Globe, Check, ChevronDown, Sparkles } from 'lucide-react';
import { COUNTRIES, POPULAR_REGIONS } from '@/lib/countries';
import { venueLevel, type VenueLevel } from '@/lib/venues';

export interface VenueOption {
  id?: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

export interface VenueEntry {
  id?: string;
  stageName: string;
  name: string;
  city: string;
  country: string;
}

interface TournamentVenuesInputProps {
  initialVenues?: VenueEntry[];
  existingVenues?: VenueOption[];
}

export function TournamentVenuesInput({
  initialVenues = [],
  existingVenues = [],
}: TournamentVenuesInputProps) {
  const [venues, setVenues] = React.useState<VenueEntry[]>(() => {
    if (initialVenues.length > 0) return initialVenues;
    return [];
  });

  const addVenue = () => {
    setVenues((prev) => [
      ...prev,
      {
        stageName: '',
        name: '',
        city: '',
        country: 'India',
      },
    ]);
  };

  const removeVenue = (index: number) => {
    setVenues((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVenue = (index: number, field: keyof VenueEntry, value: string) => {
    setVenues((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Collect all unique cities from existing venues
  const existingCities = React.useMemo(() => {
    const set = new Set<string>();
    existingVenues.forEach((v) => {
      if (v.city && v.city.trim()) set.add(v.city.trim());
    });
    return Array.from(set);
  }, [existingVenues]);

  return (
    <div className="space-y-3">
      {/* Hidden JSON input to submit with the standard form */}
      <input type="hidden" name="venuesJson" value={JSON.stringify(venues)} />

      {venues.length === 0 && (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center">
          <p className="text-xs text-slate-500 mb-2">
            No venue added yet — a country on its own is enough. (Online events can omit a physical
            venue entirely)
          </p>
          <button
            type="button"
            onClick={addVenue}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Venue / Location
          </button>
        </div>
      )}

      {venues.map((venue, idx) => (
        <VenueRow
          key={idx}
          index={idx}
          venue={venue}
          existingVenues={existingVenues}
          existingCities={existingCities}
          onChange={(field, val) => updateVenue(idx, field, val)}
          onRemove={() => removeVenue(idx)}
        />
      ))}

      {venues.length > 0 && (
        <button
          type="button"
          onClick={addVenue}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-(--ed-blue) text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-(--ed-blue) transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> + Add Another Venue / Location
        </button>
      )}
    </div>
  );
}

function VenueRow({
  index,
  venue,
  existingVenues,
  existingCities,
  onChange,
  onRemove,
}: {
  index: number;
  venue: VenueEntry;
  existingVenues: VenueOption[];
  existingCities: string[];
  onChange: (field: keyof VenueEntry, val: string) => void;
  onRemove: () => void;
}) {
  const [venueSearch, setVenueSearch] = React.useState(venue.name);
  const [showVenueSuggs, setShowVenueSuggs] = React.useState(false);

  const [citySearch, setCitySearch] = React.useState(venue.city);
  const [showCitySuggs, setShowCitySuggs] = React.useState(false);

  // How much is known about the place: a country, a city, or a named stadium.
  // Read back from the fields, so an edit reopens at the level it was entered at.
  const [detail, setDetail] = React.useState<VenueLevel>(() => {
    const level = venueLevel(venue);
    return level === 'NONE' ? 'VENUE' : level;
  });

  React.useEffect(() => {
    setVenueSearch(venue.name);
  }, [venue.name]);

  React.useEffect(() => {
    setCitySearch(venue.city);
  }, [venue.city]);

  /**
   * Switching level clears whatever sits above it, so an entry can never keep a
   * stadium it no longer names. Downgrading also drops the venue id, so the save
   * keys on the coarser place instead of rewriting a named venue that other
   * events may share.
   */
  const changeDetail = (next: VenueLevel) => {
    setDetail(next);
    if (next !== 'VENUE') {
      setVenueSearch('');
      onChange('name', '');
      onChange('id', '');
    }
    if (next === 'COUNTRY') {
      setCitySearch('');
      onChange('city', '');
    }
  };

  // Filter stadium suggestions (max 5)
  const venueSuggs = React.useMemo(() => {
    if (!venueSearch.trim()) return existingVenues.slice(0, 5);
    const q = venueSearch.toLowerCase();
    return existingVenues
      .filter((v) => v.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [venueSearch, existingVenues]);

  // Filter city suggestions (max 5)
  const citySuggs = React.useMemo(() => {
    if (!citySearch.trim()) return existingCities.slice(0, 5);
    const q = citySearch.toLowerCase();
    return existingCities
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, 5);
  }, [citySearch, existingCities]);

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 relative group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <Building className="w-3 h-3" /> Venue #{index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors"
          title="Remove Venue Entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* How much is known about where this event is: a country, a city, or a
          named stadium. Only the fields that level needs are offered. */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Known to</span>
        {(
          [
            ['COUNTRY', 'Country'],
            ['CITY', 'City + Country'],
            ['VENUE', 'Stadium / Venue'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => changeDetail(value)}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
              detail === value
                ? 'bg-(--ed-blue) text-white'
                : 'bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${
          detail === 'VENUE' ? 'lg:grid-cols-4' : detail === 'CITY' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        }`}
      >
        {/* 1. Stage / Identifier Label */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Stage Identifier (Optional)
          </label>
          <input
            type="text"
            value={venue.stageName}
            onChange={(e) => onChange('stageName', e.target.value)}
            placeholder="Optional (e.g. Grand Finals / Playoffs)"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
          />
        </div>

        {/* 2. Stadium / Venue Name (Typeahead with max 4-5 suggestions) */}
        {detail === 'VENUE' && (
          <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Stadium / Venue Name
          </label>
          <input
            type="text"
            value={venueSearch}
            onChange={(e) => {
              setVenueSearch(e.target.value);
              onChange('name', e.target.value);
              setShowVenueSuggs(true);
            }}
            onFocus={() => setShowVenueSuggs(true)}
            onBlur={() => setTimeout(() => setShowVenueSuggs(false), 200)}
            placeholder="e.g. Yashobhoomi Convention Centre"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
          />

          {showVenueSuggs && venueSuggs.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              <div className="p-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 px-2">
                Existing Venues (Select or type new)
              </div>
              {venueSuggs.map((v, i) => (
                <button
                  key={v.id || i}
                  type="button"
                  onMouseDown={() => {
                    setVenueSearch(v.name);
                    onChange('name', v.name);
                    if (v.city) {
                      setCitySearch(v.city);
                      onChange('city', v.city);
                    }
                    if (v.country) {
                      onChange('country', v.country);
                    }
                    setShowVenueSuggs(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 flex items-center justify-between"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">{v.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {v.city ? `${v.city}, ` : ''}{v.country || ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {/* 3. City of Venue (Typeahead with max 4-5 suggestions) */}
        {detail !== 'COUNTRY' && (
          <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            City of Venue
          </label>
          <input
            type="text"
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              onChange('city', e.target.value);
              setShowCitySuggs(true);
            }}
            onFocus={() => setShowCitySuggs(true)}
            onBlur={() => setTimeout(() => setShowCitySuggs(false), 200)}
            placeholder="e.g. New Delhi / Hyderabad"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
          />

          {showCitySuggs && citySuggs.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              {citySuggs.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => {
                    setCitySearch(c);
                    onChange('city', c);
                    setShowCitySuggs(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {/* 4. Dropdown of all countries */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Country of Venue
          </label>
          <select
            value={venue.country || 'India'}
            onChange={(e) => onChange('country', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Region Typeahead Input (Select or add new with suggestions)
// -------------------------------------------------------------

interface TournamentRegionInputProps {
  initialValue?: string | null;
  existingRegions?: string[];
}

export function TournamentRegionInput({
  initialValue = '',
  existingRegions = [],
}: TournamentRegionInputProps) {
  const [value, setValue] = React.useState(initialValue || '');
  const [showSuggs, setShowSuggs] = React.useState(false);

  // Combine DB regions with popular esports regions
  const allRegions = React.useMemo(() => {
    const set = new Set<string>();
    existingRegions.forEach((r) => {
      if (r && r.trim()) set.add(r.trim());
    });
    POPULAR_REGIONS.forEach((r) => set.add(r));
    return Array.from(set);
  }, [existingRegions]);

  const suggestions = React.useMemo(() => {
    if (!value.trim()) return allRegions.slice(0, 5);
    const q = value.toLowerCase();
    return allRegions.filter((r) => r.toLowerCase().includes(q)).slice(0, 5);
  }, [value, allRegions]);

  return (
    <div className="relative">
      <input type="hidden" name="region" value={value} />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setShowSuggs(true);
        }}
        onFocus={() => setShowSuggs(true)}
        onBlur={() => setTimeout(() => setShowSuggs(false), 200)}
        placeholder="e.g. India / APAC / Global"
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
      />

      {showSuggs && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          <div className="p-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 px-2">
            Suggested Regions (Select or type new)
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => {
                setValue(s);
                setShowSuggs(false);
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 flex items-center justify-between"
            >
              <span>{s}</span>
              {value.toLowerCase() === s.toLowerCase() && (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Participating Countries Tag Input (Full World Countries)
// -------------------------------------------------------------

interface TournamentCountriesInputProps {
  initialCountries?: string[];
}

export function TournamentCountriesInput({
  initialCountries = ['India'],
}: TournamentCountriesInputProps) {
  const [selected, setSelected] = React.useState<string[]>(initialCountries);
  const [query, setQuery] = React.useState('');
  const [showSuggs, setShowSuggs] = React.useState(false);

  const addCountry = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
    }
    setQuery('');
  };

  const removeCountry = (name: string) => {
    setSelected((prev) => prev.filter((c) => c !== name));
  };

  const suggestions = React.useMemo(() => {
    if (!query.trim()) return COUNTRIES.slice(0, 8);
    const q = query.toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <div className="space-y-2">
      {/* Hidden input submitting as comma-separated string */}
      <input type="hidden" name="countries" value={selected.join(', ')} />

      {/* Selected Tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {selected.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-(--ed-blue)/10 dark:bg-(--ed-blue)/20 text-(--ed-blue) dark:text-blue-400 text-xs font-bold"
          >
            <Globe className="w-3 h-3" />
            {c}
            <button
              type="button"
              onClick={() => removeCountry(c)}
              className="text-slate-400 hover:text-rose-500 text-sm leading-none ml-0.5"
            >
              ×
            </button>
          </span>
        ))}

        {/* Input box for search / add */}
        <div className="relative flex-1 min-w-[140px]">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggs(true);
            }}
            onFocus={() => setShowSuggs(true)}
            onBlur={() => setTimeout(() => setShowSuggs(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (query.trim()) addCountry(query);
              }
            }}
            placeholder={selected.length === 0 ? 'Search or type country…' : '+ Add country…'}
            className="w-full bg-transparent text-xs py-1 px-1 focus:outline-none placeholder:text-slate-400"
          />

          {showSuggs && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto w-64">
              <div className="p-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 px-2">
                Select Country from World List
              </div>
              {suggestions.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onMouseDown={() => {
                    addCountry(c.name);
                    setShowSuggs(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 flex items-center justify-between"
                >
                  <span>{c.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{c.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

