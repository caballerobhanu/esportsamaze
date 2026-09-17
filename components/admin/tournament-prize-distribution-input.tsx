'use client';

import * as React from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Layers,
  Award,
  Sparkles,
  Code2,
  Users,
  Trophy,
  Calculator,
  User,
  Shield,
  Star,
} from 'lucide-react';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';

import { classifyPrizeRow, parseRankRange, prizeRowRange, rankLabel, type PrizeRowKind } from '@/lib/prize-rows';

export interface PrizeRankItem {
  /** PLACEMENT sits on the prize ladder; AWARD is a standalone honour. */
  kind?: PrizeRowKind;
  /** Finishing position as numbers; `to` is only set for a shared band. */
  from?: number;
  to?: number;
  rank: string; // Label — "1st", "5th - 8th"; the honour's own name for an award
  prize: number; // Prize amount in tournament currency (0 if non-cash / title only)
  percentage?: number; // e.g. 40%
  rewardType?: 'MONEY' | 'ITEM' | 'TITLE'; // Type of reward: Cash, Physical Gift / Device, or Honorary Title
  customReward?: string; // Description for physical rewards (e.g. "Realme GT 7 Pro", "Custom Championship Ring")
  recipientType?: 'TEAM' | 'PLAYER'; // Whether this prize is for a Team or an Individual Player
  teamId?: string; // Assigned team ID
  teamName?: string;
  playerId?: string; // Assigned player ID
  playerName?: string; // Player IGN / Name
  qualifications?: string[]; // e.g. ["PMGC 2025", "EWC 2025"]
}

export interface PrizeStageItem {
  stageName: string; // e.g. "Grand Finals", "Semi Finals", "Quarter Finals", "Individual & Fan Awards"
  allocatedPrize?: number;
  percentage?: number;
  ranks: PrizeRankItem[];
}

export interface TeamSummaryOption {
  id: string;
  name: string;
  tag?: string | null;
  logoUrl?: string | null;
}

export interface PlayerSummaryOption {
  id: string;
  ign: string;
  name?: string | null;
  avatarUrl?: string | null;
  currentTeam?: { id: string; name: string; tag?: string | null } | null;
}

interface TournamentPrizeDistributionInputProps {
  initialDistribution?: any;
  totalPrizePool?: number;
  currency?: string;
  allTeams?: TeamSummaryOption[];
  allPlayers?: PlayerSummaryOption[];
}

/** A row as it comes back off the wire — every field is untrusted. */
type StoredRankRow = Record<string, unknown>;

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * A stored row mapped onto the current shape. Rows written before `kind`
 * existed carry only a free-text rank, so the kind and its numeric range are
 * derived once here — every reader downstream then gets the same answer, and
 * re-saving stamps the row with the answer it was read as.
 */
function normalizeRankRow(r: StoredRankRow): PrizeRankItem {
  const range = prizeRowRange(r);
  const recipientType =
    r.recipientType === 'PLAYER' || r.recipientType === 'TEAM'
      ? r.recipientType
      : r.playerId
        ? 'PLAYER'
        : 'TEAM';
  const rewardType =
    r.rewardType === 'ITEM' || r.rewardType === 'TITLE' || r.rewardType === 'MONEY'
      ? r.rewardType
      : 'MONEY';

  return {
    kind: classifyPrizeRow(r),
    from: range ? range.from : undefined,
    to: range && range.to > range.from ? range.to : undefined,
    rank: readString(r.rank) ?? '1st',
    prize: readNumber(r.prize) ?? 0,
    percentage: readNumber(r.percentage),
    rewardType,
    customReward: readString(r.customReward),
    recipientType,
    teamId: readString(r.teamId),
    teamName: readString(r.teamName),
    playerId: readString(r.playerId),
    playerName: readString(r.playerName),
    qualifications: Array.isArray(r.qualifications)
      ? r.qualifications.filter((entry): entry is string => typeof entry === 'string')
      : [],
  };
}

