'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Code2,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Shield,
  Trash2,
  Trophy,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Users,
  Swords,
  XCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import {
  bulkUniversalMatchImportAction,
  bulkUniversalPlayerMatchImportAction,
  type BulkUniversalRowInput,
  type BulkUniversalPlayerRowInput,
  type BulkUniversalImportResult,
  type BulkUniversalPlayerImportResult,
} from '@/app/admin/(panel)/matches/matrix/actions';
import { parseWwcd } from '@/lib/tournament-math';

const USER_EXACT_TEAM_HEADERS =
  'Tournament\tStage\tDate\tTimeFormat\tTime\tOverallMatch\tStageMatch\tMap\tGroup\tType\tteam\trank\twwcd\tplacePoints\telims\tbonusPoints\ttotalPoints\tsurvivalTime\tdamage\thealing\tdamageReceived\theadshots\tassists\tknockouts\tlongestElim\tvehicleElims\tgrenadeElims\tsmokesUsed\tgrenadesUsed\tmolotovsUsed\tflashUsed\tairdrops\trescues\tdistDrove\tdistWalk';

const USER_EXACT_PLAYER_HEADERS =
  'Tournament\tStage\tDate\tTimeFormat\tTime\tOverallMatch\tStageMatch\tMap\tGroup\tType\tplayer\tteam\trole\telims\tteam_rank\tteam_wwcd\tteam_place\tteam_elims\tteam_total\tdamage\tsurvivalTime\thealing\tdamageReceived\theadshots\tassists\tknockouts\tlongestElim\tvehicleElims\tgrenadeElims\tsmokesUsed\tgrenadesUsed\tmolotovsUsed\tflashUsed\tutilities\tairdrops\trescues\tdistDrove\tdistWalk\ttotal_dist\tplayerPowerplay\tisMvp';

const SAMPLE_TEAM_EXCEL_DATA = `${USER_EXACT_TEAM_HEADERS}
BMPS 2024\tGrand Finals\t14-08-2026\tIST\t15:40 IST\t1\t1\tErangel\tGroup A\tOnline\tTeam Soul\t1\ttrue\t10\t9\t0\t19\t1680\t1450\t250\t600\t4\t3\t5\t180\t0\t2\t4\t2\t1\t0\t1\t2\t450\t890
BMPS 2024\tGrand Finals\t14-08-2026\tIST\t15:40 IST\t1\t1\tErangel\tGroup A\tOnline\tGodLike Esports\t2\tfalse\t6\t6\t0\t12\t1520\t1100\t180\t750\t2\t2\t4\t120\t0\t1\t3\t1\t0\t0\t0\t1\t320\t750
BMPS 2024\tGrand Finals\t14-08-2026\tIST\t15:40 IST\t1\t1\tErangel\tGroup A\tOnline\tTeam XSpark\t3\tfalse\t5\t4\t0\t9\t1380\t890\t120\t820\t1\t1\t2\t95\t0\t0\t2\t2\t1\t0\t0\t0\t280\t610
BMPS 2024\tGrand Finals\t14-08-2026\tIST\t16:25 IST\t2\t2\tMiramar\tGroup A\tOnline\tTeam XSpark\t1\ttrue\t10\t8\t0\t18\t1680\t1320\t200\t550\t3\t2\t4\t210\t1\t1\t3\t2\t1\t0\t1\t1\t580\t920`;

const SAMPLE_PLAYER_EXCEL_DATA = `${USER_EXACT_PLAYER_HEADERS}
BMPS 2024\tGrand Finals\t14-08-2026\tIST\t15:40 IST\t1\t1\tErangel\tGroup A\tOnline\tManya\tTeam Soul\tIGL\t4\t1\ttrue\t10\t9\t19\t650\t1680\t100\t200\t2\t1\t3\t180\t0\t1\t2\t1\t1\t0\t4\t1\t1\t150\t450\t600\t2\ttrue
BMPS 2024\tGrand Finals\t14-08-2026\tIST\t15:40 IST\t1\t1\tErangel\tGroup A\tOnline\tNakul\tTeam Soul\tAssaulter\t3\t1\ttrue\t10\t9\t19\t510\t1680\t80\t180\t1\t2\t2\t120\t0\t1\t1\t1\t0\t0\t2\t0\t1\t120\t320\t440\t1\tfalse
BMPS 2024\tGrand Finals\t14-08-2026\tIST\t15:40 IST\t1\t1\tErangel\tGroup A\tOnline\tJonathan\tGodLike Esports\tAssaulter\t4\t2\tfalse\t6\t6\t12\t720\t1520\t90\t350\t2\t1\t3\t140\t0\t1\t2\t1\t0\t0\t3\t0\t0\t180\t420\t600\t1\tfalse
BMPS 2024\tGrand Finals\t14-08-2026\tIST\t15:40 IST\t1\t1\tErangel\tGroup A\tOnline\tShadow\tGodLike Esports\tIGL\t2\t2\tfalse\t6\t6\t12\t380\t1520\t90\t400\t0\t1\t1\t90\t0\t0\t1\t0\t0\t0\t1\t0\t1\t140\t330\t470\t0\tfalse`;

export interface InfluxProgressState {
  active: boolean;
  currentBatch: number;
  totalBatches: number;
  processedRows: number;
  totalRows: number;
  currentLabel: string;
  createdMatchesCount: number;
  insertedResultsCount: number;
  insertedPlayerStatsCount: number;
  errors: string[];
}

