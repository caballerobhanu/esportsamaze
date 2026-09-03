'use client';

import * as React from 'react';
import { Building2, Trash2 } from 'lucide-react';

export const POPULAR_ORGANIZER_ROLES = [
  'Primary Organizer',
  'Lead Organizer',
  'Co-Organizer',
  'Official Broadcaster',
  'Host / Executive Producer',
  'Production Partner',
  'Tournament Operator',
  'Streaming Partner',
  'Sanctioning Body / Publisher',
  'Community Partner',
];

export interface OrganizerOption {
  id: string;
  name: string;
  type?: string | null;
  logoUrl?: string | null;
}

export interface SelectedOrganizer {
  id?: string;
  name: string;
  role: string;
}

interface TournamentOrganizersInputProps {
  initialOrganizers?: SelectedOrganizer[];
  existingOrganizers?: OrganizerOption[];
}

export function TournamentOrganizersInput({
  initialOrganizers = [],
  existingOrganizers = [],
}: TournamentOrganizersInputProps) {
  const [organizers, setOrganizers] = React.useState<SelectedOrganizer[]>(() => {
    if (initialOrganizers.length > 0) return initialOrganizers;
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

    setOrganizers((prev) => {
      const copy = [...prev];
      for (const part of parts) {
        // Check if already in selected list
        const exists = copy.some(
          (o) => o.name.toLowerCase() === part.toLowerCase()
        );
        if (!exists) {
          // Check if matches an existing DB organizer
          const dbMatch = existingOrganizers.find(
            (eo) => eo.name.toLowerCase() === part.toLowerCase()
          );

          copy.push({
            id: dbMatch?.id,
            name: dbMatch ? dbMatch.name : part,
            role: copy.length === 0 ? 'Primary Organizer' : (dbMatch?.type || 'Co-Organizer'),
          });
        }
      }
      return copy;
    });

    setQuery('');
  };

  const selectExisting = (org: OrganizerOption) => {
    setOrganizers((prev) => {
      if (prev.some((o) => o.id === org.id || o.name.toLowerCase() === org.name.toLowerCase())) {
        return prev;
      }
      return [
        ...prev,
        {
          id: org.id,
          name: org.name,
          role: prev.length === 0 ? 'Primary Organizer' : (org.type || 'Co-Organizer'),
        },
      ];
    });
    setQuery('');
    setShowSuggs(false);
  };

  const updateRole = (index: number, newRole: string) => {
    setOrganizers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], role: newRole };
      return copy;
    });
  };

  const removeOrganizer = (index: number) => {
    setOrganizers((prev) => prev.filter((_, i) => i !== index));
  };

  // Filter max 4-5 suggestions
  const suggestions = React.useMemo(() => {
    if (!query.trim()) return existingOrganizers.slice(0, 5);
    const q = query.toLowerCase();
    return existingOrganizers
      .filter((o) => o.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query, existingOrganizers]);

  return (
    <div className="space-y-3">
      {/* Hidden input to pass data with the form submission */}
      <input type="hidden" name="organizersJson" value={JSON.stringify(organizers)} />

      {/* Selected Organizers list with customizable role labels */}
      {organizers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {organizers.map((org, idx) => (
            <OrganizerCard
              key={idx}
              organizer={org}
              onRoleChange={(role) => updateRole(idx, role)}
              onRemove={() => removeOrganizer(idx)}
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
          placeholder="Type organizer name (e.g. Krafton, Nodwin Gaming, ESL) — comma separated to add multiple…"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
        />

        {showSuggs && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            <div className="p-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 px-2">
              Existing Organizers (Select or type new)
            </div>
            {suggestions.map((o) => (
              <button
                key={o.id}
                type="button"
                onMouseDown={() => selectExisting(o)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-(--ed-blue)" />
                  <span className="font-bold">{o.name}</span>
                </div>
                {o.type && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {o.type}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400">
        💡 You can label each organizer individually (e.g. <em>Primary Organizer, Official Broadcaster, Co-Organizer, Host</em>) or type any custom role.
      </p>
    </div>
  );
}

function OrganizerCard({
  organizer,
  onRoleChange,
  onRemove,
}: {
  organizer: SelectedOrganizer;
  onRoleChange: (role: string) => void;
  onRemove: () => void;
}) {
  const isPrimary =
    organizer.role.toLowerCase().includes('primary') ||
    organizer.role.toLowerCase().includes('lead');

  return (
    <div
      className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 transition-all shadow-sm ${
        isPrimary
          ? 'bg-(--ed-blue)/8 border-(--ed-blue)/30 dark:bg-(--ed-blue)/10'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className={`w-3.5 h-3.5 shrink-0 ${isPrimary ? 'text-(--ed-blue)' : 'text-slate-500'}`} />
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
            {organizer.name}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors shrink-0"
          title="Remove Organizer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Customizable Label / Role with Presets & Free-Text */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={organizer.role}
          onChange={(e) => onRoleChange(e.target.value)}
          placeholder="e.g. Primary Organizer"
          className={`w-full px-2 py-1 rounded-md text-[11px] font-bold border focus:outline-none focus:ring-1 focus:ring-(--ed-blue) ${
            isPrimary
              ? 'bg-(--ed-blue)/10 border-(--ed-blue)/30 text-(--ed-blue) dark:text-blue-300'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        />

        {/* Quick presets dropdown */}
        <div className="relative group">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onRoleChange(e.target.value);
            }}
            className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] cursor-pointer opacity-70 hover:opacity-100 focus:outline-none"
            title="Choose from popular role presets"
          >
            <option value="" disabled>
              ▾
            </option>
            {POPULAR_ORGANIZER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
