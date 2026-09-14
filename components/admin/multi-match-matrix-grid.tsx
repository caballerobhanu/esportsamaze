'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Swords,
  Save,
  FileSpreadsheet,
  Search,
  Check,
  AlertCircle,
  Shield,
  Plus,
  ExternalLink,
  Copy,
  Sparkles,
  ClipboardPaste,
  Layers,
  Flame,
} from 'lucide-react';
import {
  getPlacementPoints,
  computeTotalPoints,
  parseWwcd,
  readKillMultiplier,
} from '@/lib/tournament-math';
import { saveMultiMatchMatrixAction, type MatchMatrixSavePayload } from '@/app/admin/(panel)/matches/matrix/actions';

export interface MatrixTournamentOption {
  id: string;
  name: string;
  slug: string;
  game: { name: string; slug: string };
  formatDetails?: any;
  stages: { id: string; name: string; sequence: number }[];
  teams: {
    teamId: string;
    team: {
      id: string;
      name: string;
      displayName?: string | null;
      tag?: string | null;
      logoUrl?: string | null;
      imageDarkUrl?: string | null;
    };
  }[];
  matches: {
    id: string;
    matchNumber?: number | null;
    overallMatchNumber?: number | null;
    format: string;
    stageType?: string | null;
    groupName?: string | null;
    mapName?: string | null;
    status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'POSTPONED';
    scheduledAt: string;
    stage?: { id: string; name: string } | null;
    games: {
      id: string;
      sequence: number;
      mapName?: string | null;
      teamResults: {
        id: string;
        teamId: string;
        rank: number;
        wwcd: boolean;
        placePoints: number;
        elimsPoints: number;
        bonusPoints: number;
        totalPoints: number;
        // Detail (telemetry) columns are nullable: NULL means "never recorded",
        // which is not the same as a genuine 0. The grid renders both as blank.
        damage: number | null;
        survivalTime: number | null;
        healing: number | null;
        damageReceived: number | null;
        headshots: number | null;
        assists: number | null;
        knockouts: number | null;
        longestElim: number | null;
        vehicleElims: number | null;
        grenadeElims: number | null;
        smokesUsed: number | null;
        grenadesUsed: number | null;
        molotovsUsed: number | null;
        flashUsed: number | null;
        airdrops: number | null;
        rescues: number | null;
        distDrove: number | null;
        distWalk: number | null;
      }[];
    }[];
  }[];
}

interface MultiMatchMatrixGridProps {
  tournaments: MatrixTournamentOption[];
  initialTournamentId?: string;
  initialStageName?: string;
}

interface CellData {
  rank: number | '';
  elims: number | '';
  damage: number | '';
  bonusPoints: number | '';
  smokesUsed: number | '';
  grenadesUsed: number | '';
  molotovsUsed: number | '';
  rescues: number | '';
  wwcd?: boolean;
  isModified?: boolean;
}

// Map of [matchId_teamId] -> CellData
type MatrixState = Record<string, CellData>;

interface ParsedPreviewRow {
  rawLine: string;
  matchedTeamId: string | null;
  matchedTeamName: string;
  matchedTeamTag: string;
  rank: number;
  wwcd?: boolean;
  elims: number;
  damage: number;
  isValid: boolean;
}

