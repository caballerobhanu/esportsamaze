'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Code2,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Users,
  Shield,
  Plus,
  ArrowRight,
  Info,
} from 'lucide-react';
import type { SquadRow, SquadRosterEntry } from './tournament-squads-input';

interface TeamOption {
  id: string;
  name: string;
  tag?: string | null;
}

interface PlayerOption {
  id: string;
  ign: string;
  name?: string | null;
  currentTeam?: { id: string; name: string } | null;
}

interface BulkSquadImporterProps {
  allTeams: TeamOption[];
  allPlayers: PlayerOption[];
  onImport: (newSquads: SquadRow[], mode: 'replace' | 'append') => void;
  onClose: () => void;
}

const SAMPLE_TSV = `Team\tTag\tPlayers\tStaff\tSeed
Team SouL\tSOUL\tManya (IGL, C), Nakul (Assaulter), Rony (Assaulter), Joker (Sub), Spower (Loaned)\tAmano (Coach), Ayush (Analyst)\tDirect Invite
GodLike Esports\tGODL\tJonathan (Assaulter), Punk (IGL, C), Admino (Assaulter), Simp (Sub)\tGhatak (Coach)\tBGIS Champion
Team XSpark\tTX\tShadow (IGL, C), Sarang (Assaulter), Kylash (Assaulter), Spraygod (Assaulter)\tOsmium (Analyst)\tGrand Finals Seed`;

const SAMPLE_JSON = JSON.stringify(
  [
    {
      teamName: 'Team SouL',
      tag: 'SOUL',
      seedLabel: 'Direct Invite',
      roster: [
        { ign: 'Manya', role: 'IGL', captain: true, statusTag: 'MAIN' },
        { ign: 'Nakul', role: 'Assaulter', statusTag: 'MAIN' },
        { ign: 'Rony', role: 'Assaulter', statusTag: 'MAIN' },
        { ign: 'Joker', role: 'Assaulter', statusTag: 'SUB' },
        { ign: 'Spower', role: 'Assaulter', statusTag: 'LOANED' },
      ],
      staff: [
        { ign: 'Amano', role: 'Head Coach' },
        { ign: 'Ayush', role: 'Analyst' },
      ],
    },
    {
      teamName: 'GodLike Esports',
      tag: 'GODL',
      seedLabel: 'BGIS Champion',
      roster: [
        { ign: 'Jonathan', role: 'Assaulter', captain: false, statusTag: 'MAIN' },
        { ign: 'Punk', role: 'IGL', captain: true, statusTag: 'MAIN' },
        { ign: 'Admino', role: 'Assaulter', statusTag: 'MAIN' },
        { ign: 'Simp', role: 'Assaulter', statusTag: 'SUB' },
      ],
      staff: [
        { ign: 'Ghatak', role: 'Coach' },
      ],
    },
  ],
  null,
  2
);