const AWARD_PRESETS = [
  { label: '👑 Tournament MVP', type: 'PLAYER' as const, rewardType: 'MONEY' as const },
  { label: '⭐ Fan Favourite Team', type: 'TEAM' as const, rewardType: 'MONEY' as const },
  { label: '🌟 Fan Favourite Player', type: 'PLAYER' as const, rewardType: 'MONEY' as const },
  { label: '🎯 Top Fragger / Most Kills', type: 'PLAYER' as const, rewardType: 'MONEY' as const },
  { label: '🛡️ Best IGL', type: 'PLAYER' as const, rewardType: 'MONEY' as const },
  { label: '💣 Grenade Master', type: 'PLAYER' as const, rewardType: 'MONEY' as const },
  { label: '⚡ Emerging Player', type: 'PLAYER' as const, rewardType: 'TITLE' as const },
  { label: '📱 Official Device Award', type: 'PLAYER' as const, rewardType: 'ITEM' as const, customReward: 'Realme GT 7 Pro' },
];

function getOrdinal(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

export function TournamentPrizeDistributionInput({
  initialDistribution,
  totalPrizePool = 40000000,
  currency = 'INR',
  allTeams = [],
  allPlayers = [],
}: TournamentPrizeDistributionInputProps) {
  // Normalize initial distribution
  const [stages, setStages] = React.useState<PrizeStageItem[]>(() => {
    if (initialDistribution) {
      if (Array.isArray(initialDistribution)) {
        return [
          {
            stageName: 'Grand Finals',
            allocatedPrize: totalPrizePool,
            percentage: 100,
            ranks: initialDistribution.map(normalizeRankRow),
          },
        ];
      }
      if (initialDistribution.stages && Array.isArray(initialDistribution.stages)) {
        return initialDistribution.stages.map((s: any) => ({
          stageName: s.stageName || 'Stage',
          allocatedPrize: Number(s.allocatedPrize) || 0,
          percentage: Number(s.percentage) || 0,
          ranks: Array.isArray(s.ranks) ? s.ranks.map(normalizeRankRow) : [],
        }));
      }
    }

    return [
      {
        stageName: 'Grand Finals',
        allocatedPrize: totalPrizePool,
        percentage: 100,
        ranks: [{ rank: '1st', prize: totalPrizePool * 0.5, percentage: 50, recipientType: 'TEAM', rewardType: 'MONEY' }],
      },
    ];
  });

  const [rawMode, setRawMode] = React.useState(false);
  const [rawText, setRawText] = React.useState('');

  const teamOptions: SearchableSelectOption[] = React.useMemo(() => {
    return allTeams.map((t) => ({
      value: t.id,
      label: t.name,
      subtitle: t.tag ? `[${t.tag}]` : undefined,
      imageUrl: t.logoUrl || undefined,
    }));
  }, [allTeams]);

  const playerOptions: SearchableSelectOption[] = React.useMemo(() => {
    return allPlayers.map((p) => {
      const realName = p.name || (p as any).firstName;
      const teamTag = p.currentTeam?.tag ? `[${p.currentTeam.tag}]` : '';
      const subtitle = [realName, teamTag ? p.currentTeam?.name || teamTag : null].filter(Boolean).join(' • ');
      return {
        value: p.id,
        label: p.ign,
        subtitle: subtitle || undefined,
        imageUrl: p.avatarUrl || undefined,
      };
    });
  }, [allPlayers]);

  const syncToJson = (currStages: PrizeStageItem[]) => {
    return JSON.stringify({ stages: currStages });
  };

  const addStage = (presetName?: string) => {
    setStages((prev) => [
      ...prev,
      {
        stageName:
          presetName ||
          (prev.length === 1
            ? 'Semi Finals'
            : prev.length === 2
            ? 'Quarter Finals'
            : prev.length === 3
            ? 'Special Awards & MVP'
            : `Stage ${prev.length + 1}`),
        allocatedPrize: 0,
        percentage: 0,
        ranks: [
          { kind: 'PLACEMENT', from: 1, rank: '1st', prize: 0, percentage: 0, recipientType: 'TEAM', rewardType: 'MONEY' },
        ],
      },
    ]);
  };

  const removeStage = (stageIdx: number) => {
    setStages((prev) => prev.filter((_, i) => i !== stageIdx));
  };

  const updateStageName = (stageIdx: number, stageName: string) => {
    setStages((prev) => {
      const copy = [...prev];
      copy[stageIdx] = { ...copy[stageIdx], stageName };
      return copy;
    });
  };

  const updateStageAllocation = (stageIdx: number, allocatedPrize: number, pct?: number) => {
    setStages((prev) => {
      const copy = [...prev];
      copy[stageIdx] = {
        ...copy[stageIdx],
        allocatedPrize,
        percentage: pct ?? (totalPrizePool > 0 ? Math.round((allocatedPrize / totalPrizePool) * 100) : 0),
      };
      return copy;
    });
  };

  const addRank = (
    stageIdx: number,
    defaultRank?: string,
    recipientType: 'TEAM' | 'PLAYER' = 'TEAM',
    rewardType: 'MONEY' | 'ITEM' | 'TITLE' = 'MONEY',
    customReward?: string
  ) => {
    setStages((prev) => {
      const copy = [...prev];
      const targetStage = { ...copy[stageIdx] };
      const nextRankNum = targetStage.ranks.length + 1;
      const label = defaultRank || `${nextRankNum}${getOrdinal(nextRankNum)} Place`;
      // A generated "Nth Place" is a ladder row; the quick-add presets ("Tournament
      // MVP") are honours — which is what keeps their cash out of the prize total.
      const range = parseRankRange(label);
      targetStage.ranks = [
        ...targetStage.ranks,
        {
          kind: range ? 'PLACEMENT' : 'AWARD',
          from: range ? range.from : undefined,
          to: range && range.to > range.from ? range.to : undefined,
          rank: label,
          prize: 0,
          percentage: 0,
          recipientType,
          rewardType,
          customReward,
        },
      ];
      copy[stageIdx] = targetStage;
      return copy;
    });
  };

  /**
   * Switching a row between the ladder and an honour. The numeric range is
   * seeded from the label when moving onto the ladder, so a legacy "5th Place"
   * keeps its position instead of resetting to 1.
   */
  const updateKind = (stageIdx: number, rankIdx: number, kind: PrizeRowKind) => {
    setStages((prev) => {
      const copy = [...prev];
      const targetStage = { ...copy[stageIdx] };
      const ranks = [...targetStage.ranks];
      const row = { ...ranks[rankIdx] };

      if (kind === 'PLACEMENT') {
        const range = prizeRowRange({ ...row, kind: 'PLACEMENT' }) ?? { from: 1, to: 1 };
        row.kind = 'PLACEMENT';
        row.from = range.from;
        row.to = range.to > range.from ? range.to : undefined;
        row.rank = rankLabel(range.from, range.to);
      } else {
        // The label is left as typed: renaming an honour is the admin's call.
        row.kind = 'AWARD';
        row.from = undefined;
        row.to = undefined;
      }

      ranks[rankIdx] = row;
      targetStage.ranks = ranks;
      copy[stageIdx] = targetStage;
      return copy;
    });
  };

  /** The numeric position a placement covers, kept in step with its label. */
  const updatePlacementRange = (stageIdx: number, rankIdx: number, from: number, to?: number) => {
    setStages((prev) => {
      const copy = [...prev];
      const targetStage = { ...copy[stageIdx] };
      const ranks = [...targetStage.ranks];
      const row = { ...ranks[rankIdx] };

      const start = Number.isFinite(from) && from >= 1 ? Math.trunc(from) : 1;
      const end = to != null && Number.isFinite(to) && to > start ? Math.trunc(to) : undefined;

      row.kind = 'PLACEMENT';
      row.from = start;
      row.to = end;
      // Every consumer prints `rank`, so it is derived here rather than left stale.
      row.rank = rankLabel(start, end);

      ranks[rankIdx] = row;
      targetStage.ranks = ranks;
      copy[stageIdx] = targetStage;
      return copy;
    });
  };

  const removeRank = (stageIdx: number, rankIdx: number) => {
    setStages((prev) => {
      const copy = [...prev];
      const targetStage = { ...copy[stageIdx] };
      targetStage.ranks = targetStage.ranks.filter((_, i) => i !== rankIdx);
      copy[stageIdx] = targetStage;
      return copy;
    });
  };

  const updateRank = (stageIdx: number, rankIdx: number, field: keyof PrizeRankItem, val: any) => {
    setStages((prev) => {
      const copy = [...prev];
      const targetStage = { ...copy[stageIdx] };
      const ranksCopy = [...targetStage.ranks];
      ranksCopy[rankIdx] = { ...ranksCopy[rankIdx], [field]: val };

      if (field === 'recipientType') {
        // Reset assigned entities on type change
        ranksCopy[rankIdx].teamId = undefined;
        ranksCopy[rankIdx].teamName = undefined;
        ranksCopy[rankIdx].playerId = undefined;
        ranksCopy[rankIdx].playerName = undefined;
      }

      if (field === 'teamId') {
        const teamObj = allTeams.find((t) => t.id === val);
        ranksCopy[rankIdx].teamName = teamObj ? teamObj.name : undefined;
      }

      if (field === 'playerId') {
        const playerObj = allPlayers.find((p) => p.id === val);
        if (playerObj) {
          ranksCopy[rankIdx].playerName = playerObj.ign;
          if (playerObj.currentTeam) {
            ranksCopy[rankIdx].teamId = playerObj.currentTeam.id;
            ranksCopy[rankIdx].teamName = playerObj.currentTeam.name;
          }
        } else {
          ranksCopy[rankIdx].playerName = undefined;
        }
      }

      if (field === 'percentage' && totalPrizePool > 0) {
        ranksCopy[rankIdx].prize = Math.round((Number(val) / 100) * totalPrizePool);
      } else if (field === 'prize' && totalPrizePool > 0) {
        ranksCopy[rankIdx].percentage = Math.round((Number(val) / totalPrizePool) * 100);
      }

      targetStage.ranks = ranksCopy;
      copy[stageIdx] = targetStage;
      return copy;
    });
  };

  // Cumulative Total Earnings across all stages per team and per player
  const cumulativeEarnings = React.useMemo(() => {
    const teamEarningsMap = new Map<
      string,
      { teamId: string; teamName: string; totalPrize: number; stagesWon: string[] }
    >();
    const playerEarningsMap = new Map<
      string,
      { playerId: string; playerName: string; teamName?: string; totalPrize: number; awards: string[] }
    >();

    for (const stage of stages) {
      for (const rank of stage.ranks) {
        const prizeAmt = Number(rank.prize) || 0;
        if (prizeAmt <= 0) continue;

        // Team prize tracking
        if (rank.teamId && rank.teamName) {
          const existing = teamEarningsMap.get(rank.teamId);
          if (existing) {
            existing.totalPrize += prizeAmt;
            existing.stagesWon.push(`${stage.stageName} (${rank.rank}: ${currency} ${prizeAmt.toLocaleString()})`);
          } else {
            teamEarningsMap.set(rank.teamId, {
              teamId: rank.teamId,
              teamName: rank.teamName,
              totalPrize: prizeAmt,
              stagesWon: [`${stage.stageName} (${rank.rank}: ${currency} ${prizeAmt.toLocaleString()})`],
            });
          }
        }

        // Player prize tracking
        if (rank.playerId && rank.playerName) {
          const existingP = playerEarningsMap.get(rank.playerId);
          if (existingP) {
            existingP.totalPrize += prizeAmt;
            existingP.awards.push(`${rank.rank} (${currency} ${prizeAmt.toLocaleString()})`);
          } else {
            playerEarningsMap.set(rank.playerId, {
              playerId: rank.playerId,
              playerName: rank.playerName,
              teamName: rank.teamName,
              totalPrize: prizeAmt,
              awards: [`${rank.rank} (${currency} ${prizeAmt.toLocaleString()})`],
            });
          }
        }
      }
    }

    return {
      teams: Array.from(teamEarningsMap.values()).sort((a, b) => b.totalPrize - a.totalPrize),
      players: Array.from(playerEarningsMap.values()).sort((a, b) => b.totalPrize - a.totalPrize),
    };
  }, [stages, currency]);

  return (
    <div className="space-y-4">
      {/* Hidden input carrying the JSON data */}
      <input type="hidden" name="prizeDistribution" value={rawMode ? rawText : syncToJson(stages)} />

      {/* Mode switch */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Define stage-wise payouts, individual &amp; fan awards (MVP, Fan Favourite), and assign teams or players to prize slots.
        </p>
        <button
          type="button"
          onClick={() => {
            if (!rawMode) setRawText(syncToJson(stages));
            else {
              try {
                const parsed = JSON.parse(rawText);
                if (Array.isArray(parsed)) {
                  setStages([{ stageName: 'Grand Finals', allocatedPrize: totalPrizePool, ranks: parsed }]);
                } else if (parsed.stages) {
                  setStages(parsed.stages);
                }
              } catch {}
            }
            setRawMode((p) => !p);
          }}
          className="text-[11px] font-bold text-(--ed-blue) dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          <Code2 className="w-3 h-3" /> {rawMode ? 'Visual Stage Editor' : 'Edit Raw JSON'}
        </button>
      </div>

      {rawMode ? (
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={12}
          className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
        />
      ) : (
        <div className="space-y-4">
          {stages.map((stage, sIdx) => (
            <div
              key={sIdx}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3 shadow-sm"
            >
              {/* Stage Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-(--ed-blue)" />
                  <input
                    type="text"
                    value={stage.stageName}
                    onChange={(e) => updateStageName(sIdx, e.target.value)}
                    placeholder="Stage Name (e.g. Grand Finals / Semis / MVP Awards)"
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue) w-48 sm:w-64"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Stage Pool:</span>
                  <input
                    type="number"
                    value={stage.allocatedPrize || ''}
                    onChange={(e) => updateStageAllocation(sIdx, Number(e.target.value))}
                    placeholder="Amount"
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs w-28 focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
                  />
                  <span className="text-xs font-bold text-slate-500">{currency}</span>

                  {stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStage(sIdx)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors ml-2"
                      title="Remove Stage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Award Presets toolbar if this is an awards stage */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Add:</span>
                {AWARD_PRESETS.map((ap) => (
                  <button
                    key={ap.label}
                    type="button"
                    onClick={() =>
                      addRank(
                        sIdx,
                        ap.label,
                        ap.type,
                        (ap as any).rewardType || 'MONEY',
                        (ap as any).customReward
                      )
                    }
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-(--ed-blue) text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    + {ap.label}
                  </button>
                ))}
              </div>

              {/* Ranks list within this stage */}
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-12 gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 px-2">
                  <div className="col-span-3">Placement / Award Label</div>
                  <div className="col-span-1 text-center">Type</div>
                  <div className="col-span-3">Assigned Winner (Team or Player)</div>
                  <div className="col-span-1 text-center">Reward</div>
                  <div className="col-span-3">Prize / Custom Reward ({currency})</div>
                  <div className="col-span-1 text-right">Delete</div>
                </div>

                {stage.ranks.map((rankItem, rIdx) => {
                  const isPlayer = rankItem.recipientType === 'PLAYER';
                  const rewType = rankItem.rewardType || 'MONEY';
                  const isPlacement = classifyPrizeRow(rankItem) === 'PLACEMENT';

                  return (
                    <div
                      key={rIdx}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs shadow-xs"
                    >
                      {/* Kind + Rank / Label */}
                      <div className="col-span-12 sm:col-span-3 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateKind(sIdx, rIdx, isPlacement ? 'AWARD' : 'PLACEMENT')}
                            className={`shrink-0 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border transition-colors ${
                              isPlacement
                                ? 'bg-blue-500/15 text-(--ed-blue) dark:text-blue-300 border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            }`}
                            title="Click to switch between a prize-ladder placement and a standalone honour"
                          >
                            {isPlacement ? 'Placement' : 'Award'}
                          </button>

                          {isPlacement ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                value={rankItem.from ?? ''}
                                onChange={(e) =>
                                  updatePlacementRange(sIdx, rIdx, Number(e.target.value), rankItem.to)
                                }
                                placeholder="1"
                                className="w-14 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-center text-[11px] focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
                              />
                              <span className="text-[11px] text-slate-400">–</span>
                              <input
                                type="number"
                                min={1}
                                value={rankItem.to ?? ''}
                                onChange={(e) =>
                                  updatePlacementRange(
                                    sIdx,
                                    rIdx,
                                    rankItem.from ?? 1,
                                    e.target.value === '' ? undefined : Number(e.target.value)
                                  )
                                }
                                placeholder="—"
                                title="Leave blank for a single rank, or set it for a shared band (5th - 8th)"
                                className="w-14 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-center text-[11px] focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={rankItem.rank}
                              onChange={(e) => updateRank(sIdx, rIdx, 'rank', e.target.value)}
                              placeholder="Tournament MVP"
                              className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-[11px] focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
                            />
                          )}
                        </div>

                        <p className="text-[10px] font-semibold text-slate-400">
                          {isPlacement
                            ? `Ladder row — counts as prize money (${rankItem.rank || 'unranked'})`
                            : 'Honour — never counted as prize money'}
                        </p>
                      </div>

                      {/* Recipient Type Toggle (TEAM vs PLAYER) */}
                      <div className="col-span-6 sm:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateRank(sIdx, rIdx, 'recipientType', isPlayer ? 'TEAM' : 'PLAYER')
                          }
                          className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors ${
                            isPlayer
                              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                              : 'bg-blue-500/15 text-(--ed-blue) dark:text-blue-300 border border-blue-500/30'
                          }`}
                          title={`Click to switch between Team and Player award`}
                        >
                          {isPlayer ? <User className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          <span>{isPlayer ? 'Player' : 'Team'}</span>
                        </button>
                      </div>

                      {/* Assigned Winner (Team or Player Dropdown) */}
                      <div className="col-span-12 sm:col-span-3">
                        {isPlayer ? (
                          <SearchableSelect
                            options={playerOptions}
                            value={rankItem.playerId || ''}
                            onChange={(val) => {
                              const pObj = allPlayers.find((p) => p.id === val);
                              updateRank(sIdx, rIdx, 'playerId', val);
                              if (pObj) {
                                updateRank(sIdx, rIdx, 'playerName', pObj.ign);
                              }
                            }}
                            placeholder="— Select Player (TBA) —"
                            size="admin"
                            triggerClassName={
                              rankItem.playerId
                                ? '!border-purple-500/40 !bg-purple-500/10 !text-purple-900 dark:!text-purple-200'
                                : undefined
                            }
                          />
                        ) : (
                          <SearchableSelect
                            options={teamOptions}
                            value={rankItem.teamId || ''}
                            onChange={(val) => {
                              const tObj = allTeams.find((t) => t.id === val);
                              updateRank(sIdx, rIdx, 'teamId', val);
                              if (tObj) {
                                updateRank(sIdx, rIdx, 'teamName', tObj.name);
                              }
                            }}
                            placeholder="— Select Team (TBA) —"
                            size="admin"
                            triggerClassName={
                              rankItem.teamId
                                ? '!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-900 dark:!text-emerald-300'
                                : undefined
                            }
                          />
                        )}
                      </div>

                      {/* Reward Mode Selector (Cash, Physical Item, Title) */}
                      <div className="col-span-6 sm:col-span-1 flex justify-center">
                        <select
                          value={rewType}
                          onChange={(e) => updateRank(sIdx, rIdx, 'rewardType', e.target.value)}
                          className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
                        >
                          <option value="MONEY">💵 Cash</option>
                          <option value="ITEM">🎁 Item</option>
                          <option value="TITLE">👑 Title</option>
                        </select>
                      </div>

                      {/* Prize / Custom Reward display */}
                      <div className="col-span-11 sm:col-span-3 flex items-center gap-1.5">
                        {rewType === 'TITLE' ? (
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 w-full text-center">
                            👑 Title &amp; Trophy (No Cash)
                          </span>
                        ) : rewType === 'ITEM' ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={rankItem.customReward || ''}
                              onChange={(e) => updateRank(sIdx, rIdx, 'customReward', e.target.value)}
                              placeholder="e.g. Realme GT 7 Pro (Device)"
                              className="w-full px-2 py-1 rounded border border-amber-400/40 bg-amber-500/5 text-[11px] font-bold text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="number"
                              value={rankItem.prize}
                              onChange={(e) => updateRank(sIdx, rIdx, 'prize', Number(e.target.value))}
                              placeholder="0"
                              className="w-2/3 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-[11px] focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
                            />
                            <div className="w-1/3 flex items-center gap-0.5">
                              <input
                                type="number"
                                value={rankItem.percentage || ''}
                                onChange={(e) =>
                                  updateRank(sIdx, rIdx, 'percentage', Number(e.target.value))
                                }
                                placeholder="%"
                                className="w-full px-1 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Delete rank */}
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeRank(sIdx, rIdx)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Rank to stage */}
              <button
                type="button"
                onClick={() => addRank(sIdx)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-(--ed-blue) dark:text-blue-400 hover:underline pt-1"
              >
                <Plus className="w-3 h-3" /> Add Placement / Award in {stage.stageName}
              </button>
            </div>
          ))}

          {/* Cumulative Multi-Stage Earnings Summary Card */}
          {(cumulativeEarnings.teams.length > 0 || cumulativeEarnings.players.length > 0) && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" /> Cumulative Payout Summary (Auto-Aggregated from All Stages &amp; Awards)
                </span>
              </div>

              {cumulativeEarnings.teams.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Team Cumulative Payouts:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {cumulativeEarnings.teams.map((ce, cIdx) => (
                      <div
                        key={ce.teamId}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-500/20 text-xs flex items-center justify-between shadow-xs"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate mr-2">
                          #{cIdx + 1} {ce.teamName}
                        </span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          {currency} {ce.totalPrize.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cumulativeEarnings.players.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                    Individual Player Awards Won:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {cumulativeEarnings.players.map((pe) => (
                      <div
                        key={pe.playerId}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-purple-500/20 text-xs flex items-center justify-between shadow-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            👤 {pe.playerName}
                          </span>
                          {pe.teamName && (
                            <span className="text-[10px] text-slate-400 ml-1">({pe.teamName})</span>
                          )}
                        </div>
                        <span className="font-mono font-black text-purple-600 dark:text-purple-400 shrink-0">
                          {currency} {pe.totalPrize.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Stage button */}
          <button
            type="button"
            onClick={() => addStage()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-(--ed-blue) dark:text-blue-400 hover:bg-(--ed-blue)/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another Stage or Awards Category
          </button>
        </div>
      )}
    </div>
  );
}