export function MultiMatchMatrixGrid({
  tournaments,
  initialTournamentId,
  initialStageName,
}: MultiMatchMatrixGridProps) {
  const router = useRouter();

  // Selected Tournament & Filter State
  const [selectedTourneyId, setSelectedTourneyId] = React.useState<string>(
    initialTournamentId || tournaments[0]?.id || ''
  );
  const selectedTourney = tournaments.find((t) => t.id === selectedTourneyId) || tournaments[0];

  const [selectedStage, setSelectedStage] = React.useState<string>(initialStageName || 'ALL');
  const [selectedGroup, setSelectedGroup] = React.useState<string>('ALL');
  const [teamSearch, setTeamSearch] = React.useState('');

  // UI state
  const [isSaving, setIsSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  
  // Paste Dialog State
  const [isPasteModalOpen, setIsPasteModalOpen] = React.useState(false);
  const [pasteTargetMatchId, setPasteTargetMatchId] = React.useState<string>('');
  const [pasteText, setPasteText] = React.useState('');
  const [copiedTemplate, setCopiedTemplate] = React.useState(false);

  // Cell Detail Dialog State
  const [activeCellDetail, setActiveCellDetail] = React.useState<{
    matchId: string;
    teamId: string;
    teamName: string;
    matchLabel: string;
  } | null>(null);

  // Tournament Point rules
  const pointsMatrix = React.useMemo(() => {
    if (selectedTourney?.formatDetails && typeof selectedTourney.formatDetails === 'object') {
      const fd = selectedTourney.formatDetails;
      return fd.pointsMatrix || fd.placementPoints || undefined;
    }
    return undefined;
  }, [selectedTourney]);

  const killMultiplier = React.useMemo(
    () => readKillMultiplier(selectedTourney?.formatDetails),
    [selectedTourney]
  );

  // Extract participating teams
  const participatingTeams = React.useMemo(() => {
    if (!selectedTourney) return [];
    return selectedTourney.teams.map((tt) => tt.team);
  }, [selectedTourney]);

  // Extract available stages & groups
  const availableStages = React.useMemo(() => {
    if (!selectedTourney) return [];
    const stageNames = new Set<string>();
    selectedTourney.stages.forEach((s) => stageNames.add(s.name));
    selectedTourney.matches.forEach((m) => {
      if (m.stage?.name) stageNames.add(m.stage.name);
    });
    return Array.from(stageNames);
  }, [selectedTourney]);

  const availableGroups = React.useMemo(() => {
    if (!selectedTourney) return [];
    const groups = new Set<string>();
    selectedTourney.matches.forEach((m) => {
      if (m.groupName) groups.add(m.groupName);
    });
    return Array.from(groups);
  }, [selectedTourney]);

  // Filter matches based on stage and group
  const filteredMatches = React.useMemo(() => {
    if (!selectedTourney) return [];
    return selectedTourney.matches
      .filter((m) => {
        if (selectedStage !== 'ALL') {
          const mStage = m.stage?.name || (m.format.includes('·') ? m.format.split('·')[1]?.trim() : '');
          if (!mStage.toLowerCase().includes(selectedStage.toLowerCase())) return false;
        }
        if (selectedGroup !== 'ALL' && m.groupName !== selectedGroup) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.matchNumber != null && b.matchNumber != null) {
          return a.matchNumber - b.matchNumber;
        }
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      });
  }, [selectedTourney, selectedStage, selectedGroup]);

  // Filtered teams list based on search
  const visibleTeams = React.useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return participatingTeams;
    return participatingTeams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.tag && t.tag.toLowerCase().includes(q)) ||
        (t.displayName && t.displayName.toLowerCase().includes(q))
    );
  }, [participatingTeams, teamSearch]);

  // Set default paste target match if none set
  React.useEffect(() => {
    if (filteredMatches.length > 0 && !pasteTargetMatchId) {
      setPasteTargetMatchId(filteredMatches[0].id);
    }
  }, [filteredMatches, pasteTargetMatchId]);

  // Matrix State initialization from DB results
  const [matrixState, setMatrixState] = React.useState<MatrixState>({});

  // Reset or load initial matrix state when tournament or matches change
  React.useEffect(() => {
    if (!selectedTourney) return;

    const initial: MatrixState = {};
    for (const m of selectedTourney.matches) {
      const activeGame = m.games[0];
      if (activeGame?.teamResults) {
        for (const tr of activeGame.teamResults) {
          const key = `${m.id}_${tr.teamId}`;
          initial[key] = {
            rank: tr.rank,
            wwcd: tr.wwcd,
            elims: tr.elimsPoints != null ? Math.round(tr.elimsPoints / killMultiplier) : 0,
            damage: tr.damage || 0,
            bonusPoints: tr.bonusPoints || 0,
            smokesUsed: tr.smokesUsed || 0,
            grenadesUsed: tr.grenadesUsed || 0,
            molotovsUsed: tr.molotovsUsed || 0,
            rescues: tr.rescues || 0,
            isModified: false,
          };
        }
      }
    }
    setMatrixState(initial);
    setStatusMessage(null);
  }, [selectedTourneyId, killMultiplier]);

  // Handle cell value change
  const handleCellChange = React.useCallback(
    (matchId: string, teamId: string, field: keyof CellData, value: number | '' | boolean) => {
      const key = `${matchId}_${teamId}`;
      setMatrixState((prev) => {
        const existing = prev[key] || {
          rank: '',
          elims: '',
          damage: '',
          bonusPoints: '',
          smokesUsed: '',
          grenadesUsed: '',
          molotovsUsed: '',
          rescues: '',
        };
        return {
          ...prev,
          [key]: {
            ...existing,
            [field]: value,
            // A rank edit always re-derives WWCD — otherwise a DB-loaded WWCD
            // team demoted to another rank keeps wwcd: true forever.
            ...(field === 'rank' && typeof value === 'number' ? { wwcd: value === 1 } : {}),
            isModified: true,
          },
        };
      });
    },
    []
  );

  // Compute live points for a team in a match
  const getComputedMatchPoints = React.useCallback(
    (matchId: string, teamId: string) => {
      const key = `${matchId}_${teamId}`;
      const cell = matrixState[key];
      if (!cell || cell.rank === '') return null;

      const rank = Number(cell.rank);
      const elims = Number(cell.elims || 0);
      const bonus = Number(cell.bonusPoints || 0);
      const placePoints = getPlacementPoints(rank, pointsMatrix);
      const elimsPoints = elims * killMultiplier;
      const totalPoints = computeTotalPoints({ placePoints, elimsPoints, bonusPoints: bonus });

      return {
        rank,
        isWwcd: rank === 1,
        placePoints,
        elimsPoints,
        bonusPoints: bonus,
        totalPoints,
      };
    },
    [matrixState, pointsMatrix, killMultiplier]
  );

  // Compute live aggregate leaderboard across all displayed matches
  const teamAggregates = React.useMemo(() => {
    const map = new Map<
      string,
      {
        matchesPlayed: number;
        wwcds: number;
        placePoints: number;
        elimsPoints: number;
        bonusPoints: number;
        totalPoints: number;
        totalDamage: number;
      }
    >();

    for (const t of participatingTeams) {
      map.set(t.id, {
        matchesPlayed: 0,
        wwcds: 0,
        placePoints: 0,
        elimsPoints: 0,
        bonusPoints: 0,
        totalPoints: 0,
        totalDamage: 0,
      });
    }

    for (const m of filteredMatches) {
      for (const t of participatingTeams) {
        const key = `${m.id}_${t.id}`;
        const cell = matrixState[key];
        if (cell && cell.rank !== '') {
          const stats = map.get(t.id)!;
          const rank = Number(cell.rank);
          const elims = Number(cell.elims || 0);
          const bonus = Number(cell.bonusPoints || 0);
          const damage = Number(cell.damage || 0);
          const pp = getPlacementPoints(rank, pointsMatrix);
          const ep = elims * killMultiplier;
          const tot = pp + ep + bonus;

          stats.matchesPlayed += 1;
          const isWwcd = cell.wwcd !== undefined ? Boolean(cell.wwcd) : rank === 1;
          if (isWwcd) stats.wwcds += 1;
          stats.placePoints += pp;
          stats.elimsPoints += ep;
          stats.bonusPoints += bonus;
          stats.totalPoints += tot;
          stats.totalDamage += damage;
        }
      }
    }

    return map;
  }, [participatingTeams, filteredMatches, matrixState, pointsMatrix, killMultiplier]);

  // Has unsaved modifications
  const hasUnsavedChanges = React.useMemo(() => {
    return Object.values(matrixState).some((c) => c.isModified);
  }, [matrixState]);

  // -------------------------------------------------------------
  // Robust Fuzzy Team Matcher
  // -------------------------------------------------------------
  const findMatchingTeam = React.useCallback(
    (nameOrTag: string) => {
      if (!nameOrTag) return null;
      const clean = nameOrTag.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/[\-_]/g, ' ');
      
      // 1. Exact match
      const exact = participatingTeams.find((pt) => {
        const n = pt.name.toLowerCase();
        const tag = (pt.tag || '').toLowerCase();
        return n === clean || tag === clean;
      });
      if (exact) return exact;

      // 2. Contains match with word-boundary for tags
      const words = clean.split(/[\s\-_\/]+/).filter(Boolean);
      const partial = participatingTeams.find((pt) => {
        const n = pt.name.toLowerCase();
        const tag = (pt.tag || '').toLowerCase();
        const tagMatch = Boolean(tag && tag.length >= 2 && words.includes(tag));
        return n.includes(clean) || clean.includes(n) || tagMatch;
      });
      if (partial) return partial;

      return null;
    },
    [participatingTeams]
  );

  // -------------------------------------------------------------
  // Live Parse Text into Preview Rows
  // -------------------------------------------------------------
  const parsedPreviewRows: ParsedPreviewRow[] = React.useMemo(() => {
    if (!pasteText.trim()) return [];

    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : /\s{2,}/;
    const firstTokens = lines[0].split(delimiter).map((t) => t.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    
    const hasHeader = firstTokens.some(
      (t) => t.includes('rank') || t.includes('team') || t.includes('kill') || t.includes('elim') || t === '#' || t === 'pos'
    );

    let colRank = -1;
    let colTeam = -1;
    let colElims = -1;
    let colDamage = -1;
    let colWwcd = -1;

    if (hasHeader) {
      firstTokens.forEach((t, idx) => {
        if (t.includes('rank') || t === '#' || t === 'pos' || t === 'placement') colRank = idx;
        else if (t.includes('team') || t.includes('name') || t.includes('tag') || t.includes('clan')) colTeam = idx;
        else if (t.includes('elim') || t.includes('kill') || t === 'kp' || t === 'finishes' || t === 'pts') colElims = idx;
        else if (t.includes('dmg') || t.includes('damage')) colDamage = idx;
        else if (t.includes('wwcd') || t.includes('chicken') || t === 'win' || t === 'won' || t.includes('team_wwcd')) colWwcd = idx;
      });
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines.map((line, idx) => {
      const tokens = line.split(delimiter).map((t) => t.trim().replace(/^["']|["']$/g, ''));

      let rank = idx + 1;
      let teamRaw = '';
      let elims = 0;
      let damage = 0;
      let isWwcd: boolean | undefined = undefined;

      if (hasHeader && colTeam !== -1) {
        teamRaw = tokens[colTeam] || '';
        if (colRank !== -1 && !isNaN(Number(tokens[colRank])) && tokens[colRank] !== '') rank = Number(tokens[colRank]);
        if (colElims !== -1 && !isNaN(Number(tokens[colElims])) && tokens[colElims] !== '') elims = Number(tokens[colElims]);
        if (colDamage !== -1 && !isNaN(Number(tokens[colDamage])) && tokens[colDamage] !== '') damage = Number(tokens[colDamage]);
        if (colWwcd !== -1 && tokens[colWwcd] !== undefined && tokens[colWwcd] !== '') {
          isWwcd = parseWwcd(tokens[colWwcd], rank);
        }
      } else {
        // Positional fallback analysis:
        // Case 1A: [Rank, Team, WWCD, Elims, Damage] or [Rank, Team, WWCD, Elims]
        if (
          tokens.length >= 4 &&
          !isNaN(Number(tokens[0])) &&
          isNaN(Number(tokens[1])) &&
          (tokens[2] === '0' ||
            tokens[2] === '1' ||
            ['true', 'false', 'yes', 'no', 'wwcd', 'won'].includes(tokens[2].toLowerCase()))
        ) {
          rank = Number(tokens[0]);
          teamRaw = tokens[1];
          isWwcd = parseWwcd(tokens[2], rank);
          elims = Number(tokens[3]) || 0;
          damage = tokens[4] ? Number(tokens[4]) || 0 : 0;
        }
        // Case 1B: [Rank, Team, Elims, Damage] or [Rank, Team, Elims]
        else if (tokens.length >= 3 && !isNaN(Number(tokens[0])) && isNaN(Number(tokens[1]))) {
          rank = Number(tokens[0]);
          teamRaw = tokens[1];
          elims = Number(tokens[2]) || 0;
          damage = tokens[3] ? Number(tokens[3]) || 0 : 0;
        }
        // Case 2: [Team, Elims] or [Team, Elims, Damage]
        else if (tokens.length >= 2 && isNaN(Number(tokens[0]))) {
          teamRaw = tokens[0];
          elims = Number(tokens[1]) || 0;
          damage = tokens[2] ? Number(tokens[2]) || 0 : 0;
        }
        // Case 3: [Rank, Elims] pure numbers (maps to team in visible order)
        else if (tokens.length >= 2 && !isNaN(Number(tokens[0])) && !isNaN(Number(tokens[1]))) {
          rank = Number(tokens[0]);
          elims = Number(tokens[1]) || 0;
          const fallbackTeam = visibleTeams[idx];
          if (fallbackTeam) {
            teamRaw = fallbackTeam.name;
          }
        }
        // Case 4: Single number [Elims] (maps to team in visible order)
        else if (tokens.length === 1 && !isNaN(Number(tokens[0]))) {
          elims = Number(tokens[0]) || 0;
          const fallbackTeam = visibleTeams[idx];
          if (fallbackTeam) {
            teamRaw = fallbackTeam.name;
          }
        } else {
          teamRaw = tokens[0] || '';
          elims = Number(tokens[1]) || 0;
        }
      }

      if (isWwcd === undefined) {
        isWwcd = rank === 1;
      }

      const matched = findMatchingTeam(teamRaw) || visibleTeams[idx] || null;

      return {
        rawLine: line,
        matchedTeamId: matched?.id || null,
        matchedTeamName: matched?.name || teamRaw || `Row #${idx + 1}`,
        matchedTeamTag: matched?.tag || '',
        rank,
        wwcd: isWwcd,
        elims,
        damage,
        isValid: Boolean(matched),
      };
    });
  }, [pasteText, findMatchingTeam, visibleTeams]);

  // Apply parsed preview rows to selected match
  const handleApplyPasteToMatch = () => {
    if (!pasteTargetMatchId || parsedPreviewRows.length === 0) return;

    setMatrixState((prev) => {
      const next = { ...prev };
      parsedPreviewRows.forEach((row) => {
        if (!row.matchedTeamId) return;

        const key = `${pasteTargetMatchId}_${row.matchedTeamId}`;
        const existing = next[key] || {
          rank: '',
          elims: '',
          damage: '',
          bonusPoints: '',
          smokesUsed: '',
          grenadesUsed: '',
          molotovsUsed: '',
          rescues: '',
        };

        next[key] = {
          ...existing,
          rank: row.rank,
          wwcd: row.wwcd,
          elims: row.elims,
          damage: row.damage || existing.damage || 0,
          isModified: true,
        };
      });
      return next;
    });

    setIsPasteModalOpen(false);
    setPasteText('');
    setStatusMessage({
      type: 'success',
      text: `Applied ${parsedPreviewRows.length} team results from spreadsheet to Match scorecard. Remember to click "Save Matrix Changes".`,
    });
  };

  // Direct In-Cell Keyboard Paste (Ctrl+V) handler
  const handleDirectCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startMatchId: string,
    startTeamIndex: number,
    field: 'rank' | 'elims'
  ) => {
    const text = e.clipboardData.getData('text');
    if (!text || (!text.includes('\n') && !text.includes('\t'))) {
      return; // Single value normal paste, let default input behavior handle
    }

    e.preventDefault();

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    setMatrixState((prev) => {
      const next = { ...prev };

      lines.forEach((line, lineOffset) => {
        const team = visibleTeams[startTeamIndex + lineOffset];
        if (!team) return;

        const tokens = line.split('\t').map((t) => t.trim());
        const key = `${startMatchId}_${team.id}`;
        const existing = next[key] || {
          rank: '',
          elims: '',
          damage: '',
          bonusPoints: '',
          smokesUsed: '',
          grenadesUsed: '',
          molotovsUsed: '',
          rescues: '',
        };

        if (tokens.length >= 3) {
          const rankVal = Number(tokens[0]);
          let elimsVal = Number(tokens[1]);
          let wwcdVal: boolean | undefined = undefined;

          if (
            tokens[1] === '0' ||
            tokens[1] === '1' ||
            ['true', 'false', 'yes', 'no', 'wwcd'].includes(tokens[1].toLowerCase())
          ) {
            // [Rank, WWCD, Elims]
            wwcdVal = parseWwcd(tokens[1]);
            elimsVal = Number(tokens[2]);
          } else if (
            tokens[2] === '0' ||
            tokens[2] === '1' ||
            ['true', 'false', 'yes', 'no', 'wwcd'].includes(tokens[2].toLowerCase())
          ) {
            // [Rank, Elims, WWCD]
            wwcdVal = parseWwcd(tokens[2]);
          }

          next[key] = {
            ...existing,
            rank: isNaN(rankVal) ? existing.rank : rankVal,
            elims: isNaN(elimsVal) ? existing.elims : elimsVal,
            ...(wwcdVal !== undefined ? { wwcd: wwcdVal } : {}),
            isModified: true,
          };
        } else if (tokens.length >= 2) {
          // Two values copied: Rank & Elims
          const rankVal = Number(tokens[0]);
          const elimsVal = Number(tokens[1]);
          next[key] = {
            ...existing,
            rank: isNaN(rankVal) ? existing.rank : rankVal,
            elims: isNaN(elimsVal) ? existing.elims : elimsVal,
            isModified: true,
          };
        } else if (tokens.length === 1) {
          // Single value copied: field (rank or elims)
          const num = Number(tokens[0]);
          if (!isNaN(num)) {
            next[key] = {
              ...existing,
              [field]: num,
              isModified: true,
            };
          }
        }
      });

      return next;
    });

    setStatusMessage({
      type: 'success',
      text: `Directly pasted ${lines.length} rows into match scorecard.`,
    });
  };

  // Copy Clean Spreadsheet Template with Team Names
  const handleCopySpreadsheetTemplate = () => {
    const header = 'Rank\tTeam Name\tWWCD\tElims\tDamage';
    const rows = visibleTeams.map((t, i) => `${i + 1}\t${t.name}\t${i === 0 ? 1 : 0}\t0\t0`).join('\n');
    const fullText = `${header}\n${rows}`;

    navigator.clipboard.writeText(fullText);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  // Fast Auto-Fill Placement Ranks (1 to 16) for a specific match
  const handleAutoFillRanks = (matchId: string) => {
    setMatrixState((prev) => {
      const next = { ...prev };
      visibleTeams.slice(0, 16).forEach((t, idx) => {
        const key = `${matchId}_${t.id}`;
        const existing = next[key] || {
          rank: '',
          elims: '',
          damage: '',
          bonusPoints: '',
          smokesUsed: '',
          grenadesUsed: '',
          molotovsUsed: '',
          rescues: '',
        };
        next[key] = {
          ...existing,
          rank: idx + 1,
          wwcd: idx === 0,
          elims: existing.elims === '' ? 0 : existing.elims,
          isModified: true,
        };
      });
      return next;
    });
  };

  // Batch Save all matches in Matrix
  const handleSaveAll = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const payload: MatchMatrixSavePayload[] = [];

      for (const m of filteredMatches) {
        const activeGame = m.games[0];
        if (!activeGame) continue;

        const resultsForMatch: MatchMatrixSavePayload['results'] = [];

        for (const t of participatingTeams) {
          const key = `${m.id}_${t.id}`;
          const cell = matrixState[key];

          if (cell && cell.rank !== '') {
            const rank = Number(cell.rank);
            const isWwcd = cell.wwcd !== undefined ? cell.wwcd : rank === 1;
            const elims = Number(cell.elims || 0);
            const bonus = Number(cell.bonusPoints || 0);
            const placePoints = getPlacementPoints(rank, pointsMatrix);
            const elimsPoints = elims * killMultiplier;
            const totalPoints = computeTotalPoints({ placePoints, elimsPoints, bonusPoints: bonus });

            resultsForMatch.push({
              teamId: t.id,
              rank,
              wwcd: isWwcd,
              placePoints,
              // Raw kill count — the server applies the kill multiplier exactly once.
              elims,
              elimsPoints,
              bonusPoints: bonus,
              totalPoints,
              damage: Number(cell.damage || 0),
              smokesUsed: Number(cell.smokesUsed || 0),
              grenadesUsed: Number(cell.grenadesUsed || 0),
              molotovsUsed: Number(cell.molotovsUsed || 0),
              rescues: Number(cell.rescues || 0),
            });
          }
        }

        if (resultsForMatch.length > 0) {
          // Only auto-complete the match when every participating squad has a
          // placement — a partial paste must not mark the match COMPLETED.
          const isFullyFilled = resultsForMatch.length === participatingTeams.length;
          payload.push({
            matchId: m.id,
            matchGameId: activeGame.id,
            ...(isFullyFilled ? { status: 'COMPLETED' as const } : {}),
            results: resultsForMatch,
          });
        }
      }

      if (payload.length === 0) {
        setStatusMessage({ type: 'error', text: 'No filled match scores to save.' });
        setIsSaving(false);
        return;
      }

      const res = await saveMultiMatchMatrixAction(selectedTourney.id, payload);

      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        setMatrixState((prev) => {
          const next: MatrixState = {};
          for (const [k, v] of Object.entries(prev)) {
            next[k] = { ...v, isModified: false };
          }
          return next;
        });
        router.refresh();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save matrix.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-[#0b101c] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-(--ed-blue)/10 text-(--ed-blue) dark:text-blue-400 text-[11px] font-black uppercase tracking-wider">
              ⚡ Multi-Match Bulk Editor
            </span>
            <span className="text-xs text-slate-500 font-medium">Fast Spreadsheet Matrix</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Match Scorecards Matrix
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Input rankings and eliminations across all tournament matches simultaneously. Paste directly from Excel or Google Sheets.
          </p>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Global Paste from Excel Button */}
          <button
            type="button"
            onClick={() => {
              setIsPasteModalOpen(true);
              setPasteText('');
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Paste from Excel / CSV</span>
          </button>

          <Link
            href="/admin/matches"
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ← Single Match View
          </Link>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-(--ed-blue) hover:brightness-110 text-white shadow-(--ed-blue)/25 animate-pulse'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes…' : hasUnsavedChanges ? 'Save Matrix Changes *' : 'All Changes Saved'}</span>
          </button>
        </div>
      </div>

      {/* ── Status Message Banner ── */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] uppercase tracking-wider underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Filter Bar: Tournament, Stage, Group & Search ── */}
      <div className="bg-white dark:bg-[#0b101c] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Tournament Dropdown */}
          <div className="min-w-[220px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Tournament
            </label>
            <select
              value={selectedTourneyId}
              onChange={(e) => {
                setSelectedTourneyId(e.target.value);
                setSelectedStage('ALL');
                setSelectedGroup('ALL');
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.game.name})
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          {availableStages.length > 0 && (
            <div className="min-w-[160px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Stage
              </label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              >
                <option value="ALL">All Stages ({filteredMatches.length} Matches)</option>
                {availableStages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group Filter */}
          {availableGroups.length > 0 && (
            <div className="min-w-[140px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Group
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              >
                <option value="ALL">All Groups</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Team Search & Template Copy */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopySpreadsheetTemplate}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
            title="Copy all confirmed tournament team names into clipboard to paste into Excel"
          >
            {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTemplate ? 'Copied Teams!' : 'Copy Excel Template'}</span>
          </button>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter teams…"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
            />
          </div>
        </div>
      </div>

      {/* ── Fast Matrix Spreadsheet Table ── */}
      {filteredMatches.length === 0 ? (
        <div className="bg-white dark:bg-[#0b101c] p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Swords className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Matches Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            There are no matches scheduled for the selected stage and group in this tournament. Create matches first or
            select a different stage.
          </p>
          <Link
            href={`/admin/matches?tournamentId=${selectedTourney?.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-(--ed-blue) text-white text-xs font-bold hover:bg-(--ed-blue)"
          >
            <Plus className="w-3.5 h-3.5" /> Create Match
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0b101c] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="w-full text-left border-collapse text-xs">
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-[#0f1627] text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 shadow-xs">
                <tr>
                  {/* Fixed Team Header */}
                  <th className="py-3.5 px-4 sticky left-0 z-30 bg-slate-100 dark:bg-[#0f1627] min-w-[200px] border-r border-slate-200 dark:border-slate-800 shadow-r">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider font-black">Participating Team</span>
                      <span className="text-[10px] text-slate-400 font-medium">({visibleTeams.length})</span>
                    </div>
                  </th>

                  {/* Columns for each Match */}
                  {filteredMatches.map((m) => {
                    const matchNum = m.matchNumber ? `M${m.matchNumber}` : m.format.split(' (')[0];
                    const map = m.mapName || 'Erangel';

                    return (
                      <th
                        key={m.id}
                        className="py-3 px-3 min-w-[165px] max-w-[190px] border-r border-slate-200 dark:border-slate-800 text-center"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-800 dark:text-slate-200">
                              {matchNum}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[90px] font-medium">
                              {map}
                            </span>
                          </div>

                          <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                            {/* Fast Auto Rank Button */}
                            <button
                              type="button"
                              onClick={() => handleAutoFillRanks(m.id)}
                              title="Auto-fill default ranks 1-16 for this match"
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200/70 hover:bg-(--ed-blue) hover:text-white dark:bg-slate-800 dark:hover:bg-(--ed-blue) text-slate-600 dark:text-slate-400 transition-colors"
                            >
                              Auto 1-16
                            </button>

                            {/* Paste Excel Table Modal Trigger */}
                            <button
                              type="button"
                              onClick={() => {
                                setPasteTargetMatchId(m.id);
                                setIsPasteModalOpen(true);
                                setPasteText('');
                              }}
                              title="Paste Excel table for this match"
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 transition-colors flex items-center gap-1"
                            >
                              <FileSpreadsheet className="w-2.5 h-2.5" /> Paste
                            </button>

                            {/* Direct Match Link */}
                            <Link
                              href={`/admin/matches?edit=${m.id}#team-results`}
                              target="_blank"
                              title="Open match scorecard details in new tab"
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[9px] uppercase tracking-wider text-slate-400 pt-0.5">
                            <span>Rank</span>
                            <span>Kills</span>
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  {/* Summary Leaderboard Header */}
                  <th className="py-3 px-4 min-w-[170px] bg-slate-200/50 dark:bg-slate-900/80 text-right">
                    <div className="text-right space-y-0.5">
                      <span className="text-[10px] uppercase font-black tracking-wider text-(--ed-blue) dark:text-blue-400 block">
                        Live Standings
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">MP · WWCD · Kills · Pts</span>
                    </div>
                  </th>
                </tr>
              </thead>

              {/* Table Body (Rows of Teams) */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {visibleTeams.map((team, tIdx) => {
                  const agg = teamAggregates.get(team.id) || {
                    matchesPlayed: 0,
                    wwcds: 0,
                    placePoints: 0,
                    elimsPoints: 0,
                    bonusPoints: 0,
                    totalPoints: 0,
                    totalDamage: 0,
                  };

                  return (
                    <tr
                      key={team.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Fixed Team Cell */}
                      <td className="py-2.5 px-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#0b101c] dark:group-hover:bg-[#0e1424] border-r border-slate-200 dark:border-slate-800 shadow-r">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-bold text-slate-400 w-4 text-center">
                            {tIdx + 1}
                          </span>
                          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 p-0.5 shrink-0 flex items-center justify-center">
                            {team.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={team.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <Shield className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs leading-tight">
                              {team.tag ? `[${team.tag}] ${team.name}` : team.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Cell Inputs for Each Match */}
                      {filteredMatches.map((m) => {
                        const key = `${m.id}_${team.id}`;
                        const cell = matrixState[key] || { rank: '', elims: '', isModified: false };
                        const points = getComputedMatchPoints(m.id, team.id);

                        const isWwcdWinner = cell.wwcd !== undefined ? Boolean(cell.wwcd) : cell.rank === 1;

                        return (
                          <td
                            key={m.id}
                            className={`p-2 border-r border-slate-100 dark:border-slate-800/80 transition-colors ${
                              cell.isModified
                                ? 'bg-amber-500/5 dark:bg-amber-500/10'
                                : isWwcdWinner
                                ? 'bg-emerald-500/5 dark:bg-emerald-500/10'
                                : ''
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {/* Rank Input with Direct Paste (Ctrl+V) Support */}
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={32}
                                  placeholder="—"
                                  value={cell.rank}
                                  onPaste={(e) => handleDirectCellPaste(e, m.id, tIdx, 'rank')}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                    handleCellChange(m.id, team.id, 'rank', val);
                                  }}
                                  className={`w-full px-1.5 py-1 text-center font-bold text-xs rounded-md border focus:outline-none focus:ring-2 focus:ring-(--ed-blue) ${
                                    isWwcdWinner
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                                  }`}
                                />
                                {isWwcdWinner && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCellChange(m.id, team.id, 'wwcd', !isWwcdWinner);
                                    }}
                                    className="absolute -top-1.5 -right-1 text-[10px] cursor-pointer hover:scale-125 transition-transform select-none"
                                    title="WWCD Winner 🍗 (Click to toggle)"
                                  >
                                    🍗
                                  </button>
                                )}
                              </div>

                              {/* Elims Input with Direct Paste (Ctrl+V) Support */}
                              <div className="flex-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={99}
                                  placeholder="0"
                                  value={cell.elims}
                                  onPaste={(e) => handleDirectCellPaste(e, m.id, tIdx, 'elims')}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                    handleCellChange(m.id, team.id, 'elims', val);
                                  }}
                                  className="w-full px-1.5 py-1 text-center font-semibold text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
                                />
                              </div>

                              {/* Computed Total Pts Indicator */}
                              {points && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveCellDetail({
                                      matchId: m.id,
                                      teamId: team.id,
                                      teamName: team.name,
                                      matchLabel: m.format,
                                    })
                                  }
                                  title={`Total: ${points.totalPoints} pts (${points.placePoints} place + ${points.elimsPoints} elims). Click for details.`}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-100 hover:bg-(--ed-blue) hover:text-white dark:bg-slate-800 dark:hover:bg-(--ed-blue) text-(--ed-blue) dark:text-blue-400 transition-colors shrink-0"
                                >
                                  {points.totalPoints}p
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Summary Leaderboard Cell */}
                      <td className="py-2.5 px-4 text-right bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="flex items-center justify-end gap-3 font-semibold">
                          <span className="text-[11px] text-slate-400" title="Matches Played">
                            {agg.matchesPlayed}m
                          </span>
                          {agg.wwcds > 0 && (
                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              {agg.wwcds}🍗
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {agg.elimsPoints}k
                          </span>
                          <span className="text-xs font-black text-(--ed-blue) dark:text-blue-400 min-w-[35px] text-right">
                            {agg.totalPoints} pts
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary Stats */}
          <div className="p-4 bg-slate-50 dark:bg-[#090d17] border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4 flex-wrap">
              <span>
                Showing <strong className="text-slate-800 dark:text-slate-200">{visibleTeams.length}</strong> teams
                across <strong className="text-slate-800 dark:text-slate-200">{filteredMatches.length}</strong> matches
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Rank 1 = WWCD (🍗)
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Unsaved Modified Cell
              </span>
              <span>·</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                💡 Tip: Click any cell and press Ctrl+V to paste multi-row columns directly!
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving || !hasUnsavedChanges}
                className="px-4 py-2 rounded-xl bg-(--ed-blue) hover:brightness-110 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Enhanced Paste Excel Table Modal with Live Preview ── */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b101c] max-w-2xl w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Paste from Excel or Google Sheets
                  </h3>
                  <p className="text-xs text-slate-500">
                    Copy columns from your spreadsheet and paste below.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Target Match Selector */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Target Match:</span>
                <select
                  value={pasteTargetMatchId}
                  onChange={(e) => setPasteTargetMatchId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b101c] text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
                >
                  {filteredMatches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.matchNumber ? `Match ${m.matchNumber}` : m.format} ({m.mapName || 'Erangel'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleCopySpreadsheetTemplate}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedTemplate ? 'Copied Teams Template!' : 'Copy Team Template'}</span>
              </button>
            </div>

            {/* Textarea */}
            <div className="shrink-0 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Paste tabular text (TSV, CSV, or spaces):</span>
                <span>Supported: [Rank] [Team] [Elims] [Damage] or [Rank] [Elims]</span>
              </div>
              <textarea
                rows={6}
                placeholder={`1\tTeam Soul\t9\t1420\n2\tGodLike Esports\t6\t1100\n3\tTeam XSpark\t4\t890\n4\tReckoning Esports\t3\t620`}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
              />
            </div>

            {/* Live Parsed Preview Table */}
            {parsedPreviewRows.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                  <span>Detected Results ({parsedPreviewRows.length} Teams):</span>
                  <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready to Apply
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-48">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-1.5 px-3">Rank</th>
                        <th className="py-1.5 px-3">Matched Team</th>
                        <th className="py-1.5 px-3 text-center">Elims</th>
                        <th className="py-1.5 px-3 text-center">Damage</th>
                        <th className="py-1.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#0b101c]">
                      {parsedPreviewRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-bold">
                            #{r.rank} {r.wwcd && '🍗'}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-100">
                            {r.matchedTeamName}
                          </td>
                          <td className="py-1.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                            {r.elims}
                          </td>
                          <td className="py-1.5 px-3 text-center text-slate-500">
                            {r.damage || '—'}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <Check className="w-3 h-3" /> Matched
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                                <AlertCircle className="w-3 h-3" /> Unmatched
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 shrink-0 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyPasteToMatch}
                disabled={parsedPreviewRows.length === 0}
                className="px-6 py-2.5 rounded-xl bg-(--ed-blue) hover:brightness-110 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply {parsedPreviewRows.length} Teams to Match</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Stats Modal / Drawer for Single Cell ── */}
      {activeCellDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b101c] max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Advanced Team Stats
                </h3>
                <p className="text-xs text-(--ed-blue) font-bold mt-0.5">
                  {activeCellDetail.teamName} · {activeCellDetail.matchLabel}
                </p>
              </div>
              <button
                onClick={() => setActiveCellDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {(() => {
              const key = `${activeCellDetail.matchId}_${activeCellDetail.teamId}`;
              const cell = matrixState[key] || {
                rank: '',
                elims: '',
                damage: '',
                bonusPoints: '',
                smokesUsed: '',
                grenadesUsed: '',
                molotovsUsed: '',
                rescues: '',
              };

              return (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        🍗 WWCD Winner (Match Victory)
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Mark team as match winner (sets wwcd = 1 in database)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCellChange(
                          activeCellDetail.matchId,
                          activeCellDetail.teamId,
                          'wwcd',
                          !(cell.wwcd !== undefined ? cell.wwcd : cell.rank === 1)
                        )
                      }
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        (cell.wwcd !== undefined ? cell.wwcd : cell.rank === 1)
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {(cell.wwcd !== undefined ? cell.wwcd : cell.rank === 1) ? '🍗 WWCD: YES' : 'WWCD: NO'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Placement Rank
                    </label>
                    <input
                      type="number"
                      value={cell.rank}
                      onChange={(e) =>
                        handleCellChange(
                          activeCellDetail.matchId,
                          activeCellDetail.teamId,
                          'rank',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Eliminations (Kills)
                    </label>
                    <input
                      type="number"
                      value={cell.elims}
                      onChange={(e) =>
                        handleCellChange(
                          activeCellDetail.matchId,
                          activeCellDetail.teamId,
                          'elims',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Damage Dealt
                    </label>
                    <input
                      type="number"
                      value={cell.damage}
                      onChange={(e) =>
                        handleCellChange(
                          activeCellDetail.matchId,
                          activeCellDetail.teamId,
                          'damage',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Bonus Points
                    </label>
                    <input
                      type="number"
                      value={cell.bonusPoints}
                      onChange={(e) =>
                        handleCellChange(
                          activeCellDetail.matchId,
                          activeCellDetail.teamId,
                          'bonusPoints',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Smokes Used
                    </label>
                    <input
                      type="number"
                      value={cell.smokesUsed}
                      onChange={(e) =>
                        handleCellChange(
                          activeCellDetail.matchId,
                          activeCellDetail.teamId,
                          'smokesUsed',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Grenades Used
                    </label>
                    <input
                      type="number"
                      value={cell.grenadesUsed}
                      onChange={(e) =>
                        handleCellChange(
                          activeCellDetail.matchId,
                          activeCellDetail.teamId,
                          'grenadesUsed',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Molotovs Used
                    </label>
                    <input
                      type="number"
                      value={cell.molotovsUsed}
                      onChange={(e) =>
                        handleCellChange(
                          activeCellDetail.matchId,
                          activeCellDetail.teamId,
                          'molotovsUsed',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Rescues / Revives
                    </label>
                    <input
                      type="number"
                      value={cell.rescues}
                      onChange={(e) =>
                        handleCellChange(
                          activeCellDetail.matchId,
                          activeCellDetail.teamId,
                          'rescues',
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveCellDetail(null)}
                className="px-5 py-2 rounded-xl bg-(--ed-blue) text-white text-xs font-bold uppercase tracking-wider"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
