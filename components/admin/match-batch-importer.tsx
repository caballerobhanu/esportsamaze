'use client';

import React from 'react';
import {
  FileSpreadsheet,
  Table,
  Code2,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Shield,
  Users,
  Trash2,
  Plus,
  RefreshCw,
  Info,
  Globe,
  Camera,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import {
  getPlacementPoints,
  computeTotalPoints,
  computeUtilitiesTotal,
  computeTotalDistance,
  parseSurvivalSeconds,
  parseWwcd,
} from '@/lib/tournament-math';
import { parseTableText, type ParsedTableMatch } from '@/lib/table-text-parser';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';

interface TeamOption {
  id: string;
  name: string;
  tag?: string | null;
  logoUrl?: string | null;
}

interface PlayerOption {
  id: string;
  ign: string;
  role?: string | null;
  currentTeamId?: string | null;
  currentTeam?: { tag?: string | null } | null;
}

export interface ExistingMatchOption {
  id: string;
  format: string;
  matchNumber?: number | null;
  mapName?: string | null;
  teamResults: any[];
  playerStats: any[];
}

interface MatchBatchImporterProps {
  matchId: string;
  matchGameId: string;
  allTeams: TeamOption[];
  allPlayers: PlayerOption[];
  pointsMatrix?: Record<number, number>;
  killMultiplier?: number;
  importTeamResultsAction: (formData: FormData) => Promise<void>;
  importPlayerStatsAction: (formData: FormData) => Promise<void>;
  existingTeamResults?: any[];
  existingPlayerStats?: any[];
  otherMatches?: ExistingMatchOption[];
}

/**
 * Detail (telemetry) value from an inbound paste row.
 *
 * `undefined` means "this paste did not carry that column", which the server
 * stores as NULL. The old `Number(x || 0)` turned an absent column into a
 * genuine-looking zero and `|| 1680` asserted a full-length match nobody
 * recorded. Only scoring columns keep a zero fallback.
 */
function detailNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** First of `keys` the row actually carries, parsed as a detail number. */
function detailNumberFrom(item: Record<string, any>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    if (item[key] !== undefined) return detailNumber(item[key]);
  }
  return undefined;
}

/** Survival time in seconds, or undefined when no survival column was carried. */
function detailSurvival(item: Record<string, any>): number | undefined {
  for (const key of ['survivalTime', 'survival', 'time']) {
    const raw = item[key];
    if (raw === null || raw === undefined) continue;
    if (typeof raw === 'string' && raw.trim() === '') continue;
    return parseSurvivalSeconds(raw, 0);
  }
  return undefined;
}

/** An absent MVP flag means "not recorded" (`undefined`), not "not MVP". */
function detailMvp(item: Record<string, any>): boolean | undefined {
  const raw = item.isMvp ?? item.mvp;
  return raw === undefined ? undefined : raw === true;
}