/**
 * Match/Day-aware partitioner:
 * Ensures matches are NEVER split in half!
 * Groups by Tournament + Stage + Date (matchdays of ~384 rows).
 * If no dates exist, groups by complete matches up to the target batch size.
 */
export function partitionRowsIntoBatches<T extends Record<string, any>>(
  rows: T[],
  targetBatchSize: number = 384
): Array<{ label: string; rows: T[] }> {
  if (rows.length <= targetBatchSize) {
    return [{ label: `Complete batch (${rows.length} rows)`, rows }];
  }

  // 1. Group rows by Day/Date boundary if Date is present
  const dateGroups = new Map<string, T[]>();
  let hasDates = false;

  for (const row of rows) {
    const d = (row.Date || row.date || '').trim();
    if (d) hasDates = true;
    const tourney = (row.Tournament || row.tournament || '').trim();
    const stage = (row.Stage || row.stage || '').trim();
    const key = `${tourney}__${stage}__${d || 'nodate'}`;

    if (!dateGroups.has(key)) dateGroups.set(key, []);
    dateGroups.get(key)!.push(row);
  }

  // If dataset has distinct dates, each date/stage group forms a natural batch (e.g. 1 matchday = ~384 rows)
  if (hasDates && dateGroups.size > 1) {
    const batches: Array<{ label: string; rows: T[] }> = [];
    for (const [key, groupRows] of dateGroups.entries()) {
      const parts = key.split('__');
      const d = parts[2] !== 'nodate' ? parts[2] : 'Matchday';
      const stage = parts[1] || 'Stage';
      const tourney = parts[0] || 'Tournament';

      // If a single date has > 768 rows, sub-chunk by matches so matches stay atomic
      if (groupRows.length > 768) {
        const matchGroups = new Map<string, T[]>();
        for (const r of groupRows) {
          const mNum = r.OverallMatch || r.overallMatch || r.StageMatch || r.stageMatch || r.matchNumber || '1';
          const mKey = `${mNum}`;
          if (!matchGroups.has(mKey)) matchGroups.set(mKey, []);
          matchGroups.get(mKey)!.push(r);
        }

        let currentSubBatch: T[] = [];
        let startM = '';
        let endM = '';
        for (const [mKey, mRows] of matchGroups.entries()) {
          if (currentSubBatch.length + mRows.length > targetBatchSize && currentSubBatch.length > 0) {
            batches.push({
              label: `${tourney} · ${stage} (${d}) Matches ${startM}–${endM} (${currentSubBatch.length} rows)`,
              rows: currentSubBatch,
            });
            currentSubBatch = [];
            startM = '';
          }
          if (!startM) startM = mKey;
          endM = mKey;
          currentSubBatch.push(...mRows);
        }
        if (currentSubBatch.length > 0) {
          batches.push({
            label: `${tourney} · ${stage} (${d}) Matches ${startM}–${endM} (${currentSubBatch.length} rows)`,
            rows: currentSubBatch,
          });
        }
      } else {
        batches.push({
          label: `${tourney} · ${stage} (${d}) · ${groupRows.length} rows`,
          rows: groupRows,
        });
      }
    }
    return batches;
  }

  // 2. Fallback: Group by Match (all 64 players of a match stay in the same chunk)
  const matchMap = new Map<string, T[]>();
  for (const r of rows) {
    const mNum = r.OverallMatch || r.overallMatch || r.StageMatch || r.stageMatch || r.matchNumber || '1';
    const tourney = (r.Tournament || r.tournament || '').trim();
    const stage = (r.Stage || r.stage || '').trim();
    const key = `${tourney}__${stage}__${mNum}`;
    if (!matchMap.has(key)) matchMap.set(key, []);
    matchMap.get(key)!.push(r);
  }

  const batches: Array<{ label: string; rows: T[] }> = [];
  let curBatch: T[] = [];
  let curStartMatch = '';
  let curEndMatch = '';

  for (const [mKey, mRows] of matchMap.entries()) {
    const matchLabel = mKey.split('__')[2];
    if (curBatch.length + mRows.length > targetBatchSize && curBatch.length > 0) {
      batches.push({
        label: `Matches ${curStartMatch}–${curEndMatch} (${curBatch.length} rows)`,
        rows: curBatch,
      });
      curBatch = [];
      curStartMatch = '';
    }
    if (!curStartMatch) curStartMatch = matchLabel;
    curEndMatch = matchLabel;
    curBatch.push(...mRows);
  }

  if (curBatch.length > 0) {
    batches.push({
      label: `Matches ${curStartMatch}–${curEndMatch} (${curBatch.length} rows)`,
      rows: curBatch,
    });
  }

  return batches;
}