export function TournamentSquadBulkImporter({
  allTeams,
  allPlayers,
  onImport,
  onClose,
}: BulkSquadImporterProps) {
  const [format, setFormat] = useState<'tsv' | 'json'>('tsv');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [rawText, setRawText] = useState('');
  const [copied, setCopied] = useState(false);
  const [parsedSquads, setParsedSquads] = useState<SquadRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Copy sample template to clipboard
  const handleCopySample = () => {
    const text = format === 'tsv' ? SAMPLE_TSV : SAMPLE_JSON;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to parse individual player token like "Manya (IGL, C)" or "Joker (Sub)"
  const parsePlayerToken = (token: string): SquadRosterEntry => {
    let clean = token.trim();
    let role = 'Assaulter'; // Default role is always Assaulter
    let captain = false;
    let statusTag: SquadRosterEntry['statusTag'] = 'MAIN';

    // Extract inside brackets: name (role, tag)
    const match = clean.match(/^(.*?)\((.*?)\)$/);
    if (match) {
      clean = match[1].trim();
      const tags = match[2].split(/[,/]+/).map((t) => t.trim().toLowerCase());

      for (const tag of tags) {
        if (tag === 'c' || tag === 'captain') {
          captain = true;
        } else if (tag === 'sub' || tag === 'substitute') {
          statusTag = 'SUB';
        } else if (tag === 'loan' || tag === 'loaned') {
          statusTag = 'LOANED';
        } else if (tag === 'bench' || tag === 'benched') {
          statusTag = 'BENCHED';
        } else if (tag === 'standin' || tag === 'stand-in') {
          statusTag = 'STANDIN';
        } else if (tag === 'igl') {
          role = 'IGL';
        } else if (tag === 'support') {
          role = 'Support';
        } else if (tag === 'sniper') {
          role = 'Sniper';
        } else if (tag === 'flex') {
          role = 'Flex';
        } else if (tag === 'assaulter') {
          role = 'Assaulter';
        }
      }
    }

    // Auto-match player in database
    const dbPlayer = allPlayers.find(
      (p) =>
        p.ign.toLowerCase() === clean.toLowerCase() ||
        (p.name && p.name.toLowerCase() === clean.toLowerCase())
    );

    return {
      playerId: dbPlayer?.id ?? null,
      ign: dbPlayer?.ign ?? clean,
      role,
      captain,
      statusTag,
      isStaff: false,
    };
  };

  // Helper to parse staff token like "Amano (Coach)" or "Ayush (Analyst)"
  const parseStaffToken = (token: string): SquadRosterEntry => {
    let clean = token.trim();
    let staffRole = 'Coach';

    const match = clean.match(/^(.*?)\((.*?)\)$/);
    if (match) {
      clean = match[1].trim();
      const roleStr = match[2].trim();
      if (roleStr) staffRole = roleStr;
    }

    const dbPlayer = allPlayers.find(
      (p) =>
        p.ign.toLowerCase() === clean.toLowerCase() ||
        (p.name && p.name.toLowerCase() === clean.toLowerCase())
    );

    return {
      playerId: dbPlayer?.id ?? null,
      ign: dbPlayer?.ign ?? clean,
      role: staffRole,
      staffRole,
      isStaff: true,
      captain: false,
      statusTag: null,
    };
  };

  // Parse Raw Text (TSV or JSON)
  const handleParse = () => {
    setErrorMsg(null);
    if (!rawText.trim()) {
      setParsedSquads([]);
      return;
    }

    try {
      if (format === 'json') {
        const json = JSON.parse(rawText);
        if (!Array.isArray(json)) {
          throw new Error('JSON input must be an array of squad objects.');
        }

        const squads: SquadRow[] = json.map((item: any, idx: number) => {
          const tName = String(item.teamName || item.team || item.name || `Team ${idx + 1}`).trim();
          const tag = item.tag ? String(item.tag).trim() : null;

          // Find team in database
          const dbTeam = allTeams.find(
            (t) =>
              t.name.toLowerCase() === tName.toLowerCase() ||
              (tag && t.tag && t.tag.toLowerCase() === tag.toLowerCase())
          );

          // Roster
          const roster: SquadRosterEntry[] = (Array.isArray(item.roster) ? item.roster : []).map(
            (p: any) => {
              const ign = String(p.ign || p.name || '').trim();
              const dbP = allPlayers.find((pl) => pl.ign.toLowerCase() === ign.toLowerCase());

              return {
                playerId: dbP?.id ?? p.playerId ?? null,
                ign: dbP?.ign ?? ign,
                role: p.role || 'Assaulter', // Default to Assaulter
                captain: !!p.captain,
                statusTag: p.statusTag || (p.sub ? 'SUB' : p.loaned ? 'LOANED' : 'MAIN'),
                isStaff: false,
              };
            }
          );

          // Staff
          const staff: SquadRosterEntry[] = (Array.isArray(item.staff) ? item.staff : []).map(
            (s: any) => {
              const ign = String(s.ign || s.name || '').trim();
              const dbP = allPlayers.find((pl) => pl.ign.toLowerCase() === ign.toLowerCase());
              return {
                playerId: dbP?.id ?? s.playerId ?? null,
                ign: dbP?.ign ?? ign,
                role: s.role || 'Coach',
                staffRole: s.role || 'Coach',
                isStaff: true,
                captain: false,
                statusTag: null,
              };
            }
          );

          return {
            teamId: dbTeam?.id ?? '',
            teamName: dbTeam?.name ?? tName,
            tag: dbTeam?.tag ?? tag,
            seed: item.seed ? Number(item.seed) : null,
            seedLabel: item.seedLabel || item.seed || 'Direct Invite',
            seedTournamentId: item.seedTournamentId ?? null,
            roster: [...roster, ...staff],
            eventLogoUrl: item.eventLogoUrl || null,
            eventLogoDarkUrl: item.eventLogoDarkUrl || null,
            shortName: item.shortName ?? tag,
            displayName: item.displayName ?? null,
            country: item.country ?? null,
          };
        });

        setParsedSquads(squads);
      } else {
        // TSV / CSV Parsing
        const lines = rawText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length === 0) {
          setParsedSquads([]);
          return;
        }

        // Check if first line is a header
        let startIndex = 0;
        const firstLineLower = lines[0].toLowerCase();
        if (
          firstLineLower.includes('team') &&
          (firstLineLower.includes('player') || firstLineLower.includes('roster') || firstLineLower.includes('tag'))
        ) {
          startIndex = 1;
        }

        const squads: SquadRow[] = [];

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          const parts = line.split('\t');

          // If not tab-separated, fallback to comma or semicolon split
          const cols = parts.length > 1 ? parts : line.split(';').length > 1 ? line.split(';') : line.split(',');

          const tName = cols[0]?.trim() || `Team ${i + 1}`;
          let tag: string | null = null;
          let playersCol = '';
          let staffCol = '';
          let seedCol = '';

          if (cols.length >= 4) {
            // Team \t Tag \t Players \t Staff \t Seed
            tag = cols[1]?.trim() || null;
            playersCol = cols[2]?.trim() || '';
            staffCol = cols[3]?.trim() || '';
            seedCol = cols[4]?.trim() || '';
          } else if (cols.length === 3) {
            // Team \t Players \t Seed/Staff
            playersCol = cols[1]?.trim() || '';
            seedCol = cols[2]?.trim() || '';
          } else if (cols.length === 2) {
            // Team \t Players
            playersCol = cols[1]?.trim() || '';
          } else {
            playersCol = '';
          }

          // Parse players
          const playerTokens = playersCol
            .split(/[,]+/)
            .map((t) => t.trim())
            .filter(Boolean);
          const roster: SquadRosterEntry[] = playerTokens.map(parsePlayerToken);

          // Parse staff
          const staffTokens = staffCol
            .split(/[,]+/)
            .map((t) => t.trim())
            .filter(Boolean);
          const staff: SquadRosterEntry[] = staffTokens.map(parseStaffToken);

          // Find team in database
          const dbTeam = allTeams.find(
            (t) =>
              t.name.toLowerCase() === tName.toLowerCase() ||
              (tag && t.tag && t.tag.toLowerCase() === tag.toLowerCase())
          );

          squads.push({
            teamId: dbTeam?.id ?? '',
            teamName: dbTeam?.name ?? tName,
            tag: dbTeam?.tag ?? tag,
            seed: null,
            seedLabel: seedCol || 'Direct Invite',
            seedTournamentId: null,
            roster: [...roster, ...staff],
            eventLogoUrl: null,
            eventLogoDarkUrl: null,
            shortName: tag,
            displayName: null,
            country: null,
          });
        }

        setParsedSquads(squads);
      }
    } catch (err: any) {
      console.error('Parse error:', err);
      setErrorMsg(err.message || 'Failed to parse squad data.');
      setParsedSquads([]);
    }
  };

  const handleApply = () => {
    if (parsedSquads.length === 0) return;
    onImport(parsedSquads, importMode);
    onClose();
  };

  const totalPlayersCount = parsedSquads.reduce(
    (acc, s) => acc + s.roster.filter((r) => !r.isStaff).length,
    0
  );
  const totalStaffCount = parsedSquads.reduce(
    (acc, s) => acc + s.roster.filter((r) => r.isStaff).length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0b101c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Bulk Tournament Squad &amp; Roster Importer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste 16, 24, 32, or 100+ squads with unlimited players, subs, loaned status, and staff.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Format & Mode Switches */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-slate-500">Format:</span>
              <button
                type="button"
                onClick={() => {
                  setFormat('tsv');
                  setRawText('');
                  setParsedSquads([]);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  format === 'tsv'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel / TSV Paste
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormat('json');
                  setRawText('');
                  setParsedSquads([]);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  format === 'json'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                JSON Payload
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-indigo-600"
                />
                Append to Existing
              </label>

              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-indigo-600"
                />
                Replace All Squads
              </label>

              <button
                type="button"
                onClick={handleCopySample}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Sample!' : 'Copy Sample Template'}</span>
              </button>
            </div>
          </div>

          {/* Quick Syntax Hint */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-blue-700 dark:text-blue-300 text-xs">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Pro Tip:</span> Players default to role{' '}
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Assaulter</span>.
              Use parenthesis for tags: e.g.{' '}
              <span className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Manya (IGL, C)
              </span>
              ,{' '}
              <span className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Joker (Sub)
              </span>
              ,{' '}
              <span className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Spower (Loaned)
              </span>
              . Staff roles can be added via Staff column e.g.{' '}
              <span className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Amano (Coach), Ayush (Analyst)
              </span>
              .
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Paste {format === 'tsv' ? 'Excel / TSV Data' : 'JSON Content'}:
              </label>
              {rawText && (
                <button
                  type="button"
                  onClick={() => {
                    setRawText('');
                    setParsedSquads([]);
                  }}
                  className="text-[11px] text-rose-500 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              onBlur={handleParse}
              placeholder={
                format === 'tsv'
                  ? `Team SouL\tSOUL\tManya (IGL, C), Nakul, Rony, Joker (Sub)\tAmano (Coach)\tDirect Invite`
                  : `[\n  {\n    "teamName": "Team SouL",\n    "roster": [...]\n  }\n]`
              }
              className="w-full text-xs font-mono p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParse}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Parse &amp; Preview
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedSquads.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Preview:</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px]">
                    {parsedSquads.length} Squads
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px]">
                    {totalPlayersCount} Players
                  </span>
                  {totalStaffCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[11px]">
                      {totalStaffCount} Staff
                    </span>
                  )}
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {parsedSquads.map((sq, i) => {
                  const dbMatch = allTeams.some((t) => t.id === sq.teamId);
                  const players = sq.roster.filter((r) => !r.isStaff);
                  const staff = sq.roster.filter((r) => r.isStaff);

                  return (
                    <div
                      key={i}
                      className="p-3 bg-white dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            #{i + 1} {sq.teamName}
                          </span>
                          {sq.tag && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-500">
                              [{sq.tag}]
                            </span>
                          )}
                          {dbMatch ? (
                            <span className="px-1.5 py-0.2 text-[10px] rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                              ✓ Linked in DB
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 text-[10px] rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                              Unlinked Team
                            </span>
                          )}
                          {sq.seedLabel && (
                            <span className="text-[10px] text-slate-400">
                              · {sq.seedLabel}
                            </span>
                          )}
                        </div>

                        {/* Players */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">
                            Roster:
                          </span>
                          {players.map((p, pIdx) => (
                            <span
                              key={pIdx}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                                p.statusTag === 'SUB'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : p.statusTag === 'LOANED'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {p.ign}
                              {p.captain && ' (C)'}
                              {p.statusTag && p.statusTag !== 'MAIN' && ` [${p.statusTag}]`}
                            </span>
                          ))}

                          {staff.length > 0 && (
                            <>
                              <span className="font-semibold text-indigo-500 ml-2">
                                Staff:
                              </span>
                              {staff.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                >
                                  {s.ign} ({s.role})
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
          <span className="text-xs text-slate-500">
            {parsedSquads.length > 0
              ? `Ready to import ${parsedSquads.length} squads (${importMode === 'replace' ? 'Replace All' : 'Append'})`
              : 'Paste data and click Parse & Preview above'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={parsedSquads.length === 0}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              Apply to Tournament
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
