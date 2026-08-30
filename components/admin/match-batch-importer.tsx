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
} from 'lucide-react';
import { getPlacementPoints, computeTotalPoints, computeUtilitiesTotal, computeTotalDistance } from '@/lib/tournament-math';

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
}: MatchBatchImporterProps) {
  const [activeTab, setActiveTab] = React.useState<'teams' | 'players'>('teams');
  const [pasteMode, setPasteMode] = React.useState<'excel' | 'json'>('excel');
  const [rawText, setRawText] = React.useState('');
  const [replaceExisting, setReplaceExisting] = React.useState(true);
  const [copiedTemplate, setCopiedTemplate] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

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
      return allTeams.find((t) => {
        const tName = t.name.toLowerCase();
        const tTag = (t.tag || '').toLowerCase();
        return (
          tName === clean ||
          tTag === clean ||
          tName.includes(clean) ||
          clean.includes(tName) ||
          (tTag && clean.includes(tTag))
        );
      });
    },
    [allTeams]
  );

  const findMatchingPlayer = React.useCallback(
    (ign: string, teamHint?: string): PlayerOption | undefined => {
      if (!ign) return undefined;
      const clean = ign.trim().toLowerCase();
      // First exact match
      const exact = allPlayers.find((p) => p.ign.toLowerCase() === clean);
      if (exact) return exact;

      // Second match without team tags (e.g. "SoulMortal" -> "Mortal")
      const sub = allPlayers.find((p) => {
        const pIgn = p.ign.toLowerCase();
        return clean.includes(pIgn) || pIgn.includes(clean);
      });
      return sub;
    },
    [allPlayers]
  );

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
            const isWwcd = item.wwcd === true || rank === 1;
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
              damage: Number(item.damage || 0),
              survivalTime: Number(item.survivalTime || 1680),
              healing: Number(item.healing || 0),
              damageReceived: Number(item.damageReceived || 0),
              headshots: Number(item.headshots || 0),
              assists: Number(item.assists || 0),
              knockouts: Number(item.knockouts || 0),
              longestElim: Number(item.longestElim || 0),
              vehicleElims: Number(item.vehicleElims || 0),
              grenadeElims: Number(item.grenadeElims || 0),
              smokesUsed: Number(item.smokesUsed || 0),
              grenadesUsed: Number(item.grenadesUsed || 0),
              molotovsUsed: Number(item.molotovsUsed || 0),
              flashUsed: Number(item.flashUsed || 0),
              airdrops: Number(item.airdrops || 0),
              rescues: Number(item.rescues || 0),
              distDrove: Number(item.distDrove || 0),
              distWalk: Number(item.distWalk || 0),
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
        });
      }

      const dataLines = hasHeader ? lines.slice(1) : lines;
      const rows = dataLines.map((line, idx) => {
        const tokens = line.split(delimiter).map((t) => t.trim());

        // Default standard positional mapping if no recognized headers:
        // Col 0: Rank, Col 1: Team Name, Col 2: Place Pts, Col 3: Elims, Col 4: Total Pts, Col 5: Damage...
        let rank = idx + 1;
        let rawTeam = '';
        let placePts: number | null = null;
        let elims = 0;
        let totalPts: number | null = null;
        let damage = 0;
        let survival = 1680;
        let smokes = 0;
        let grenades = 0;
        let molotovs = 0;
        let rescues = 0;

        if (hasHeader && colTeam !== -1) {
          rawTeam = tokens[colTeam] || '';
          if (colRank !== -1 && !isNaN(Number(tokens[colRank]))) rank = Number(tokens[colRank]);
          if (colPlace !== -1 && !isNaN(Number(tokens[colPlace]))) placePts = Number(tokens[colPlace]);
          if (colElims !== -1 && !isNaN(Number(tokens[colElims]))) elims = Number(tokens[colElims]);
          if (colTotal !== -1 && !isNaN(Number(tokens[colTotal]))) totalPts = Number(tokens[colTotal]);
          if (colDamage !== -1 && !isNaN(Number(tokens[colDamage]))) damage = Number(tokens[colDamage]);
          if (colSurvival !== -1) {
            const rawS = tokens[colSurvival];
            if (rawS?.includes(':')) {
              const [m, s] = rawS.split(':').map(Number);
              survival = (m || 0) * 60 + (s || 0);
            } else if (!isNaN(Number(rawS))) {
              survival = Number(rawS);
            }
          }
          if (colSmokes !== -1 && !isNaN(Number(tokens[colSmokes]))) smokes = Number(tokens[colSmokes]);
          if (colGrenades !== -1 && !isNaN(Number(tokens[colGrenades]))) grenades = Number(tokens[colGrenades]);
          if (colMolotovs !== -1 && !isNaN(Number(tokens[colMolotovs]))) molotovs = Number(tokens[colMolotovs]);
          if (colRescues !== -1 && !isNaN(Number(tokens[colRescues]))) rescues = Number(tokens[colRescues]);
        } else {
          // Positional fallback:
          // Check if first token is a rank number
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

        const isWwcd = rank === 1;
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
          placePoints: finalPlacePts,
          elimsPoints: finalElimsPts,
          bonusPoints: 0,
          totalPoints: finalTotalPts,
          damage,
          survivalTime: survival,
          healing: 0,
          damageReceived: 0,
          headshots: 0,
          assists: 0,
          knockouts: 0,
          longestElim: 0,
          vehicleElims: 0,
          grenadeElims: 0,
          smokesUsed: smokes,
          grenadesUsed: grenades,
          molotovsUsed: molotovs,
          flashUsed: 0,
          airdrops: 0,
          rescues,
          distDrove: 0,
          distWalk: 0,
          isMatched: Boolean(matchedTeam),
        };
      });

      setParsedTeamRows(rows);
    },
    [pasteMode, findMatchingTeam, pointsMatrix, killMultiplier]
  );

  // -------------------------------------------------------------
  // Parse Excel / TSV / CSV / JSON for Player Stats
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
            const matchedTeam = findMatchingTeam(rawTeam) || (matchedPlayer?.currentTeamId ? allTeams.find(t => t.id === matchedPlayer.currentTeamId) : undefined);

            const elims = Number(item.playerElims || item.elims || item.kills || 0);
            const damage = Number(item.damage || 0);
            const headshots = Number(item.headshots || 0);
            const assists = Number(item.assists || 0);
            const knockouts = Number(item.knockouts || 0);
            const longestElim = Number(item.longestElim || 0);
            const isMvp = item.isMvp === true || item.mvp === true;
            const powerplay = Number(item.playerPowerplay || item.powerplay || 0);

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

      if (hasHeader) {
        firstLineTokens.forEach((t, idx) => {
          if (t.includes('player') || t === 'ign' || t === 'name') colPlayer = idx;
          else if (t.includes('team') || t.includes('clan') || t === 'tag') colTeam = idx;
          else if (t.includes('elim') || t.includes('kill') || t === 'kp' || t === 'finishes') colElims = idx;
          else if (t.includes('dmg') || t.includes('damage')) colDamage = idx;
          else if (t.includes('head') || t === 'hs') colHeadshots = idx;
          else if (t.includes('assist') || t === 'ast') colAssists = idx;
          else if (t.includes('knock') || t.includes('dbno')) colKnocks = idx;
          else if (t.includes('power') || t.includes('zone1')) colPowerplay = idx;
          else if (t.includes('long') || t.includes('dist')) colLongElim = idx;
          else if (t.includes('mvp') || t.includes('star')) colMvp = idx;
        });
      }

      const dataLines = hasHeader ? lines.slice(1) : lines;
      const rows = dataLines.map((line) => {
        const tokens = line.split(delimiter).map((t) => t.trim());

        let rawPlayer = '';
        let rawTeam = '';
        let elims = 0;
        let damage = 0;
        let headshots = 0;
        let assists = 0;
        let knockouts = 0;
        let powerplay = 0;
        let longestElim = 0;
        let isMvp = false;

        if (hasHeader && colPlayer !== -1) {
          rawPlayer = tokens[colPlayer] || '';
          if (colTeam !== -1) rawTeam = tokens[colTeam] || '';
          if (colElims !== -1 && !isNaN(Number(tokens[colElims]))) elims = Number(tokens[colElims]);
          if (colDamage !== -1 && !isNaN(Number(tokens[colDamage]))) damage = Number(tokens[colDamage]);
          if (colHeadshots !== -1 && !isNaN(Number(tokens[colHeadshots]))) headshots = Number(tokens[colHeadshots]);
          if (colAssists !== -1 && !isNaN(Number(tokens[colAssists]))) assists = Number(tokens[colAssists]);
          if (colKnocks !== -1 && !isNaN(Number(tokens[colKnocks]))) knockouts = Number(tokens[colKnocks]);
          if (colPowerplay !== -1 && !isNaN(Number(tokens[colPowerplay]))) powerplay = Number(tokens[colPowerplay]);
          if (colLongElim !== -1 && !isNaN(Number(tokens[colLongElim]))) longestElim = Number(tokens[colLongElim]);
          if (colMvp !== -1) {
            const mvpVal = (tokens[colMvp] || '').toLowerCase();
            isMvp = mvpVal === 'yes' || mvpVal === 'true' || mvpVal === '1' || mvpVal === 'mvp' || mvpVal === '⭐';
          }
        } else {
          // Positional fallback:
          // Col 0: Player IGN, Col 1: Team, Col 2: Elims, Col 3: Damage, Col 4: Headshots, Col 5: Knockouts...
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
  // Copy Templates & Sample Data
  // -------------------------------------------------------------
  const copyExcelTemplate = () => {
    let headers = '';
    if (activeTab === 'teams') {
      headers = 'Rank\tTeam\tPlace Pts\tElims\tTotal Pts\tDamage\tSurvival\tSmokes\tGrenades\tRescues';
    } else {
      headers = 'Player\tTeam\tElims\tDamage\tHeadshots\tAssists\tKnockouts\tPowerplay\tLongest Elim\tMVP';
    }
    navigator.clipboard.writeText(headers);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const loadSampleData = () => {
    if (activeTab === 'teams') {
      if (pasteMode === 'json') {
        const sampleJson = [
          { rank: 1, team: allTeams[0]?.name || 'Team Soul', elims: 12, damage: 2450, wwcd: true, smokesUsed: 8 },
          { rank: 2, team: allTeams[1]?.name || 'GodLike Esports', elims: 8, damage: 1820, wwcd: false, smokesUsed: 6 },
          { rank: 3, team: allTeams[2]?.name || 'Entity Gaming', elims: 6, damage: 1400, wwcd: false, smokesUsed: 5 },
          { rank: 4, team: allTeams[3]?.name || 'Team XSpark', elims: 5, damage: 1250, wwcd: false, smokesUsed: 4 },
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
          { player: allPlayers[0]?.ign || 'Mortal', team: allTeams[0]?.name || 'Team Soul', elims: 5, damage: 1120, headshots: 3, knockouts: 4, isMvp: true },
          { player: allPlayers[1]?.ign || 'Jonathan', team: allTeams[1]?.name || 'GodLike Esports', elims: 4, damage: 980, headshots: 2, knockouts: 3, isMvp: false },
          { player: allPlayers[2]?.ign || 'SprayGod', team: allTeams[3]?.name || 'Team XSpark', elims: 3, damage: 720, headshots: 1, knockouts: 2, isMvp: false },
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
        const sample = `Player\tTeam\tElims\tDamage\tHeadshots\tAssists\tKnockouts\tPowerplay\tLongest Elim\tMVP\n${p1}\t${t1}\t5\t1120\t3\t2\t4\t2\t245.5\tYes\n${p2}\t${t2}\t4\t980\t2\t3\t3\t1\t180.2\tNo\n${p3}\t${t3}\t3\t720\t1\t1\t2\t0\t150.0\tNo\n${p4}\t${t3}\t2\t590\t1\t2\t2\t1\t120.4\tNo`;
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

        // Validate that all rows have a valid teamId (or warn)
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
            <span className="p-1.5 rounded-lg bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Fast Excel Table &amp; JSON Batch Importer
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Copy and paste entire scoresheets directly from Excel or Google Sheets in 1 click.
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
                ? 'bg-white dark:bg-slate-800 text-[#0A5FC4] dark:text-blue-400 shadow-sm font-black'
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
                ? 'bg-white dark:bg-slate-800 text-[#0A5FC4] dark:text-blue-400 shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Player Stats ({existingPlayerStats.length})</span>
          </button>
        </div>
      </div>

      {/* Format Switcher & Quick Helper Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Input Format:</span>
          <button
            type="button"
            onClick={() => setPasteMode('excel')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              pasteMode === 'excel'
                ? 'bg-[#0A5FC4] text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Excel / Sheets (TSV / CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => setPasteMode('json')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              pasteMode === 'json'
                ? 'bg-[#0A5FC4] text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON Array</span>
          </button>
        </div>

        {/* Quick actions: Copy Template, Load Sample, Export */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyExcelTemplate}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#0A5FC4] transition-colors font-medium flex items-center gap-1 text-[11px]"
            title="Copy column header row for Excel"
          >
            {copiedTemplate ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedTemplate ? 'Headers Copied!' : 'Copy Excel Headers'}</span>
          </button>
          <button
            type="button"
            onClick={loadSampleData}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors font-medium flex items-center gap-1 text-[11px]"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Load Sample Data</span>
          </button>
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

      {/* Paste Box */}
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
              ? `Paste Excel columns directly here (e.g. Player \\t Team \\t Elims \\t Damage \\t Headshots...)\nExample:\nMortal\tTeam Soul\t5\t1120\t3\t2\t4\nJonathan\tGodLike\t4\t980\t2\t3\t3`
              : `[\n  { "player": "Mortal", "team": "Team Soul", "elims": 5, "damage": 1120, "headshots": 3, "isMvp": true },\n  { "player": "Jonathan", "team": "GodLike", "elims": 4, "damage": 980, "headshots": 2 }\n]`
          }
          className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0A5FC4] focus:bg-white dark:focus:bg-slate-900 transition-all"
        />
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ═══ LIVE PREVIEW TABLE ═══ */}
      {activeTab === 'teams' && parsedTeamRows.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Table className="w-4 h-4 text-[#0A5FC4]" /> Live Team Results Preview ({parsedTeamRows.length} Teams)
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
                  <th className="py-2 px-2 text-center font-bold text-[#0A5FC4]">Total</th>
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
                    <td className="py-1.5 px-3">
                      <select
                        value={r.teamId}
                        onChange={(e) => updateParsedTeamRow(idx, { teamId: e.target.value })}
                        className={`w-full px-2 py-1 rounded-lg text-xs border font-medium cursor-pointer ${
                          r.teamId
                            ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        <option value="">⚠️ Select Matching Team…</option>
                        {allTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.tag ? `[${t.tag}]` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono">{r.placePoints}</td>
                    <td className="py-1.5 px-2 text-center font-mono">{r.elimsPoints}</td>
                    <td className="py-1.5 px-2 text-center font-mono font-black text-[#0A5FC4] dark:text-blue-400">
                      {r.totalPoints}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-500">{r.damage}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">
                      {Math.floor(r.survivalTime / 60)}:{(r.survivalTime % 60).toString().padStart(2, '0')}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">{r.smokesUsed}</td>
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

      {/* ═══ LIVE PREVIEW TABLE FOR PLAYERS ═══ */}
      {activeTab === 'players' && parsedPlayerRows.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#0A5FC4]" /> Live Player Stats Preview ({parsedPlayerRows.length} Players)
            </h3>
            <span className="text-[10px] text-slate-400">
              {parsedPlayerRows.filter((r) => r.isPlayerMatched).length} / {parsedPlayerRows.length} players auto-matched
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 text-left">Pasted IGN</th>
                  <th className="py-2 px-3 text-left">Matched Player in DB</th>
                  <th className="py-2 px-3 text-left">Assigned Team</th>
                  <th className="py-2 px-2 text-center font-bold text-rose-500">Elims</th>
                  <th className="py-2 px-2 text-center">Damage</th>
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
                    <td className="py-1.5 px-3">
                      <select
                        value={r.playerId}
                        onChange={(e) => updateParsedPlayerRow(idx, { playerId: e.target.value })}
                        className={`w-full px-2 py-1 rounded-lg text-xs border font-medium cursor-pointer ${
                          r.playerId
                            ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        <option value="">⚠️ Select Matching Player…</option>
                        {allPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.ign} {p.currentTeam?.tag ? `[${p.currentTeam.tag}]` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-3">
                      <select
                        value={r.teamId}
                        onChange={(e) => updateParsedPlayerRow(idx, { teamId: e.target.value })}
                        className="w-full px-2 py-1 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                      >
                        <option value="">(Optional Team)</option>
                        {allTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-black text-rose-600 dark:text-rose-400">
                      {r.playerElims}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">{r.damage}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">{r.headshots}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">{r.assists}</td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-400">{r.knockouts}</td>
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
            className="rounded border-slate-300 text-[#0A5FC4] focus:ring-[#0A5FC4]"
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
          className="px-6 py-2.5 rounded-xl bg-[#0A5FC4] hover:bg-[#0850a3] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-[#0A5FC4]/25 flex items-center justify-center gap-2 cursor-pointer"
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