export function BulkJsonMatchImporter({
  referenceData,
}: {
  referenceData?: {
    tournaments: { id: string; name: string; slug: string }[];
    teams: { id: string; name: string; tag?: string | null }[];
  };
}) {
  const router = useRouter();

  const [importTarget, setImportTarget] = React.useState<'teams' | 'players'>('players');
  const [inputMode, setInputMode] = React.useState<'excel' | 'json'>('excel');
  const [rawText, setRawText] = React.useState(SAMPLE_PLAYER_EXCEL_DATA);
  const [copiedTemplate, setCopiedTemplate] = React.useState(false);
  const [copiedHeaders, setCopiedHeaders] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isQualifierMode, setIsQualifierMode] = React.useState(false);
  const [importResult, setImportResult] = React.useState<BulkUniversalImportResult | BulkUniversalPlayerImportResult | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const [progressState, setProgressState] = React.useState<InfluxProgressState>({
    active: false,
    currentBatch: 0,
    totalBatches: 0,
    processedRows: 0,
    totalRows: 0,
    currentLabel: '',
    createdMatchesCount: 0,
    insertedResultsCount: 0,
    insertedPlayerStatsCount: 0,
    errors: [],
  });

  const cancelRef = React.useRef(false);

  // Switch between Team and Player sample data
  const handleTargetSwitch = (target: 'teams' | 'players') => {
    setImportTarget(target);
    setImportResult(null);
    if (target === 'players') {
      setRawText(SAMPLE_PLAYER_EXCEL_DATA);
    } else {
      setRawText(SAMPLE_TEAM_EXCEL_DATA);
    }
  };

  // Parse raw text into structured rows
  const parsedRows: any[] = React.useMemo(() => {
    setParseError(null);
    if (!rawText.trim()) return [];

    if (inputMode === 'json') {
      try {
        const parsed = JSON.parse(rawText);
        if (!Array.isArray(parsed)) {
          setParseError('JSON root must be an Array of objects.');
          return [];
        }
        return parsed;
      } catch (err: any) {
        setParseError(`JSON Syntax Error: ${err?.message || err}`);
        return [];
      }
    }

    // Excel / TSV / CSV Parsing
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : /\s{2,}/;
    const headerTokens = lines[0]
      .split(delimiter)
      .map((t) => t.trim().toLowerCase().replace(/^["']|["']$/g, ''));

    // Check if line 0 is a header
    const hasHeader = headerTokens.some(
      (t) =>
        t.includes('tourn') ||
        t.includes('stage') ||
        t.includes('stagematch') ||
        t.includes('overall') ||
        t.includes('team') ||
        t.includes('player') ||
        t.includes('rank') ||
        t.includes('elim') ||
        t.includes('place')
    );

    const colMap: Record<string, number> = {};

    if (hasHeader) {
      headerTokens.forEach((token, idx) => {
        const clean = token.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        switch (clean) {
          case 'tournament':
          case 'tourney':
          case 'tournament_name':
            colMap['tournament'] = idx;
            break;
          case 'stage':
          case 'stage_name':
            colMap['stage'] = idx;
            break;
          case 'date':
          case 'match_date':
            colMap['date'] = idx;
            break;
          case 'timeformat':
          case 'time_format':
          case 'tz':
            colMap['timeformat'] = idx;
            break;
          case 'time':
          case 'match_time':
            colMap['time'] = idx;
            break;
          case 'overallmatch':
          case 'overall_match':
          case 'overall':
          case 'overallmatchnumber':
            colMap['overallmatch'] = idx;
            break;
          case 'stagematch':
          case 'stage_match':
          case 'match':
          case 'matchnumber':
          case 'stagematchnumber':
            colMap['stagematch'] = idx;
            break;
          case 'map':
          case 'mapname':
          case 'map_name':
            colMap['map'] = idx;
            break;
          case 'group':
          case 'groupname':
          case 'group_name':
            colMap['group'] = idx;
            break;
          case 'type':
          case 'matchtype':
          case 'match_type':
          case 'environment':
            colMap['type'] = idx;
            break;
          case 'verified':
          case 'isverified':
          case 'qualifier':
          case 'isqualifier':
          case 'openqualifier':
            colMap['isverified'] = idx;
            break;
          case 'player':
          case 'ign':
          case 'player_ign':
          case 'playername':
          case 'player_name':
            colMap['player'] = idx;
            break;
          case 'team':
          case 'teamname':
          case 'team_name':
          case 'squad':
          case 'tag':
            colMap['team'] = idx;
            break;
          case 'role':
          case 'player_role':
            colMap['role'] = idx;
            break;
          case 'elims':
          case 'kills':
          case 'player_elims':
          case 'playerelims':
          case 'finishes':
          case 'kp':
            colMap['elims'] = idx;
            break;
          case 'team_rank':
          case 'teamrank':
            colMap['team_rank'] = idx;
            break;
          case 'team_wwcd':
          case 'teamwwcd':
          case 'iswwcd':
          case 'is_wwcd':
            colMap['team_wwcd'] = idx;
            colMap['wwcd'] = idx;
            break;
          case 'team_place':
          case 'teamplace':
          case 'team_placepoints':
          case 'teamplacepoints':
            colMap['team_place'] = idx;
            break;
          case 'team_elims':
          case 'teamelims':
          case 'team_elimspoints':
          case 'teamelimspoints':
            colMap['team_elims'] = idx;
            break;
          case 'team_total':
          case 'teamtotal':
          case 'team_totalpoints':
          case 'teamtotalpoints':
            colMap['team_total'] = idx;
            break;
          case 'rank':
          case 'pos':
          case 'placement':
            colMap['rank'] = idx;
            break;
          case 'wwcd':
          case 'winner':
          case 'chicken':
          case 'win':
          case 'won':
            colMap['wwcd'] = idx;
            colMap['team_wwcd'] = idx;
            break;
          case 'placepoints':
          case 'place_points':
          case 'pp':
            colMap['placepoints'] = idx;
            break;
          case 'bonuspoints':
          case 'bonus_points':
          case 'bonus':
            colMap['bonuspoints'] = idx;
            break;
          case 'totalpoints':
          case 'total_points':
          case 'total':
          case 'pts':
          case 'points':
            colMap['totalpoints'] = idx;
            break;
          case 'damage':
          case 'dmg':
          case 'player_damage':
            colMap['damage'] = idx;
            break;
          case 'survivaltime':
          case 'survival_time':
          case 'surv':
          case 'survived':
            colMap['survivaltime'] = idx;
            break;
          case 'healing':
          case 'heal':
          case 'heals':
            colMap['healing'] = idx;
            break;
          case 'damagereceived':
          case 'damage_received':
          case 'dmgrcv':
          case 'dmg_rcv':
            colMap['damagereceived'] = idx;
            break;
          case 'headshots':
          case 'headshot':
          case 'hs':
            colMap['headshots'] = idx;
            break;
          case 'assists':
          case 'assist':
          case 'ast':
            colMap['assists'] = idx;
            break;
          case 'knockouts':
          case 'knockout':
          case 'knocks':
          case 'knock':
            colMap['knockouts'] = idx;
            break;
          case 'longestelim':
          case 'longest_elim':
          case 'longestkill':
            colMap['longestelim'] = idx;
            break;
          case 'vehicleelims':
          case 'vehicle_elims':
          case 'vehiclekills':
            colMap['vehicleelims'] = idx;
            break;
          case 'grenadeelims':
          case 'grenade_elims':
          case 'grenadekills':
          case 'nadeelims':
            colMap['grenadeelims'] = idx;
            break;
          case 'smokesused':
          case 'smokes_used':
          case 'smokes':
          case 'smoke':
            colMap['smokesused'] = idx;
            break;
          case 'grenadesused':
          case 'grenades_used':
          case 'grenades':
          case 'nades':
            colMap['grenadesused'] = idx;
            break;
          case 'molotovsused':
          case 'molotovs_used':
          case 'molotovs':
          case 'molis':
            colMap['molotovsused'] = idx;
            break;
          case 'flashused':
          case 'flash_used':
          case 'flash':
            colMap['flashused'] = idx;
            break;
          case 'utilities':
          case 'util':
          case 'utilitiestotal':
          case 'total_utilities':
            colMap['utilities'] = idx;
            break;
          case 'airdrops':
          case 'airdrop':
          case 'drops':
          case 'crates':
            colMap['airdrops'] = idx;
            break;
          case 'rescues':
          case 'rescue':
          case 'revives':
          case 'revive':
            colMap['rescues'] = idx;
            break;
          case 'distdrove':
          case 'dist_drove':
          case 'drove':
          case 'drive':
            colMap['distdrove'] = idx;
            break;
          case 'distwalk':
          case 'dist_walk':
          case 'walk':
          case 'walked':
            colMap['distwalk'] = idx;
            break;
          case 'total_dist':
          case 'totaldist':
          case 'total_distance':
          case 'distance':
            colMap['total_dist'] = idx;
            break;
          case 'playerpowerplay':
          case 'player_powerplay':
          case 'powerplay':
            colMap['playerpowerplay'] = idx;
            break;
          case 'ismvp':
          case 'is_mvp':
          case 'mvp':
            colMap['ismvp'] = idx;
            break;
        }
      });
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines
      .map((line) => {
        const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length < 2) return null;

        const getVal = (key: string, defaultColIdx?: number) => {
          if (hasHeader) {
            if (colMap[key] != null && parts[colMap[key]] !== undefined && parts[colMap[key]] !== '') {
              return parts[colMap[key]];
            }
            return undefined;
          }
          if (defaultColIdx != null && parts[defaultColIdx] !== undefined && parts[defaultColIdx] !== '') {
            return parts[defaultColIdx];
          }
          return undefined;
        };

        if (importTarget === 'players') {
          return {
            Tournament: getVal('tournament', 0) || '',
            Stage: getVal('stage', 1) || 'Grand Finals',
            Date: getVal('date', 2),
            TimeFormat: getVal('timeformat', 3) || 'IST',
            Time: getVal('time', 4),
            OverallMatch: getVal('overallmatch', 5) ? Number(getVal('overallmatch', 5)) : undefined,
            StageMatch: getVal('stagematch', 6) ? Number(getVal('stagematch', 6)) : 1,
            Map: getVal('map', 7) || 'Erangel',
            Group: getVal('group', 8),
            Type: getVal('type') || getVal('matchtype'),
            isVerified: getVal('isverified'),
            player: getVal('player', 9) || '',
            team: getVal('team', 10) || '',
            role: getVal('role', 11),
            elims: getVal('elims', 12) != null ? Number(getVal('elims', 12)) : 0,
            playerPowerplay: getVal('playerpowerplay', 13) != null ? Number(getVal('playerpowerplay', 13)) : undefined,
            team_rank: getVal('team_rank', 14) != null ? Number(getVal('team_rank', 14)) : undefined,
            team_wwcd: (() => {
              const raw = getVal('team_wwcd', 15) ?? getVal('wwcd');
              if (raw != null) return parseWwcd(raw);
              const r = getVal('team_rank', 14) != null ? Number(getVal('team_rank', 14)) : undefined;
              return r === 1 ? true : undefined;
            })(),
            team_place: getVal('team_place', 16) != null ? Number(getVal('team_place', 16)) : undefined,
            team_elims: getVal('team_elims', 17) != null ? Number(getVal('team_elims', 17)) : undefined,
            team_total: getVal('team_total', 18) != null ? Number(getVal('team_total', 18)) : undefined,
            damage: getVal('damage', 19) != null ? Number(getVal('damage', 19)) : undefined,
            survivalTime: getVal('survivaltime', 20) != null ? Number(getVal('survivaltime', 20)) : undefined,
            healing: getVal('healing', 21) != null ? Number(getVal('healing', 21)) : undefined,
            damageReceived: getVal('damagereceived', 22) != null ? Number(getVal('damagereceived', 22)) : undefined,
            headshots: getVal('headshots', 23) != null ? Number(getVal('headshots', 23)) : undefined,
            assists: getVal('assists', 24) != null ? Number(getVal('assists', 24)) : undefined,
            knockouts: getVal('knockouts', 25) != null ? Number(getVal('knockouts', 25)) : undefined,
            longestElim: getVal('longestelim', 26) != null ? Number(getVal('longestelim', 26)) : undefined,
            vehicleElims: getVal('vehicleelims', 27) != null ? Number(getVal('vehicleelims', 27)) : undefined,
            grenadeElims: getVal('grenadeelims', 28) != null ? Number(getVal('grenadeelims', 28)) : undefined,
            smokesUsed: getVal('smokesused', 29) != null ? Number(getVal('smokesused', 29)) : undefined,
            grenadesUsed: getVal('grenadesused', 30) != null ? Number(getVal('grenadesused', 30)) : undefined,
            molotovsUsed: getVal('molotovsused', 31) != null ? Number(getVal('molotovsused', 31)) : undefined,
            flashUsed: getVal('flashused', 32) != null ? Number(getVal('flashused', 32)) : undefined,
            utilities: getVal('utilities', 33) != null ? Number(getVal('utilities', 33)) : undefined,
            airdrops: getVal('airdrops', 34) != null ? Number(getVal('airdrops', 34)) : undefined,
            rescues: getVal('rescues', 35) != null ? Number(getVal('rescues', 35)) : undefined,
            distDrove: getVal('distdrove', 36) != null ? Number(getVal('distdrove', 36)) : undefined,
            distWalk: getVal('distwalk', 37) != null ? Number(getVal('distwalk', 37)) : undefined,
            total_dist: getVal('total_dist', 38) != null ? Number(getVal('total_dist', 38)) : undefined,
            isMvp: getVal('ismvp', 39) != null ? getVal('ismvp', 39) : undefined,
          };
        }

        // Team Row fallback
        const teamRankVal = getVal('rank', 10) != null ? Number(getVal('rank', 10)) : 1;
        const rawTeamWwcd = getVal('wwcd', 11) ?? getVal('team_wwcd') ?? getVal('teamwwcd') ?? getVal('winner') ?? getVal('chicken') ?? getVal('win');
        const isTeamWwcdVal = rawTeamWwcd != null ? parseWwcd(rawTeamWwcd, teamRankVal) : teamRankVal === 1;

        return {
          Tournament: getVal('tournament', 0) || '',
          Stage: getVal('stage', 1) || 'Grand Finals',
          Date: getVal('date', 2) || undefined,
          TimeFormat: getVal('timeformat', 3) || 'IST',
          Time: getVal('time', 4) || undefined,
          OverallMatch: getVal('overallmatch', 5) || undefined,
          StageMatch: getVal('stagematch', 6) || 1,
          Map: getVal('map', 7) || 'Erangel',
          Group: getVal('group', 8) || undefined,
          team: getVal('team', 9) || '',
          rank: teamRankVal,
          wwcd: isTeamWwcdVal,
          placePoints: getVal('placepoints', 12) != null ? Number(getVal('placepoints', 12)) : undefined,
          elims: getVal('elims', 13) != null ? Number(getVal('elims', 13)) : 0,
          bonusPoints: getVal('bonuspoints', 14) != null ? Number(getVal('bonuspoints', 14)) : 0,
          totalPoints: getVal('totalpoints', 15) != null ? Number(getVal('totalpoints', 15)) : undefined,
          survivalTime: getVal('survivaltime', 16) != null ? Number(getVal('survivaltime', 16)) : 1680,
          damage: getVal('damage', 17) != null ? Number(getVal('damage', 17)) : 0,
          healing: getVal('healing', 18) != null ? Number(getVal('healing', 18)) : 0,
          damageReceived: getVal('damagereceived', 19) != null ? Number(getVal('damagereceived', 19)) : 0,
          headshots: getVal('headshots', 20) != null ? Number(getVal('headshots', 20)) : 0,
          assists: getVal('assists', 21) != null ? Number(getVal('assists', 21)) : 0,
          knockouts: getVal('knockouts', 22) != null ? Number(getVal('knockouts', 22)) : 0,
          longestElim: getVal('longestelim', 23) != null ? Number(getVal('longestelim', 23)) : 0,
          vehicleElims: getVal('vehicleelims', 24) != null ? Number(getVal('vehicleelims', 24)) : 0,
          grenadeElims: getVal('grenadeelims', 25) != null ? Number(getVal('grenadeelims', 25)) : 0,
          smokesUsed: getVal('smokesused', 26) != null ? Number(getVal('smokesused', 26)) : 0,
          grenadesUsed: getVal('grenadesused', 27) != null ? Number(getVal('grenadesused', 27)) : 0,
          molotovsUsed: getVal('molotovsused', 28) != null ? Number(getVal('molotovsused', 28)) : 0,
          flashUsed: getVal('flashused', 29) != null ? Number(getVal('flashused', 29)) : 0,
          airdrops: getVal('airdrops', 30) != null ? Number(getVal('airdrops', 30)) : 0,
          rescues: getVal('rescues', 31) != null ? Number(getVal('rescues', 31)) : 0,
          distDrove: getVal('distdrove', 32) != null ? Number(getVal('distdrove', 32)) : 0,
          distWalk: getVal('distwalk', 33) != null ? Number(getVal('distwalk', 33)) : 0,
        };
      })
      .filter(Boolean);
  }, [rawText, inputMode, importTarget]);

  const handleCopyHeaders = () => {
    const headers = importTarget === 'players' ? USER_EXACT_PLAYER_HEADERS : USER_EXACT_TEAM_HEADERS;
    navigator.clipboard.writeText(headers);
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 2000);
  };

  const handleCopyTemplate = () => {
    const template = importTarget === 'players' ? SAMPLE_PLAYER_EXCEL_DATA : SAMPLE_TEAM_EXCEL_DATA;
    navigator.clipboard.writeText(template);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;
    setIsSubmitting(true);
    setImportResult(null);
    cancelRef.current = false;

    try {
      const submissionRows = parsedRows.map((r) => ({
        ...r,
        ...(isQualifierMode ? { isOpenQualifier: true } : {}),
      }));

      // Match/Day-aware partition (~384 rows per batch, matching 1 day of 6 complete matches)
      const batches = partitionRowsIntoBatches(submissionRows, 384);

      let totalProcessed = 0;
      let totalCreatedMatches = 0;
      let totalUpdatedMatches = 0;
      let totalCreatedPlayers = 0;
      let totalInsertedStats = 0;
      const allErrors: string[] = [];

      setProgressState({
        active: true,
        currentBatch: 1,
        totalBatches: batches.length,
        processedRows: 0,
        totalRows: submissionRows.length,
        currentLabel: batches[0]?.label || 'Starting Influx...',
        createdMatchesCount: 0,
        insertedResultsCount: 0,
        insertedPlayerStatsCount: 0,
        errors: [],
      });

      for (let i = 0; i < batches.length; i++) {
        if (cancelRef.current) {
          allErrors.push(
            `Influx stopped early by user at batch ${i + 1} of ${batches.length}. Batches processed prior to cancellation were safely saved.`
          );
          break;
        }

        const batch = batches[i];
        setProgressState((prev) => ({
          ...prev,
          currentBatch: i + 1,
          currentLabel: batch.label,
        }));

        if (importTarget === 'players') {
          const res = await bulkUniversalPlayerMatchImportAction(batch.rows as BulkUniversalPlayerRowInput[]);
          totalProcessed += res.processedCount || batch.rows.length;
          totalCreatedMatches += res.createdMatchesCount || 0;
          totalUpdatedMatches += res.updatedMatchesCount || 0;
          totalCreatedPlayers += res.createdPlayersCount || 0;
          totalInsertedStats += res.insertedPlayerStatsCount || 0;
          if (res.errors && res.errors.length > 0) {
            allErrors.push(...res.errors);
          }
          if (!res.success && (!res.errors || res.errors.length === 0)) {
            allErrors.push(res.message || `Batch ${i + 1} failed.`);
          }
        } else {
          const res = await bulkUniversalMatchImportAction(batch.rows as BulkUniversalRowInput[]);
          totalProcessed += res.insertedCount || batch.rows.length;
          totalCreatedMatches += res.matchesCount || 0;
          totalInsertedStats += res.insertedCount || 0;
          if (res.errors && res.errors.length > 0) {
            allErrors.push(...res.errors);
          }
          if (!res.success && (!res.errors || res.errors.length === 0)) {
            allErrors.push(res.message || `Batch ${i + 1} failed.`);
          }
        }

        setProgressState((prev) => ({
          ...prev,
          processedRows: totalProcessed,
          createdMatchesCount: totalCreatedMatches,
          insertedResultsCount: totalInsertedStats,
          insertedPlayerStatsCount: totalInsertedStats,
          errors: allErrors,
        }));
      }

      const isCompletedCleanly = !cancelRef.current && allErrors.length === 0;
      setImportResult({
        success: isCompletedCleanly || totalProcessed > 0,
        message: cancelRef.current
          ? `Influx stopped early. Processed ${totalProcessed} of ${submissionRows.length} rows (${batches.length} total batches).`
          : allErrors.length > 0
          ? `Processed ${totalProcessed} of ${submissionRows.length} rows with ${allErrors.length} notices/warnings.`
          : `Universal ${importTarget === 'players' ? 'Player' : 'Team'} Influx Complete! Successfully processed ${totalProcessed} rows across ${batches.length} match batch(es).`,
        processedCount: totalProcessed,
        createdMatchesCount: totalCreatedMatches,
        updatedMatchesCount: totalUpdatedMatches,
        createdPlayersCount: totalCreatedPlayers,
        insertedPlayerStatsCount: totalInsertedStats,
        errors: allErrors,
      } as any);

      router.refresh();
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err?.message || 'Submission failed.',
        processedCount: 0,
        createdMatchesCount: 0,
        updatedMatchesCount: 0,
        errors: [err?.message || 'Failed'],
      } as any);
    } finally {
      setIsSubmitting(false);
      setProgressState((prev) => ({ ...prev, active: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Selector: Teams vs Players ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Universal Match Data Importer
              </h2>
              <p className="text-xs text-slate-500">
                Bulk paste tournament scorecards, match schedules, and player performances directly from Excel, Google Sheets, or JSON.
              </p>
            </div>
          </div>
        </div>

        {/* Ingestion Target Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Event vs Open Qualifier Mode */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setIsQualifierMode(false)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                !isQualifierMode
                  ? 'bg-white dark:bg-slate-900 text-(--ed-blue) dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>🏆 Main Event</span>
            </button>
            <button
              type="button"
              onClick={() => setIsQualifierMode(true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isQualifierMode
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>🛡️ Open Qualifier</span>
            </button>
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleTargetSwitch('players')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                importTarget === 'players'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              🎯 Player Match Stats
            </button>
            <button
              type="button"
              onClick={() => handleTargetSwitch('teams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                importTarget === 'teams'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              🛡️ Team Scorecards
            </button>
          </div>
        </div>
      </div>

      {isQualifierMode && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <span className="font-bold block">Open Qualifier Isolation Mode Active</span>
            New teams and players created from this batch will be tagged as unverified. They will record match scorecards and kills accurately, but will not pollute verified pro directories or hijack established pro names.
          </div>
        </div>
      )}

      {/* ── Format & Copy Tools Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInputMode('excel')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              inputMode === 'excel'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel / TSV Table
          </button>
          <button
            type="button"
            onClick={() => setInputMode('json')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              inputMode === 'json'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            JSON Array
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyHeaders}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            {copiedHeaders ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Header Row
          </button>

          <button
            type="button"
            onClick={handleCopyTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Sample Template
          </button>

          <button
            type="button"
            onClick={() => setRawText('')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-400 hover:text-rose-500"
            title="Clear text"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Textarea Input ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Paste {importTarget === 'players' ? 'Player Stats' : 'Team Match Scorecards'} (Tab-separated values or JSON array):
          </span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {parsedRows.length} rows parsed
          </span>
        </div>
        <textarea
          rows={7}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Paste ${importTarget === 'players' ? 'player' : 'team'} match data rows here...`}
          className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 leading-relaxed"
        />
        {parseError && (
          <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {parseError}
          </p>
        )}
      </div>

      {/* ── Live Preview Grid ── */}
      {parsedRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-blue-500" />
              Live Ingestion Preview ({parsedRows.length} rows)
            </h3>
            <span className="text-[11px] text-slate-500">
              Matches and lightweight players will be automatically matched or created in database.
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Tournament</th>
                    <th className="py-2 px-3">Stage</th>
                    {parsedRows.some((r) => r.Date || r.Time) && (
                      <th className="py-2 px-3">Date &amp; Time</th>
                    )}
                    <th className="py-2 px-3">Match</th>
                    <th className="py-2 px-3">Map</th>
                    {parsedRows.some((r) => r.Group) && (
                      <th className="py-2 px-3">Group</th>
                    )}
                    {importTarget === 'players' ? (
                      <>
                        <th className="py-2 px-3">Player IGN</th>
                        <th className="py-2 px-3">Team</th>
                        {parsedRows.some((r) => r.role) && (
                          <th className="py-2 px-3">Role</th>
                        )}
                        <th className="py-2 px-3 text-center">Elims</th>
                        {parsedRows.some((r) => r.playerPowerplay != null) && (
                          <th className="py-2 px-3 text-center text-purple-600 dark:text-purple-400">Powerplay</th>
                        )}
                        {parsedRows.some((r) => r.damage != null) && (
                          <th className="py-2 px-3 text-center">Damage</th>
                        )}
                        {parsedRows.some((r) => r.team_rank != null) && (
                          <th className="py-2 px-3 text-center">Team Rank</th>
                        )}
                        {parsedRows.some((r) => r.isMvp != null) && (
                          <th className="py-2 px-3 text-center text-amber-600">MVP</th>
                        )}
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-3">Team</th>
                        <th className="py-2 px-3 text-center">Rank</th>
                        <th className="py-2 px-3 text-center">WWCD</th>
                        {parsedRows.some((r) => r.placePoints != null) && (
                          <th className="py-2 px-3 text-center">Place Pts</th>
                        )}
                        <th className="py-2 px-3 text-center">Elims</th>
                        {parsedRows.some((r) => r.bonusPoints != null && r.bonusPoints > 0) && (
                          <th className="py-2 px-3 text-center">Bonus</th>
                        )}
                        {parsedRows.some((r) => r.totalPoints != null) && (
                          <th className="py-2 px-3 text-center">Total Pts</th>
                        )}
                        {parsedRows.some((r) => r.damage != null && r.damage > 0) && (
                          <th className="py-2 px-3 text-center">Damage</th>
                        )}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {parsedRows.slice(0, 50).map((row, idx) => {
                    const hasDateCol = parsedRows.some((r) => r.Date || r.Time);
                    const hasGroupCol = parsedRows.some((r) => r.Group);
                    const hasRoleCol = parsedRows.some((r) => r.role);
                    const hasPowerplayCol = parsedRows.some((r) => r.playerPowerplay != null);
                    const hasDamageCol = parsedRows.some((r) => r.damage != null);
                    const hasTeamRankCol = parsedRows.some((r) => r.team_rank != null);
                    const hasMvpCol = parsedRows.some((r) => r.isMvp != null);

                    const dateTimeStr = [row.Date, row.Time, row.TimeFormat].filter(Boolean).join(' ');

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                          {row.Tournament || row.tournament || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {row.Stage || row.stage || '—'}
                        </td>
                        {hasDateCol && (
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {dateTimeStr || '—'}
                          </td>
                        )}
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <span className="font-bold">M#{row.StageMatch || row.stageMatch || 1}</span>
                          {row.OverallMatch != null && (
                            <span className="text-[10px] text-slate-400 ml-1">(O#{row.OverallMatch})</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {row.Map || row.map || '—'}
                        </td>
                        {hasGroupCol && (
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-sans">
                            {row.Group || row.group || '—'}
                          </td>
                        )}
                        {importTarget === 'players' ? (
                          <>
                            <td className="py-2 px-3 font-bold text-blue-600 dark:text-blue-400">
                              {row.player || row.Player || row.ign || '—'}
                            </td>
                            <td className="py-2 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                              {row.team || row.Team || '—'}
                            </td>
                            {hasRoleCol && (
                              <td className="py-2 px-3 text-slate-500">{row.role || '—'}</td>
                            )}
                            <td className="py-2 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {row.elims != null ? row.elims : 0}
                            </td>
                            {hasPowerplayCol && (
                              <td className="py-2 px-3 text-center font-bold text-purple-600 dark:text-purple-400">
                                {row.playerPowerplay != null ? row.playerPowerplay : 0}
                              </td>
                            )}
                            {hasDamageCol && (
                              <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">
                                {row.damage != null ? row.damage : '—'}
                              </td>
                            )}
                            {hasTeamRankCol && (
                              <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">
                                #{row.team_rank}
                              </td>
                            )}
                            {hasMvpCol && (
                              <td className="py-2 px-3 text-center">
                                {row.isMvp === true || String(row.isMvp).toLowerCase() === 'true' ? '⭐ MVP' : '—'}
                              </td>
                            )}
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 font-sans font-bold text-blue-600 dark:text-blue-400">
                              {row.team || row.Team || '—'}
                            </td>
                            <td className="py-2 px-3 text-center font-bold">
                              #{row.rank != null ? row.rank : '—'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {parseWwcd(row.wwcd ?? row.team_wwcd, row.rank) ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                  <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" /> WWCD
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            {parsedRows.some((r) => r.placePoints != null) && (
                              <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">
                                {row.placePoints != null ? row.placePoints : 'Auto'}
                              </td>
                            )}
                            <td className="py-2 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {row.elims || 0}
                            </td>
                            {parsedRows.some((r) => r.bonusPoints != null && r.bonusPoints > 0) && (
                              <td className="py-2 px-3 text-center font-bold text-amber-600">
                                {row.bonusPoints || 0}
                              </td>
                            )}
                            {parsedRows.some((r) => r.totalPoints != null) && (
                              <td className="py-2 px-3 text-center font-black text-slate-900 dark:text-white">
                                {row.totalPoints != null ? row.totalPoints : 'Auto'}
                              </td>
                            )}
                            {parsedRows.some((r) => r.damage != null && r.damage > 0) && (
                              <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400">
                                {row.damage || 0}
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 50 && (
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 text-center border-t border-slate-200 dark:border-slate-800">
                Showing first 50 of {parsedRows.length} parsed rows.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Live Influx Progress Monitor ── */}
      {(isSubmitting || progressState.active) && progressState.totalBatches > 1 && (
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-blue-950 dark:text-blue-200">
                Batch Influx Active · Batch {progressState.currentBatch} of {progressState.totalBatches}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                ({Math.round(((progressState.processedRows || 0) / (progressState.totalRows || 1)) * 100)}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 truncate max-w-xs font-mono">
                {progressState.currentLabel}
              </span>
              <button
                type="button"
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer"
                title="Stop after current batch completes"
              >
                <XCircle className="w-3.5 h-3.5" />
                Stop Influx
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(3, Math.round(((progressState.processedRows || 0) / (progressState.totalRows || 1)) * 100))
                )}%`,
              }}
            />
          </div>

          {/* Mini Live Influx Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Rows Processed</div>
              <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                {progressState.processedRows} / {progressState.totalRows}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Current Batch</div>
              <div className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                {progressState.currentBatch} / {progressState.totalBatches}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Matches Created</div>
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {progressState.createdMatchesCount}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">
                {importTarget === 'players' ? 'Player Stats' : 'Team Results'}
              </div>
              <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {progressState.insertedPlayerStatsCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Submission Result Banner ── */}
      {importResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            importResult.success
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-900 dark:text-rose-300'
          }`}
        >
          {importResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="text-xs font-bold">{importResult.message}</p>
            {importResult.errors && importResult.errors.length > 0 && (
              <ul className="text-[11px] list-disc list-inside opacity-80 space-y-0.5 max-h-40 overflow-y-auto">
                {importResult.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {importResult.errors.length > 10 && (
                  <li className="font-bold">...and {importResult.errors.length - 10} more notices</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Ingestion Button ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          disabled={isSubmitting || parsedRows.length === 0}
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {progressState.totalBatches > 1
                ? `Ingesting Batch ${progressState.currentBatch}/${progressState.totalBatches}…`
                : 'Processing Ingestion…'}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Ingest {parsedRows.length} {importTarget === 'players' ? 'Player Records' : 'Match Scorecards'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