export function MatchBatchImporter({
  matchId,
  matchGameId,
  allTeams,
  allPlayers,
  pointsMatrix,
  killMultiplier = 1,
  importTeamResultsAction,
  importPlayerStatsAction,
  existingTeamResults = [],
  existingPlayerStats = [],
  otherMatches = [],
}: MatchBatchImporterProps) {
  const [activeTab, setActiveTab] = React.useState<'teams' | 'players'>('teams');
  const [pasteMode, setPasteMode] = React.useState<'excel' | 'json' | 'ocr'>('excel');
  const [rawText, setRawText] = React.useState('');
  const [replaceExisting, setReplaceExisting] = React.useState(true);
  const [copiedTemplate, setCopiedTemplate] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [selectedCloneMatchId, setSelectedCloneMatchId] = React.useState<string>('');
  const [cloneMode, setCloneMode] = React.useState<'reset' | 'exact'>('reset');


  // Scorecard OCR state
  const [ocrImage, setOcrImage] = React.useState<string | null>(null);
  const [isScanningOcr, setIsScanningOcr] = React.useState(false);
  const [ocrProgress, setOcrProgress] = React.useState(0);
  const [ocrStatus, setOcrStatus] = React.useState<string>('');
  const [rawOcrText, setRawOcrText] = React.useState('');

  // Parsed rows state
  const [parsedTeamRows, setParsedTeamRows] = React.useState<any[]>([]);
  const [parsedPlayerRows, setParsedPlayerRows] = React.useState<any[]>([]);

  // -------------------------------------------------------------
  // Helpers for Fuzzy Matching
  // -------------------------------------------------------------
  const findMatchingTeam = React.useCallback(
    (nameOrTag: string): TeamOption | undefined => {
      if (!nameOrTag) return undefined;
      const clean = nameOrTag.trim().toLowerCase().replace(/^\[|\]$/g, '');
      // 1. Exact match on name
      const exactName = allTeams.find((t) => t.name.toLowerCase() === clean);
      if (exactName) return exactName;

      // 2. Exact match on tag
      const exactTag = allTeams.find((t) => (t.tag || '').toLowerCase() === clean);
      if (exactTag) return exactTag;

      // 3. Name contains clean or clean contains name (longer team names first)
      const sortedByLength = [...allTeams].sort((a, b) => b.name.length - a.name.length);
      const partialName = sortedByLength.find((t) => {
        const tName = t.name.toLowerCase();
        return tName.includes(clean) || clean.includes(tName);
      });
      if (partialName) return partialName;

      // 4. Tag word-token match (prevent "QS" from matching inside "naqsh")
      const words = clean.split(/[\s\-_\/]+/).filter(Boolean);
      return allTeams.find((t) => {
        const tTag = (t.tag || '').toLowerCase();
        return Boolean(tTag && tTag.length >= 2 && words.includes(tTag));
      });
    },
    [allTeams]
  );

  const findMatchingPlayer = React.useCallback(
    (ign: string, teamHint?: string): PlayerOption | undefined => {
      if (!ign) return undefined;
      const clean = ign.trim().toLowerCase();
      const cleanTeam = (teamHint || '').trim().toLowerCase();

      // 1. If teamHint provided, look for exact IGN on THAT specific team first
      if (cleanTeam) {
        const teamPlayer = allPlayers.find(
          (p) =>
            p.ign.toLowerCase() === clean &&
            (p.currentTeam?.tag?.toLowerCase() === cleanTeam ||
              p.currentTeamId === teamHint ||
              allTeams.find((t) => t.id === p.currentTeamId)?.name.toLowerCase() === cleanTeam)
        );
        if (teamPlayer) return teamPlayer;
      }

      // 2. Exact match only. Substring matching is deliberately absent: an IGN that
      // merely contains another ("beast04" contains "beast") is a different player,
      // and matching it silently attached one player's scorecards to another.
      return allPlayers.find((p) => p.ign.toLowerCase() === clean);
    },
    [allPlayers, allTeams]
  );

  const teamSelectOptions: SearchableSelectOption[] = React.useMemo(() => {
    return allTeams.map((t) => ({
      value: t.id,
      label: t.name,
      subtitle: t.tag ? `[${t.tag}]` : undefined,
      imageUrl: t.logoUrl || undefined,
    }));
  }, [allTeams]);

  const playerSelectOptions: SearchableSelectOption[] = React.useMemo(() => {
    return allPlayers.map((p) => ({
      value: p.id,
      label: p.ign,
      subtitle: p.currentTeam?.tag ? `[${p.currentTeam.tag}]` : undefined,
    }));
  }, [allPlayers]);

  // -------------------------------------------------------------
  // Parse Excel / TSV / CSV / JSON for Team Results
  // -------------------------------------------------------------
  const parseTeamData = React.useCallback(
    (text: string) => {
      setErrorMsg(null);
      if (!text.trim()) {
        setParsedTeamRows([]);
        return;
      }

      if (pasteMode === 'json') {
        try {
          const json = JSON.parse(text);
          if (!Array.isArray(json)) throw new Error('JSON root must be an array of team objects');
          const rows = json.map((item: any, idx: number) => {
            const matchedTeam = findMatchingTeam(item.team || item.teamName || item.tag || item.shortCode || '');
            const rank = Number(item.rank || idx + 1);
            const isWwcd = parseWwcd(item.wwcd ?? item.team_wwcd ?? item.teamWwcd, rank);
            const placePoints =
              item.placePoints != null ? Number(item.placePoints) : getPlacementPoints(rank, pointsMatrix);
            const elimsPoints = Number(item.elimsPoints || item.elims || item.kills || 0) * killMultiplier;
            const bonusPoints = Number(item.bonusPoints || 0);
            const totalPoints =
              item.totalPoints != null ? Number(item.totalPoints) : placePoints + elimsPoints + bonusPoints;

            return {
              rawInput: item.team || item.teamName || item.tag || `Team ${rank}`,
              teamId: matchedTeam?.id || item.teamId || '',
              teamName: matchedTeam?.name || item.team || item.teamName || '',
              shortCode: matchedTeam?.tag || item.shortCode || item.tag || '',
              rank,
              wwcd: isWwcd,
              placePoints,
              elimsPoints,
              bonusPoints,
              totalPoints,
              // Detail telemetry: an absent key stays undefined → NULL, never a
              // fabricated 0 (and never a fabricated 1680-second survival).
              damage: detailNumber(item.damage),
              survivalTime: detailNumber(item.survivalTime),
              healing: detailNumber(item.healing),
              damageReceived: detailNumber(item.damageReceived),
              headshots: detailNumber(item.headshots),
              assists: detailNumber(item.assists),
              knockouts: detailNumber(item.knockouts),
              longestElim: detailNumber(item.longestElim),
              vehicleElims: detailNumber(item.vehicleElims),
              grenadeElims: detailNumber(item.grenadeElims),
              smokesUsed: detailNumber(item.smokesUsed),
              grenadesUsed: detailNumber(item.grenadesUsed),
              molotovsUsed: detailNumber(item.molotovsUsed),
              flashUsed: detailNumber(item.flashUsed),
              airdrops: detailNumber(item.airdrops),
              rescues: detailNumber(item.rescues),
              distDrove: detailNumber(item.distDrove),
              distWalk: detailNumber(item.distWalk),
              isMatched: Boolean(matchedTeam),
            };
          });
          setParsedTeamRows(rows);
        } catch (err: any) {
          setErrorMsg(`JSON Parse Error: ${err.message}`);
          setParsedTeamRows([]);
        }
        return;
      }

      // Excel / TSV / CSV Parsing
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) {
        setParsedTeamRows([]);
        return;
      }

      // Check if line 0 is a header
      const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : '\t';
      const firstLineTokens = lines[0].split(delimiter).map((t) => t.trim().toLowerCase());
      const hasHeader = firstLineTokens.some(
        (t) =>
          t.includes('rank') ||
          t.includes('team') ||
          t.includes('elim') ||
          t.includes('kill') ||
          t.includes('pts') ||
          t.includes('place')
      );

      // Extract column indices if header exists
      let colRank = -1;
      let colTeam = -1;
      let colPlace = -1;
      let colElims = -1;
      let colTotal = -1;
      let colDamage = -1;
      let colSurvival = -1;
      let colSmokes = -1;
      let colGrenades = -1;
      let colMolotovs = -1;
      let colRescues = -1;
      let colWwcd = -1;

      if (hasHeader) {
        firstLineTokens.forEach((t, idx) => {
          if (t === 'rank' || t === '#' || t === 'pos' || t === 'placement') colRank = idx;
          else if (t.includes('team') || t.includes('clan') || t.includes('name')) colTeam = idx;
          else if (t.includes('place') || t === 'pp' || t === 'pl') colPlace = idx;
          else if (t.includes('elim') || t.includes('kill') || t === 'kp' || t === 'ep' || t === 'finishes')
            colElims = idx;
          else if (t.includes('total') || t === 'pts' || t === 'points' || t === 'tot') colTotal = idx;
          else if (t.includes('dmg') || t.includes('damage')) colDamage = idx;
          else if (t.includes('surv') || t.includes('time')) colSurvival = idx;
          else if (t.includes('smoke')) colSmokes = idx;
          else if (t.includes('grenade') || t === 'nade') colGrenades = idx;
          else if (t.includes('molotov') || t === 'moly') colMolotovs = idx;
          else if (t.includes('rescue') || t.includes('revive')) colRescues = idx;
          else if (t.includes('wwcd') || t.includes('chicken') || t === 'win' || t === 'won') colWwcd = idx;
        });
      }

      const dataLines = hasHeader ? lines.slice(1) : lines;
      const rows = dataLines.map((line, idx) => {
        const tokens = line.split(delimiter).map((t) => t.trim());

        let rank = idx + 1;
        let rawTeam = '';
        let placePts: number | null = null;
        let elims = 0;
        let totalPts: number | null = null;
        // Detail telemetry: undefined until a parsed column proves otherwise.
        let damage: number | undefined;
        let survival: number | undefined;
        let smokes: number | undefined;
        let grenades: number | undefined;
        let molotovs: number | undefined;
        let rescues: number | undefined;
        let isWwcd: boolean | undefined = undefined;

        if (hasHeader && colTeam !== -1) {
          rawTeam = tokens[colTeam] || '';
          if (colRank !== -1 && !isNaN(Number(tokens[colRank]))) rank = Number(tokens[colRank]);
          if (colPlace !== -1 && !isNaN(Number(tokens[colPlace]))) placePts = Number(tokens[colPlace]);
          if (colElims !== -1 && !isNaN(Number(tokens[colElims]))) elims = Number(tokens[colElims]);
          if (colTotal !== -1 && !isNaN(Number(tokens[colTotal]))) totalPts = Number(tokens[colTotal]);
          if (colDamage !== -1) damage = detailNumber(tokens[colDamage]);
          if (colSurvival !== -1 && tokens[colSurvival] !== '') {
            survival = parseSurvivalSeconds(tokens[colSurvival], 0);
          }
          if (colSmokes !== -1) smokes = detailNumber(tokens[colSmokes]);
          if (colGrenades !== -1) grenades = detailNumber(tokens[colGrenades]);
          if (colMolotovs !== -1) molotovs = detailNumber(tokens[colMolotovs]);
          if (colRescues !== -1) rescues = detailNumber(tokens[colRescues]);
          if (colWwcd !== -1 && tokens[colWwcd] !== undefined && tokens[colWwcd] !== '') {
            isWwcd = parseWwcd(tokens[colWwcd], rank);
          }
        } else {
          // Positional fallback:
          let offset = 0;
          if (!isNaN(Number(tokens[0])) && Number(tokens[0]) <= 32) {
            rank = Number(tokens[0]);
            rawTeam = tokens[1] || `Team ${rank}`;
            offset = 2;
          } else {
            rawTeam = tokens[0] || `Team ${rank}`;
            offset = 1;
          }

          if (tokens[offset] != null && !isNaN(Number(tokens[offset]))) placePts = Number(tokens[offset++]);
          if (tokens[offset] != null && !isNaN(Number(tokens[offset]))) elims = Number(tokens[offset++]);
          if (tokens[offset] != null && !isNaN(Number(tokens[offset]))) totalPts = Number(tokens[offset++]);
          if (tokens[offset] != null && !isNaN(Number(tokens[offset]))) damage = Number(tokens[offset++]);
        }

        if (isWwcd === undefined) {
          isWwcd = rank === 1;
        }
        const finalPlacePts = placePts != null ? placePts : getPlacementPoints(rank, pointsMatrix);
        const finalElimsPts = elims * killMultiplier;
        const finalTotalPts = totalPts != null ? totalPts : finalPlacePts + finalElimsPts;

        const matchedTeam = findMatchingTeam(rawTeam);

        return {
          rawInput: rawTeam,
          teamId: matchedTeam?.id || '',
          teamName: matchedTeam?.name || rawTeam,
          shortCode: matchedTeam?.tag || '',
          rank,
          wwcd: isWwcd,
          // Scoring columns always carry a real value.
          placePoints: finalPlacePts,
          elimsPoints: finalElimsPts,
          bonusPoints: 0,
          totalPoints: finalTotalPts,
          // Only the detail columns this table actually parsed are emitted. The
          // rest stay absent so the server stores NULL instead of a fabricated 0
          // (the old `healing: 0`, `flashUsed: 0`, … did exactly that).
          damage,
          survivalTime: survival,
          smokesUsed: smokes,
          grenadesUsed: grenades,
          molotovsUsed: molotovs,
          rescues,
          isMatched: Boolean(matchedTeam),
        };
      });

      setParsedTeamRows(rows);
    },
    [pasteMode, findMatchingTeam, pointsMatrix, killMultiplier]
  );

  // -------------------------------------------------------------
  // Parse Excel / TSV / CSV / JSON for Player Stats (With ALL 5 extra stats)
  // -------------------------------------------------------------
  const parsePlayerData = React.useCallback(
    (text: string) => {
      setErrorMsg(null);
      if (!text.trim()) {
        setParsedPlayerRows([]);
        return;
      }

      if (pasteMode === 'json') {
        try {
          const json = JSON.parse(text);
          if (!Array.isArray(json)) throw new Error('JSON root must be an array of player stat objects');
          const rows = json.map((item: any) => {
            const rawPlayer = item.player || item.ign || item.playerName || '';
            const rawTeam = item.team || item.teamName || item.tag || '';
            const matchedPlayer = findMatchingPlayer(rawPlayer);
            const matchedTeam =
              findMatchingTeam(rawTeam) ||
              (matchedPlayer?.currentTeamId ? allTeams.find((t) => t.id === matchedPlayer.currentTeamId) : undefined);

            const elims = Number(item.playerElims || item.elims || item.kills || 0);
            // Detail telemetry: a key the row does not carry stays undefined →
            // NULL, never a fabricated 0.
            const damage = detailNumberFrom(item, 'damage');
            const headshots = detailNumberFrom(item, 'headshots');
            const assists = detailNumberFrom(item, 'assists');
            const knockouts = detailNumberFrom(item, 'knockouts');
            const longestElim = detailNumberFrom(item, 'longestElim');
            const isMvp = detailMvp(item);
            const powerplay = detailNumberFrom(item, 'playerPowerplay', 'powerplay');

            const survivalTime = detailSurvival(item);

            const healing = detailNumberFrom(item, 'healing', 'heal');
            const damageReceived = detailNumberFrom(item, 'damageReceived', 'dmgReceived', 'damageTaken', 'dmgRec');
            const vehicleElims = detailNumberFrom(item, 'vehicleElims', 'vehicleKills', 'vehElims', 'vehicle');
            const grenadeElims = detailNumberFrom(item, 'grenadeElims', 'grenadeKills', 'nadeElims', 'grenade');

            return {
              rawPlayer,
              rawTeam,
              playerId: matchedPlayer?.id || '',
              playerIgn: matchedPlayer?.ign || rawPlayer,
              teamId: matchedTeam?.id || '',
              teamName: matchedTeam?.name || rawTeam,
              shortCode: matchedTeam?.tag || '',
              role: item.role || matchedPlayer?.role || '',
              playerElims: elims,
              damage,
              headshots,
              assists,
              knockouts,
              longestElim,
              isMvp,
              playerPowerplay: powerplay,
              survivalTime,
              healing,
              damageReceived,
              vehicleElims,
              grenadeElims,
              isPlayerMatched: Boolean(matchedPlayer),
              isTeamMatched: Boolean(matchedTeam),
            };
          });
          setParsedPlayerRows(rows);
        } catch (err: any) {
          setErrorMsg(`JSON Parse Error: ${err.message}`);
          setParsedPlayerRows([]);
        }
        return;
      }

      // Excel / TSV / CSV Parsing for Players
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) {
        setParsedPlayerRows([]);
        return;
      }

      const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : '\t';
      const firstLineTokens = lines[0].split(delimiter).map((t) => t.trim().toLowerCase());
      const hasHeader = firstLineTokens.some(
        (t) =>
          t.includes('player') ||
          t.includes('ign') ||
          t.includes('elim') ||
          t.includes('kill') ||
          t.includes('dmg') ||
          t.includes('damage')
      );

      let colPlayer = -1;
      let colTeam = -1;
      let colElims = -1;
      let colDamage = -1;
      let colHeadshots = -1;
      let colAssists = -1;
      let colKnocks = -1;
      let colPowerplay = -1;
      let colLongElim = -1;
      let colMvp = -1;
      // 5 extra elements
      let colSurvival = -1;
      let colHealing = -1;
      let colDmgRec = -1;
      let colVehElims = -1;
      let colGrenadeElims = -1;

      if (hasHeader) {
        firstLineTokens.forEach((t, idx) => {
          if (t.includes('player') || t === 'ign' || t === 'name') colPlayer = idx;
          else if (t.includes('team') || t.includes('clan') || t === 'tag') colTeam = idx;
          else if (t.includes('elim') || t.includes('kill') || t === 'kp' || t === 'finishes') colElims = idx;
          else if (t === 'damage' || t === 'dmg') colDamage = idx;
          else if (t.includes('head') || t === 'hs') colHeadshots = idx;
          else if (t.includes('assist') || t === 'ast') colAssists = idx;
          else if (t.includes('knock') || t.includes('dbno')) colKnocks = idx;
          else if (t.includes('power') || t.includes('zone1')) colPowerplay = idx;
          else if (t.includes('long') || t.includes('dist')) colLongElim = idx;
          else if (t.includes('mvp') || t.includes('star')) colMvp = idx;
          else if (t.includes('surv') || t === 'time') colSurvival = idx;
          else if (t.includes('heal')) colHealing = idx;
          else if (t.includes('dmgrec') || t.includes('received') || t.includes('taken')) colDmgRec = idx;
          else if (t.includes('veh') || t.includes('driveby') || t.includes('roadkill')) colVehElims = idx;
          else if (t.includes('grenade') || t.includes('nade')) colGrenadeElims = idx;
        });
      }

      const dataLines = hasHeader ? lines.slice(1) : lines;
      const rows = dataLines.map((line) => {
        const tokens = line.split(delimiter).map((t) => t.trim());

        let rawPlayer = '';
        let rawTeam = '';
        let elims = 0;
        // Detail telemetry: undefined until a parsed column proves otherwise.
        let damage: number | undefined;
        let headshots: number | undefined;
        let assists: number | undefined;
        let knockouts: number | undefined;
        let powerplay: number | undefined;
        let longestElim: number | undefined;
        let isMvp: boolean | undefined;
        let survivalTime: number | undefined;
        let healing: number | undefined;
        let damageReceived: number | undefined;
        let vehicleElims: number | undefined;
        let grenadeElims: number | undefined;

        if (hasHeader && colPlayer !== -1) {
          rawPlayer = tokens[colPlayer] || '';
          if (colTeam !== -1) rawTeam = tokens[colTeam] || '';
          if (colElims !== -1 && !isNaN(Number(tokens[colElims]))) elims = Number(tokens[colElims]);
          if (colDamage !== -1) damage = detailNumber(tokens[colDamage]);
          if (colHeadshots !== -1) headshots = detailNumber(tokens[colHeadshots]);
          if (colAssists !== -1) assists = detailNumber(tokens[colAssists]);
          if (colKnocks !== -1) knockouts = detailNumber(tokens[colKnocks]);
          if (colPowerplay !== -1) powerplay = detailNumber(tokens[colPowerplay]);
          if (colLongElim !== -1) longestElim = detailNumber(tokens[colLongElim]);
          if (colMvp !== -1 && tokens[colMvp] !== '') {
            const mvpVal = (tokens[colMvp] || '').toLowerCase();
            isMvp = mvpVal === 'yes' || mvpVal === 'true' || mvpVal === '1' || mvpVal === 'mvp' || mvpVal === '⭐';
          }
          if (colSurvival !== -1 && tokens[colSurvival] !== '') {
            survivalTime = parseSurvivalSeconds(tokens[colSurvival], 0);
          }
          if (colHealing !== -1) healing = detailNumber(tokens[colHealing]);
          if (colDmgRec !== -1) damageReceived = detailNumber(tokens[colDmgRec]);
          if (colVehElims !== -1) vehicleElims = detailNumber(tokens[colVehElims]);
          if (colGrenadeElims !== -1) grenadeElims = detailNumber(tokens[colGrenadeElims]);
        } else {
          // Positional fallback
          rawPlayer = tokens[0] || '';
          rawTeam = tokens[1] || '';
          let offset = 2;
          if (tokens[offset] != null && !isNaN(Number(tokens[offset]))) elims = Number(tokens[offset++]);
          if (tokens[offset] != null && !isNaN(Number(tokens[offset]))) damage = Number(tokens[offset++]);
          if (tokens[offset] != null && !isNaN(Number(tokens[offset]))) headshots = Number(tokens[offset++]);
          if (tokens[offset] != null && !isNaN(Number(tokens[offset]))) assists = Number(tokens[offset++]);
          if (tokens[offset] != null && !isNaN(Number(tokens[offset]))) knockouts = Number(tokens[offset++]);
        }

        const matchedPlayer = findMatchingPlayer(rawPlayer);
        const matchedTeam =
          findMatchingTeam(rawTeam) ||
          (matchedPlayer?.currentTeamId ? allTeams.find((t) => t.id === matchedPlayer.currentTeamId) : undefined);

        return {
          rawPlayer,
          rawTeam,
          playerId: matchedPlayer?.id || '',
          playerIgn: matchedPlayer?.ign || rawPlayer,
          teamId: matchedTeam?.id || '',
          teamName: matchedTeam?.name || rawTeam,
          shortCode: matchedTeam?.tag || '',
          role: matchedPlayer?.role || '',
          playerElims: elims,
          damage,
          headshots,
          assists,
          knockouts,
          longestElim,
          isMvp,
          playerPowerplay: powerplay,
          survivalTime,
          healing,
          damageReceived,
          vehicleElims,
          grenadeElims,
          isPlayerMatched: Boolean(matchedPlayer),
          isTeamMatched: Boolean(matchedTeam),
        };
      });

      setParsedPlayerRows(rows);
    },
    [pasteMode, findMatchingPlayer, findMatchingTeam, allTeams]
  );

  // Trigger parsing whenever text or tab changes
  React.useEffect(() => {
    if (activeTab === 'teams') {
      parseTeamData(rawText);
    } else {
      parsePlayerData(rawText);
    }
  }, [rawText, activeTab, pasteMode, parseTeamData, parsePlayerData]);

  // -------------------------------------------------------------
  // Duplicate / Clone from Existing Match
  // -------------------------------------------------------------
  const handleCloneFromMatch = () => {
    if (!selectedCloneMatchId) return;
    const sourceMatch = otherMatches.find((m) => m.id === selectedCloneMatchId);
    if (!sourceMatch) return;

    if (activeTab === 'teams') {
      if (!sourceMatch.teamResults || sourceMatch.teamResults.length === 0) {
        setErrorMsg('Selected match does not contain any team standings to copy.');
        return;
      }

      const cloned = sourceMatch.teamResults.map((tr: any, idx: number) => {
        const rank = tr.rank || idx + 1;
        const placePoints = cloneMode === 'reset' ? getPlacementPoints(rank, pointsMatrix) : tr.placePoints;
        const elimsPoints = cloneMode === 'reset' ? 0 : tr.elimsPoints;
        const totalPoints = cloneMode === 'reset' ? placePoints : tr.totalPoints;

        return {
          rank,
          team: tr.team?.name || tr.teamId,
          tag: tr.shortCode || tr.team?.tag || '',
          placePoints,
          elimsPoints,
          totalPoints,
          // "Reset" clears the telemetry rather than asserting zeros: the values
          // are unknown, so they go back to NULL.
          damage: cloneMode === 'reset' ? undefined : tr.damage,
          wwcd: cloneMode === 'reset' ? rank === 1 : tr.wwcd,
          survivalTime: cloneMode === 'reset' ? undefined : tr.survivalTime,
          healing: cloneMode === 'reset' ? undefined : tr.healing,
          damageReceived: cloneMode === 'reset' ? undefined : tr.damageReceived,
          headshots: cloneMode === 'reset' ? undefined : tr.headshots,
          assists: cloneMode === 'reset' ? undefined : tr.assists,
          knockouts: cloneMode === 'reset' ? undefined : tr.knockouts,
          longestElim: cloneMode === 'reset' ? undefined : tr.longestElim,
          vehicleElims: cloneMode === 'reset' ? undefined : tr.vehicleElims,
          grenadeElims: cloneMode === 'reset' ? undefined : tr.grenadeElims,
          smokesUsed: cloneMode === 'reset' ? undefined : tr.smokesUsed,
          grenadesUsed: cloneMode === 'reset' ? undefined : tr.grenadesUsed,
          molotovsUsed: cloneMode === 'reset' ? undefined : tr.molotovsUsed,
          rescues: cloneMode === 'reset' ? undefined : tr.rescues,
        };
      });

      setPasteMode('json');
      setRawText(JSON.stringify(cloned, null, 2));
      setErrorMsg(null);
    } else {
      if (!sourceMatch.playerStats || sourceMatch.playerStats.length === 0) {
        setErrorMsg('Selected match does not contain any player stats to copy.');
        return;
      }

      const cloned = sourceMatch.playerStats.map((ps: any) => ({
        player: ps.player?.ign || ps.playerId,
        team: ps.team?.name || ps.teamId,
        elims: cloneMode === 'reset' ? 0 : ps.playerElims,
        // Detail telemetry: reset means "unknown" (NULL), and an exact clone
        // carries the source row's own value — including its NULLs.
        damage: cloneMode === 'reset' ? undefined : ps.damage,
        headshots: cloneMode === 'reset' ? undefined : ps.headshots,
        assists: cloneMode === 'reset' ? undefined : ps.assists,
        knockouts: cloneMode === 'reset' ? undefined : ps.knockouts,
        longestElim: cloneMode === 'reset' ? undefined : ps.longestElim,
        isMvp: cloneMode === 'reset' ? undefined : ps.isMvp,
        powerplay: cloneMode === 'reset' ? undefined : ps.playerPowerplay,
        survivalTime: cloneMode === 'reset' ? undefined : ps.survivalTime,
        healing: cloneMode === 'reset' ? undefined : ps.healing,
        damageReceived: cloneMode === 'reset' ? undefined : ps.damageReceived,
        vehicleElims: cloneMode === 'reset' ? undefined : ps.vehicleElims,
        grenadeElims: cloneMode === 'reset' ? undefined : ps.grenadeElims,
      }));

      setPasteMode('json');
      setRawText(JSON.stringify(cloned, null, 2));
      setErrorMsg(null);
    }
  };

  // -------------------------------------------------------------
  const applyTableMatchToRows = React.useCallback(
    (match: ParsedTableMatch) => {
      const rows = match.rows.map((r, idx) => {
        const rank = r.rank || idx + 1;
        const matchedTeam = findMatchingTeam(r.rawTeam);
        const placePts = r.placePoints != null ? r.placePoints : getPlacementPoints(rank, pointsMatrix);
        const elimsPts = (r.elims || 0) * killMultiplier;
        const totalPts = r.totalPoints != null ? r.totalPoints : placePts + elimsPts;

        return {
          rawInput: r.rawTeam,
          teamId: matchedTeam?.id || '',
          teamName: matchedTeam?.name || r.rawTeam,
          shortCode: matchedTeam?.tag || '',
          rank,
          wwcd: r.wwcd !== undefined ? Boolean(r.wwcd) : rank === 1,
          placePoints: placePts,
          elimsPoints: elimsPts,
          bonusPoints: 0,
          totalPoints: totalPts,
          // An OCR'd placement table carries placement and damage only — every
          // other detail stat is absent, so it is omitted and stored as NULL.
          damage: r.damage,
          isMatched: Boolean(matchedTeam),
        };
      });

      setParsedTeamRows(rows);
    },
    [findMatchingTeam, pointsMatrix, killMultiplier]
  );

  // -------------------------------------------------------------
  // Scorecard Screenshot OCR Handler
  // -------------------------------------------------------------
  const handleOcrFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPEG, WebP).');
      return;
    }
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setOcrImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const runOcrScan = async () => {
    if (!ocrImage) {
      setErrorMsg('Please upload or paste a scorecard image first.');
      return;
    }

    setErrorMsg(null);
    setIsScanningOcr(true);
    setOcrProgress(5);
    setOcrStatus('Initializing OCR engine...');

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrStatus('Scanning scorecard text...');
            setOcrProgress(Math.round(m.progress * 100));
          } else {
            setOcrStatus(m.status);
          }
        },
      });

      setOcrStatus('Analyzing scorecard rows...');
      const ret = await worker.recognize(ocrImage);
      await worker.terminate();

      const text = ret.data.text;
      setRawOcrText(text);

      // Parse the recognized text as tabular lines
      const parsedMatches = parseTableText(text);
      if (parsedMatches.length > 0 && parsedMatches[0].rows.length > 0) {
        applyTableMatchToRows(parsedMatches[0]);
        setOcrStatus(`OCR Complete! Extracted ${parsedMatches[0].rows.length} team entries.`);
      } else {
        setRawText(text);
        setOcrStatus('OCR complete. Text copied to box below for inspection.');
      }
    } catch (err: any) {
      setErrorMsg(`OCR Scan failed: ${err.message || String(err)}`);
    } finally {
      setIsScanningOcr(false);
    }
  };

  // Listen for clipboard Ctrl+V when in OCR mode
  React.useEffect(() => {
    if (pasteMode !== 'ocr') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleOcrFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [pasteMode]);

  // Trigger parsing whenever text or tab changes
  React.useEffect(() => {
    if (pasteMode === 'ocr') {
      return;
    }

    if (activeTab === 'teams') {
      parseTeamData(rawText);
    } else {
      parsePlayerData(rawText);
    }
  }, [rawText, activeTab, pasteMode, parseTeamData, parsePlayerData, applyTableMatchToRows]);

  // -------------------------------------------------------------
  // Copy Templates & Sample Data
  // -------------------------------------------------------------
  const copyExcelTemplate = () => {
    let headers = '';
    if (activeTab === 'teams') {
      headers = 'Rank\tTeam\tPlace Pts\tElims\tTotal Pts\tDamage\tSurvival\tSmokes\tGrenades\tRescues';
    } else {
      headers =
        'Player\tTeam\tElims\tDamage\tHeadshots\tAssists\tKnockouts\tPowerplay\tLongest Elim\tMVP\tSurvival\tHealing\tDmgReceived\tVehicleElims\tGrenadeElims';
    }
    navigator.clipboard.writeText(headers);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const loadSampleData = () => {
    if (activeTab === 'teams') {
      if (pasteMode === 'json') {
        const sampleJson = [
          { rank: 1, team: allTeams[0]?.name || 'Team Soul', elims: 12, damage: 2450, wwcd: true, smokesUsed: 8, survivalTime: 1680, healing: 450 },
          { rank: 2, team: allTeams[1]?.name || 'GodLike Esports', elims: 8, damage: 1820, wwcd: false, smokesUsed: 6, survivalTime: 1620, healing: 380 },
          { rank: 3, team: allTeams[2]?.name || 'Entity Gaming', elims: 6, damage: 1400, wwcd: false, smokesUsed: 5, survivalTime: 1480, healing: 290 },
          { rank: 4, team: allTeams[3]?.name || 'Team XSpark', elims: 5, damage: 1250, wwcd: false, smokesUsed: 4, survivalTime: 1350, healing: 220 },
        ];
        setRawText(JSON.stringify(sampleJson, null, 2));
      } else {
        const t1 = allTeams[0]?.name || 'Team Soul';
        const t2 = allTeams[1]?.name || 'GodLike Esports';
        const t3 = allTeams[2]?.name || 'Entity Gaming';
        const t4 = allTeams[3]?.name || 'Team XSpark';
        const t5 = allTeams[4]?.name || 'Carnival Gaming';
        const sample = `Rank\tTeam\tPlace Pts\tElims\tTotal Pts\tDamage\tSurvival\tSmokes\tGrenades\tRescues\n1\t${t1}\t10\t14\t24\t2850\t26:40\t8\t4\t3\n2\t${t2}\t6\t9\t15\t1980\t26:30\t6\t3\t2\n3\t${t3}\t5\t7\t12\t1650\t24:15\t5\t2\t1\n4\t${t4}\t4\t5\t9\t1320\t21:10\t4\t2\t1\n5\t${t5}\t3\t4\t7\t1150\t18:45\t3\t1\t0`;
        setRawText(sample);
      }
    } else {
      if (pasteMode === 'json') {
        const sampleJson = [
          {
            player: allPlayers[0]?.ign || 'Mortal',
            team: allTeams[0]?.name || 'Team Soul',
            elims: 5,
            damage: 1120,
            headshots: 3,
            knockouts: 4,
            isMvp: true,
            survivalTime: 1680,
            healing: 350,
            damageReceived: 420,
            vehicleElims: 1,
            grenadeElims: 2,
          },
          {
            player: allPlayers[1]?.ign || 'Jonathan',
            team: allTeams[1]?.name || 'GodLike Esports',
            elims: 4,
            damage: 980,
            headshots: 2,
            knockouts: 3,
            isMvp: false,
            survivalTime: 1620,
            healing: 280,
            damageReceived: 510,
            vehicleElims: 0,
            grenadeElims: 1,
          },
          {
            player: allPlayers[2]?.ign || 'SprayGod',
            team: allTeams[3]?.name || 'Team XSpark',
            elims: 3,
            damage: 720,
            headshots: 1,
            knockouts: 2,
            isMvp: false,
            survivalTime: 1350,
            healing: 190,
            damageReceived: 380,
            vehicleElims: 0,
            grenadeElims: 0,
          },
        ];
        setRawText(JSON.stringify(sampleJson, null, 2));
      } else {
        const p1 = allPlayers[0]?.ign || 'Mortal';
        const p2 = allPlayers[1]?.ign || 'Jonathan';
        const p3 = allPlayers[2]?.ign || 'SprayGod';
        const p4 = allPlayers[3]?.ign || 'Saumraj';
        const t1 = allTeams[0]?.name || 'Team Soul';
        const t2 = allTeams[1]?.name || 'GodLike Esports';
        const t3 = allTeams[3]?.name || 'Team XSpark';
        const sample = `Player\tTeam\tElims\tDamage\tHeadshots\tAssists\tKnockouts\tPowerplay\tLongest Elim\tMVP\tSurvival\tHealing\tDmgReceived\tVehicleElims\tGrenadeElims\n${p1}\t${t1}\t5\t1120\t3\t2\t4\t2\t245.5\tYes\t28:00\t350\t420\t1\t2\n${p2}\t${t2}\t4\t980\t2\t3\t3\t1\t180.2\tNo\t27:00\t280\t510\t0\t1\n${p3}\t${t3}\t3\t720\t1\t1\t2\t0\t150.0\tNo\t22:30\t190\t380\t0\t0\n${p4}\t${t3}\t2\t590\t1\t2\t2\t1\t120.4\tNo\t19:40\t120\t310\t0\t1`;
        setRawText(sample);
      }
    }
  };

  const exportCurrentData = () => {
    if (activeTab === 'teams') {
      const data = existingTeamResults.map((tr) => ({
        rank: tr.rank,
        team: tr.team?.name || tr.teamId,
        tag: tr.shortCode || tr.team?.tag,
        placePoints: tr.placePoints,
        elimsPoints: tr.elimsPoints,
        totalPoints: tr.totalPoints,
        damage: tr.damage,
        survivalTime: tr.survivalTime,
        smokesUsed: tr.smokesUsed,
        grenadesUsed: tr.grenadesUsed,
        molotovsUsed: tr.molotovsUsed,
        rescues: tr.rescues,
      }));
      setPasteMode('json');
      setRawText(JSON.stringify(data, null, 2));
    } else {
      const data = existingPlayerStats.map((ps) => ({
        player: ps.player?.ign || ps.playerId,
        team: ps.team?.name || ps.teamId,
        elims: ps.playerElims,
        damage: ps.damage,
        headshots: ps.headshots,
        assists: ps.assists,
        knockouts: ps.knockouts,
        longestElim: ps.longestElim,
        isMvp: ps.isMvp,
        powerplay: ps.playerPowerplay,
        survivalTime: ps.survivalTime,
        healing: ps.healing,
        damageReceived: ps.damageReceived,
        vehicleElims: ps.vehicleElims,
        grenadeElims: ps.grenadeElims,
      }));
      setPasteMode('json');
      setRawText(JSON.stringify(data, null, 2));
    }
  };

  // -------------------------------------------------------------
  // Manual Override in Preview
  // -------------------------------------------------------------
  const updateParsedTeamRow = (index: number, patch: any) => {
    setParsedTeamRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      if (patch.teamId) {
        const t = allTeams.find((item) => item.id === patch.teamId);
        if (t) {
          copy[index].teamName = t.name;
          copy[index].shortCode = t.tag || '';
          copy[index].isMatched = true;
        }
      }
      return copy;
    });
  };

  const updateParsedPlayerRow = (index: number, patch: any) => {
    setParsedPlayerRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      if (patch.playerId) {
        const p = allPlayers.find((item) => item.id === patch.playerId);
        if (p) {
          copy[index].playerIgn = p.ign;
          copy[index].isPlayerMatched = true;
          if (p.currentTeamId && !copy[index].teamId) {
            copy[index].teamId = p.currentTeamId;
            const t = allTeams.find((item) => item.id === p.currentTeamId);
            if (t) {
              copy[index].teamName = t.name;
              copy[index].shortCode = t.tag || '';
              copy[index].isTeamMatched = true;
            }
          }
        }
      }
      if (patch.teamId) {
        const t = allTeams.find((item) => item.id === patch.teamId);
        if (t) {
          copy[index].teamName = t.name;
          copy[index].shortCode = t.tag || '';
          copy[index].isTeamMatched = true;
        }
      }
      return copy;
    });
  };

  // -------------------------------------------------------------
  // Submit Batch to Server Action
  // -------------------------------------------------------------
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.set('matchId', matchId);
      formData.set('matchGameId', matchGameId);
      formData.set('replaceExisting', replaceExisting ? 'true' : 'false');

      if (activeTab === 'teams') {
        if (parsedTeamRows.length === 0) {
          throw new Error('Please paste or enter at least 1 team result row.');
        }

        const unmapped = parsedTeamRows.filter((r) => !r.teamId);
        if (unmapped.length > 0) {
          throw new Error(
            `Unable to save: ${unmapped.length} team(s) could not be matched ("${unmapped
              .map((u) => u.rawInput)
              .slice(0, 3)
              .join('", "')}"). Please select the matching team from the dropdown in the preview table below.`
          );
        }

        formData.set('rowsJson', JSON.stringify(parsedTeamRows));
        await importTeamResultsAction(formData);
      } else {
        if (parsedPlayerRows.length === 0) {
          throw new Error('Please paste or enter at least 1 player stat row.');
        }

        const unmapped = parsedPlayerRows.filter((r) => !r.playerId);
        if (unmapped.length > 0) {
          throw new Error(
            `Unable to save: ${unmapped.length} player(s) could not be matched ("${unmapped
              .map((u) => u.rawPlayer)
              .slice(0, 3)
              .join('", "')}"). Please select the matching player from the dropdown in the preview table below.`
          );
        }

        formData.set('rowsJson', JSON.stringify(parsedPlayerRows));
        await importPlayerStatsAction(formData);
      }

      setRawText('');
      setParsedTeamRows([]);
      setParsedPlayerRows([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import batch scorecard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-5 shadow-md space-y-5">
      {/* Header with Mode Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-(--ed-blue)/10 text-(--ed-blue) dark:text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Fast Excel Table &amp; JSON Batch Importer
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Copy and paste scoresheets directly from Excel / Google Sheets or duplicate standings from another match.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle: Team Standings vs Player Fraggers */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('teams');
              setRawText('');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-white dark:bg-slate-800 text-(--ed-blue) dark:text-blue-400 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Team Standings ({existingTeamResults.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('players');
              setRawText('');
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'players'
                ? 'bg-white dark:bg-slate-800 text-(--ed-blue) dark:text-blue-400 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Player Stats ({existingPlayerStats.length})</span>
          </button>
        </div>
      </div>

      {/* ═══ REUSE / DUPLICATE STANDINGS FROM ANOTHER MATCH ═══ */}
      {otherMatches && otherMatches.length > 0 && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border border-blue-200/60 dark:border-blue-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-(--ed-blue) text-white">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>Duplicate Standings from Previous Match</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold uppercase">
                  Time Saver
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Reuse the 16 participating teams and rosters from another match in 1 click.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCloneMatchId}
              onChange={(e) => setSelectedCloneMatchId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer min-w-[200px]"
            >
              <option value="">Select source match…</option>
              {otherMatches
                .filter((m) => m.id !== matchId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.format} ({m.teamResults?.length || 0} teams)
                  </option>
                ))}
            </select>

            <select
              value={cloneMode}
              onChange={(e) => setCloneMode(e.target.value as any)}
              className="px-2 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="reset">Clean Roster (Reset Stats &amp; Points)</option>
              <option value="exact">Exact Clone (Keep All Stats)</option>
            </select>

            <button
              type="button"
              disabled={!selectedCloneMatchId}
              onClick={handleCloneFromMatch}
              className="px-3 py-1.5 rounded-lg bg-(--ed-blue) hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy {activeTab === 'teams' ? 'Teams' : 'Players'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Format Switcher & Quick Helper Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Input Mode:</span>
          <button
            type="button"
            onClick={() => setPasteMode('excel')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              pasteMode === 'excel'
                ? 'bg-(--ed-blue) text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Excel / TSV</span>
          </button>
          <button
            type="button"
            onClick={() => setPasteMode('json')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              pasteMode === 'json'
                ? 'bg-(--ed-blue) text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setPasteMode('ocr')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              pasteMode === 'ocr'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>📷 Scorecard OCR Reader</span>
          </button>
        </div>

        {/* Quick actions: Copy Template, Load Sample, Export */}
        <div className="flex items-center gap-2">
          {pasteMode !== 'ocr' && (
            <>
              <button
                type="button"
                onClick={copyExcelTemplate}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-(--ed-blue) transition-colors font-medium flex items-center gap-1 text-[11px]"
                title="Copy column header row for Excel"
              >
                {copiedTemplate ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedTemplate ? 'Headers Copied!' : 'Copy Headers'}</span>
              </button>
              <button
                type="button"
                onClick={loadSampleData}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors font-medium flex items-center gap-1 text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Load Sample</span>
              </button>
            </>
          )}
          {(existingTeamResults.length > 0 || existingPlayerStats.length > 0) && (
            <button
              type="button"
              onClick={exportCurrentData}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-colors font-medium flex items-center gap-1 text-[11px]"
            >
              <Code2 className="w-3 h-3 text-blue-500" />
              <span>Export Current ({activeTab === 'teams' ? existingTeamResults.length : existingPlayerStats.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── SCREENSHOT OCR READER PANEL ─── */}
      {pasteMode === 'ocr' && (
        <div className="space-y-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" /> Scorecard Screenshot OCR Reader
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload a tournament broadcast scorecard or press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Ctrl+V</kbd> to paste directly from your clipboard.
              </p>
            </div>
            <span className="text-[10px] font-normal text-slate-400 self-start sm:self-auto">
              {parsedTeamRows.length} team row(s) detected
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            id="scorecard-ocr-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/bmp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleOcrFile(file);
            }}
          />

          {!ocrImage ? (
            <label
              htmlFor="scorecard-ocr-input"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-xl cursor-pointer bg-white/50 dark:bg-slate-900/40 hover:bg-emerald-500/5 transition-all text-center group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Click to browse or drop scorecard screenshot
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports PNG, JPG, WebP. You can also press <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ctrl+V</span> anywhere!
              </p>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row items-center gap-4 bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ocrImage}
                  alt="Scorecard preview"
                  className="max-h-44 max-w-full md:max-w-xs object-contain rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs"
                />
                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-500" /> Scorecard Image Ready
                    </span>
                    <label
                      htmlFor="scorecard-ocr-input"
                      className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 cursor-pointer underline"
                    >
                      Change image
                    </label>
                  </div>

                  {isScanningOcr ? (
                    <div className="space-y-1.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {ocrStatus || 'Scanning...'}
                        </span>
                        <span>{ocrProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-200 rounded-full"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={runOcrScan}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{rawOcrText ? 'Re-scan Scorecard' : 'Scan & Extract Data'}</span>
                      </button>
                      {ocrStatus && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {ocrStatus}
                        </span>
                      )}
                    </div>
                  )}

                  {rawOcrText && (
                    <details className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <summary className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 font-medium">
                        View Raw Recognized OCR Text
                      </summary>
                      <pre className="mt-1.5 p-2 rounded bg-slate-100 dark:bg-slate-950 font-mono text-[10px] overflow-x-auto max-h-32">
                        {rawOcrText}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── EXCEL / JSON STANDARD PASTE BOX ─── */}
      {(pasteMode === 'excel' || pasteMode === 'json') && (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>
              Paste {activeTab === 'teams' ? 'Team Standings' : 'Player Fragger Stats'} (
              {pasteMode === 'excel' ? 'Select & Copy Cells from Excel / Google Sheets' : 'JSON Array'}):
            </span>
            <span className="text-[10px] font-normal text-slate-400">
              {activeTab === 'teams'
                ? `${parsedTeamRows.length} team row(s) detected`
                : `${parsedPlayerRows.length} player row(s) detected`}
            </span>
          </label>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              activeTab === 'teams'
                ? pasteMode === 'excel'
                  ? `Paste Excel columns directly here (e.g. Rank \\t Team \\t PlacePts \\t Elims \\t Damage...)\nExample:\n1\tTeam Soul\t10\t12\t22\t2450\n2\tGodLike\t6\t8\t14\t1820`
                  : `[\n  { "rank": 1, "team": "Team Soul", "placePoints": 10, "elimsPoints": 12, "damage": 2450, "wwcd": true },\n  { "rank": 2, "team": "GodLike", "placePoints": 6, "elimsPoints": 8, "damage": 1820 }\n]`
                : pasteMode === 'excel'
                ? `Paste Excel columns directly here (e.g. Player \\t Team \\t Elims \\t Damage \\t Headshots \\t Assists \\t Knocks \\t Powerplay \\t LongestElim \\t MVP \\t Survival \\t Healing \\t DmgReceived \\t VehicleElims \\t GrenadeElims)\nExample:\nMortal\tTeam Soul\t5\t1120\t3\t2\t4\t2\t245.5\tYes\t28:00\t350\t420\t1\t2`
                : `[\n  { "player": "Mortal", "team": "Team Soul", "elims": 5, "damage": 1120, "headshots": 3, "survivalTime": 1680, "healing": 350, "damageReceived": 420, "vehicleElims": 1, "grenadeElims": 2, "isMvp": true }\n]`
            }
            className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-(--ed-blue) focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ═══ LIVE PREVIEW TABLE FOR TEAMS ═══ */}
      {activeTab === 'teams' && parsedTeamRows.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Table className="w-4 h-4 text-(--ed-blue)" /> Live Team Results Preview ({parsedTeamRows.length} Teams)
            </h3>
            <span className="text-[10px] text-slate-400">
              {parsedTeamRows.filter((r) => r.isMatched).length} / {parsedTeamRows.length} teams auto-matched
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-2 text-center w-12">Rank</th>
                  <th className="py-2 px-3 text-left">Pasted Name</th>
                  <th className="py-2 px-3 text-left">Matched Team in Database</th>
                  <th className="py-2 px-2 text-center">Place Pts</th>
                  <th className="py-2 px-2 text-center">Elims</th>
                  <th className="py-2 px-2 text-center font-bold text-(--ed-blue)">Total</th>
                  <th className="py-2 px-2 text-center">Damage</th>
                  <th className="py-2 px-2 text-center">Survival</th>
                  <th className="py-2 px-2 text-center">Smokes</th>
                  <th className="py-2 px-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#0b101c]">
                {parsedTeamRows.map((r, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      !r.teamId ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-1.5 px-2 text-center font-mono font-bold">
                      #{r.rank} {r.wwcd && <span title="WWCD Winner">🍗</span>}
                    </td>
                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {r.rawInput}
                    </td>
                    <td className="py-1.5 px-3 min-w-[220px]">
                      <SearchableSelect
                        options={teamSelectOptions}
                        searchUrl="/api/admin/search?type=team"
                        value={r.teamId}
                        onChange={(val) => updateParsedTeamRow(idx, { teamId: val })}
                        placeholder="⚠️ Select Matching Team…"
                        size="admin"
                        triggerClassName={
                          r.teamId
                            ? '!border-emerald-500/40 !bg-emerald-500/5 !text-emerald-700 dark:!text-emerald-300 font-bold'
                            : '!border-amber-500 !bg-amber-50 dark:!bg-amber-950/40 !text-amber-800 dark:!text-amber-300'
                        }
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono">{r.placePoints}</td>
                    <td className="py-1.5 px-2 text-center font-mono">{r.elimsPoints}</td>
                    <td className="py-1.5 px-2 text-center font-mono font-black text-(--ed-blue) dark:text-blue-400">
                      {r.totalPoints}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-500">{r.damage ?? '—'}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">
                      {r.survivalTime != null
                        ? `${Math.floor(r.survivalTime / 60)}:${String(r.survivalTime % 60).padStart(2, '0')}`
                        : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">{r.smokesUsed ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => setParsedTeamRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ LIVE PREVIEW TABLE FOR PLAYERS (WITH ALL 5 EXTRA STATS) ═══ */}
      {activeTab === 'players' && parsedPlayerRows.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-(--ed-blue)" /> Live Player Stats Preview ({parsedPlayerRows.length} Players)
            </h3>
            <span className="text-[10px] text-slate-400">
              {parsedPlayerRows.filter((r) => r.isPlayerMatched).length} / {parsedPlayerRows.length} players auto-matched
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs min-w-[1050px]">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 text-left">Pasted IGN</th>
                  <th className="py-2 px-3 text-left">Matched Player in DB</th>
                  <th className="py-2 px-3 text-left">Assigned Team</th>
                  <th className="py-2 px-2 text-center font-bold text-rose-500">Elims</th>
                  <th className="py-2 px-2 text-center">Damage</th>
                  <th className="py-2 px-2 text-center">Survival</th>
                  <th className="py-2 px-2 text-center">Healing</th>
                  <th className="py-2 px-2 text-center">Dmg Rec</th>
                  <th className="py-2 px-2 text-center">Veh Elims</th>
                  <th className="py-2 px-2 text-center">Nade Elims</th>
                  <th className="py-2 px-2 text-center">Headshots</th>
                  <th className="py-2 px-2 text-center">Assists</th>
                  <th className="py-2 px-2 text-center">Knocks</th>
                  <th className="py-2 px-2 text-center">MVP</th>
                  <th className="py-2 px-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-[#0b101c]">
                {parsedPlayerRows.map((r, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      !r.playerId ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {r.rawPlayer}
                    </td>
                    <td className="py-1.5 px-3 min-w-[210px]">
                      <SearchableSelect
                        options={playerSelectOptions}
                        searchUrl="/api/admin/search?type=player"
                        value={r.playerId}
                        onChange={(val) => updateParsedPlayerRow(idx, { playerId: val })}
                        placeholder="⚠️ Select Matching Player…"
                        size="admin"
                        triggerClassName={
                          r.playerId
                            ? '!border-emerald-500/40 !bg-emerald-500/5 !text-emerald-700 dark:!text-emerald-300 font-bold'
                            : '!border-amber-500 !bg-amber-50 dark:!bg-amber-950/40 !text-amber-800 dark:!text-amber-300'
                        }
                      />
                    </td>
                    <td className="py-1.5 px-3 min-w-[190px]">
                      <SearchableSelect
                        options={teamSelectOptions}
                        value={r.teamId}
                        onChange={(val) => updateParsedPlayerRow(idx, { teamId: val })}
                        placeholder="(Optional Team)"
                        size="admin"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-black text-rose-600 dark:text-rose-400">
                      {r.playerElims}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">{r.damage ?? '—'}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-500">
                      {r.survivalTime != null
                        ? `${Math.floor(r.survivalTime / 60)}:${String(r.survivalTime % 60).padStart(2, '0')}`
                        : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-emerald-600 dark:text-emerald-400">
                      {r.healing ?? '—'}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-amber-600 dark:text-amber-400">
                      {r.damageReceived ?? '—'}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-purple-600 dark:text-purple-400">
                      {r.vehicleElims ?? '—'}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-orange-600 dark:text-orange-400">
                      {r.grenadeElims ?? '—'}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">{r.headshots ?? '—'}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">{r.assists ?? '—'}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">{r.knockouts ?? '—'}</td>
                    <td className="py-1.5 px-2 text-center">{r.isMvp ? '⭐' : '—'}</td>
                    <td className="py-1.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => setParsedPlayerRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions & Submit Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
            className="rounded border-slate-300 text-(--ed-blue) focus:ring-(--ed-blue)"
          />
          <span>
            Replace &amp; overwrite all existing {activeTab === 'teams' ? 'team results' : 'player stats'} for this match
          </span>
        </label>

        <button
          type="button"
          disabled={
            isSubmitting ||
            (activeTab === 'teams' ? parsedTeamRows.length === 0 : parsedPlayerRows.length === 0)
          }
          onClick={handleBatchSubmit}
          className="px-6 py-2.5 rounded-xl bg-(--ed-blue) hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-(--ed-blue)/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving Scorecard…</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>
                Save Batch {activeTab === 'teams' ? `${parsedTeamRows.length} Teams` : `${parsedPlayerRows.length} Players`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
