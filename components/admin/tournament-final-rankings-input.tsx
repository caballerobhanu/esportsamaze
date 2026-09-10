'use client';

import * as React from 'react';
import { Trophy, Award, Shield, Sparkles, Plus, Trash2, ArrowUpRight, Calculator, Layers, ArrowDown } from 'lucide-react';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';

export interface FinalTeamRankingItem {
  teamId: string;
  teamName: string;
  tag?: string;
  logoUrl?: string | null;
  rank: number;
  prizeWon?: number;
  qualifications?: string[];
}

export interface StageStandingsItem {
  teamId: string;
  teamName: string;
  tag?: string;
  rank: number;
  points: number;
}

interface TournamentFinalRankingsInputProps {
  initialRankings?: FinalTeamRankingItem[];
  allTeams?: Array<{ id: string; name: string; tag?: string | null; logoUrl?: string | null }>;
  stageStandingsMap?: Record<string, StageStandingsItem[]>;
  prizeDistribution?: any;
  totalPrizePool?: number;
  currency?: string;
}

// Universal prize matching and cumulative multi-stage aggregator
export function calculatePrizeForTeam(
  teamId: string,
  rank: number,
  prizeDist: any,
  totalPrizePool: number = 0,
  stageName?: string
): { prize: number; qualifications: string[] } {
  if (!prizeDist) return { prize: 0, qualifications: [] };

  // Parse if JSON string
  let parsedDist = prizeDist;
  if (typeof prizeDist === 'string') {
    try {
      parsedDist = JSON.parse(prizeDist);
    } catch {
      return { prize: 0, qualifications: [] };
    }
  }

  // Extract all stages / ranks
  let allStages: Array<{ stageName: string; ranks: any[] }> = [];

  if (Array.isArray(parsedDist)) {
    allStages = [{ stageName: 'Grand Finals', ranks: parsedDist }];
  } else if (parsedDist && Array.isArray(parsedDist.stages)) {
    allStages = parsedDist.stages;
  }

  const collectedQuals: string[] = [];

  // Pass 1: Check if this team is explicitly assigned to any prize rows (Cumulative across all stages & awards!)
  let cumulativeAssignedPrize = 0;
  let hasExplicitAssignment = false;

  for (const stage of allStages) {
    if (!Array.isArray(stage.ranks)) continue;
    for (const r of stage.ranks) {
      if (r.teamId && r.teamId === teamId) {
        hasExplicitAssignment = true;
        let rowPrize = Number(r.prize) || 0;
        if (rowPrize === 0 && r.percentage && totalPrizePool > 0) {
          rowPrize = Math.round((Number(r.percentage) / 100) * totalPrizePool);
        }
        cumulativeAssignedPrize += rowPrize;

        if (Array.isArray(r.qualifications)) {
          for (const q of r.qualifications) {
            const qStr = typeof q === 'string' ? q : q.name;
            if (qStr && !collectedQuals.includes(qStr)) collectedQuals.push(qStr);
          }
        }
      }
    }
  }

  if (hasExplicitAssignment) {
    return { prize: cumulativeAssignedPrize, qualifications: collectedQuals };
  }

  // Pass 2: If not explicitly assigned, match by Rank placement
  let targetRanks: any[] = [];
  if (stageName) {
    const matchedStage = allStages.find(
      (s) =>
        s.stageName.toLowerCase().includes(stageName.toLowerCase()) ||
        stageName.toLowerCase().includes(s.stageName.toLowerCase())
    );
    if (matchedStage && Array.isArray(matchedStage.ranks)) {
      targetRanks = matchedStage.ranks;
    }
  }

  if (targetRanks.length === 0) {
    // Look at primary/finals stage first, then all
    const finalsStage = allStages.find((s) => s.stageName.toLowerCase().includes('final'));
    targetRanks = finalsStage ? finalsStage.ranks : allStages.flatMap((s) => s.ranks || []);
  }

  for (const item of targetRanks) {
    if (!item.rank) continue;
    const cleanRankStr = String(item.rank).toLowerCase().trim();

    let isMatch = false;

    // Check range like "17th - 32nd" or "17-32" or "33-64" or "5th - 8th"
    const rangeMatch = cleanRankStr.match(/(\d+)\s*(?:st|nd|rd|th)?\s*[-–—to]+\s*(\d+)/i);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1], 10);
      const max = parseInt(rangeMatch[2], 10);
      if (rank >= min && rank <= max) {
        isMatch = true;
      }
    }

    // Check single rank like "1st", "2nd", "#1", "1", "1st (Champions)"
    if (!isMatch) {
      const singleMatch = cleanRankStr.match(/(?:#|\b)(\d+)(?:st|nd|rd|th)?\b/i);
      if (singleMatch) {
        const targetNum = parseInt(singleMatch[1], 10);
        if (rank === targetNum) {
          isMatch = true;
        }
      }
    }

    // Check "Top X" format like "Top 4" (1..4) or "Top 8" (5..8)
    if (!isMatch) {
      const topMatch = cleanRankStr.match(/top\s*(\d+)/i);
      if (topMatch) {
        const topNum = parseInt(topMatch[1], 10);
        if (rank <= topNum) {
          isMatch = true;
        }
      }
    }

    if (isMatch) {
      let rowPrize = Number(item.prize) || 0;
      if (rowPrize === 0 && item.percentage && totalPrizePool > 0) {
        rowPrize = Math.round((Number(item.percentage) / 100) * totalPrizePool);
      }

      if (Array.isArray(item.qualifications)) {
        for (const q of item.qualifications) {
          const qStr = typeof q === 'string' ? q : q.name;
          if (qStr && !collectedQuals.includes(qStr)) collectedQuals.push(qStr);
        }
      }

      return { prize: rowPrize, qualifications: collectedQuals };
    }
  }

  return { prize: 0, qualifications: collectedQuals };
}

export function TournamentFinalRankingsInput({
  initialRankings = [],
  allTeams = [],
  stageStandingsMap = {},
  prizeDistribution,
  totalPrizePool = 40000000,
  currency = 'INR',
}: TournamentFinalRankingsInputProps) {
  const [rankings, setRankings] = React.useState<FinalTeamRankingItem[]>(() => {
    if (initialRankings.length > 0) return initialRankings;
    return [];
  });

  const availableStages = Object.keys(stageStandingsMap);
  const [selectedStage, setSelectedStage] = React.useState(availableStages[0] || '');

  const [selectedTeamId, setSelectedTeamId] = React.useState('');

  const teamOptions: SearchableSelectOption[] = React.useMemo(() => {
    return allTeams.map((t) => ({
      value: t.id,
      label: t.name,
      subtitle: t.tag ? `[${t.tag}]` : undefined,
      imageUrl: t.logoUrl || undefined,
    }));
  }, [allTeams]);

  // Import a stage lobby and start from rank 1 (or override existing)
  const importStageAsPrimary = (stageName: string) => {
    const standings = stageStandingsMap[stageName] || [];
    if (standings.length === 0) return;

    const imported: FinalTeamRankingItem[] = standings.map((s, idx) => {
      const teamObj = allTeams.find((t) => t.id === s.teamId);
      const rankNum = idx + 1;
      const prizeMatch = calculatePrizeForTeam(
        s.teamId,
        rankNum,
        prizeDistribution,
        totalPrizePool,
        stageName
      );

      return {
        teamId: s.teamId,
        teamName: s.teamName,
        tag: teamObj?.tag || s.tag || undefined,
        logoUrl: teamObj?.logoUrl,
        rank: rankNum,
        prizeWon: prizeMatch.prize,
        qualifications: prizeMatch.qualifications,
      };
    });

    setRankings(imported);
  };

  // Append eliminated teams from another stage (e.g. Semis teams #17..#32, Quarters #33..#64)
  const appendStageEliminated = (stageName: string) => {
    const standings = stageStandingsMap[stageName] || [];
    if (standings.length === 0) return;

    setRankings((prev) => {
      const existingTeamIds = new Set(prev.map((r) => r.teamId));
      // Only take teams that are NOT already in the ranking (i.e. eliminated in this stage)
      const eliminated = standings.filter((s) => !existingTeamIds.has(s.teamId));

      let currentMaxRank = prev.reduce((max, r) => Math.max(max, r.rank), 0);

      const appended: FinalTeamRankingItem[] = eliminated.map((s) => {
        currentMaxRank += 1;
        const teamObj = allTeams.find((t) => t.id === s.teamId);
        const prizeMatch = calculatePrizeForTeam(
          s.teamId,
          currentMaxRank,
          prizeDistribution,
          totalPrizePool,
          stageName
        );

        return {
          teamId: s.teamId,
          teamName: s.teamName,
          tag: teamObj?.tag || s.tag || undefined,
          logoUrl: teamObj?.logoUrl,
          rank: currentMaxRank,
          prizeWon: prizeMatch.prize,
          qualifications: prizeMatch.qualifications,
        };
      });

      return [...prev, ...appended];
    });
  };

  // Auto-calculate / re-calculate prize for all existing teams based on their current rank & stage assignments
  const autoFillPrizesForCurrentRankings = () => {
    setRankings((prev) =>
      prev.map((r) => {
        const prizeMatch = calculatePrizeForTeam(
          r.teamId,
          r.rank,
          prizeDistribution,
          totalPrizePool
        );
        return {
          ...r,
          prizeWon: prizeMatch.prize,
          qualifications:
            prizeMatch.qualifications.length > 0 ? prizeMatch.qualifications : r.qualifications,
        };
      })
    );
  };

  const addTeam = (teamId: string) => {
    if (!teamId) return;
    const teamObj = allTeams.find((t) => t.id === teamId);
    if (!teamObj) return;

    if (rankings.some((r) => r.teamId === teamId)) return;

    const nextRank = rankings.length + 1;
    const prizeMatch = calculatePrizeForTeam(
      teamObj.id,
      nextRank,
      prizeDistribution,
      totalPrizePool
    );

    setRankings((prev) => [
      ...prev,
      {
        teamId: teamObj.id,
        teamName: teamObj.name,
        tag: teamObj.tag || undefined,
        logoUrl: teamObj.logoUrl,
        rank: nextRank,
        prizeWon: prizeMatch.prize,
        qualifications: prizeMatch.qualifications,
      },
    ]);

    setSelectedTeamId('');
  };

  const updateRank = (index: number, rank: number) => {
    setRankings((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], rank };
      return copy;
    });
  };

  const updatePrize = (index: number, prizeWon: number) => {
    setRankings((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], prizeWon };
      return copy;
    });
  };

  const updateQualifications = (index: number, str: string) => {
    const qualifications = str
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    setRankings((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], qualifications };
      return copy;
    });
  };

  const removeTeam = (index: number) => {
    setRankings((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setRankings([]);
  };

  return (
    <div className="space-y-4">
      {/* Hidden field storing data */}
      <input type="hidden" name="teamRankingsJson" value={JSON.stringify(rankings)} />

      {/* Stage-by-Stage Importer Toolbar (Option 3: Hybrid) */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/80 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            <Layers className="w-4 h-4 text-(--ed-blue)" /> Stage-by-Stage Standings &amp; Prize Auto-Fill
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={autoFillPrizesForCurrentRankings}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold transition-colors shadow-xs"
              title="Auto-calculates exact prizes and seeds for all teams matching rank & multi-stage distribution"
            >
              <Calculator className="w-3.5 h-3.5" /> ⚡ Auto-Fill Prizes
            </button>

            {rankings.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-rose-500 hover:underline px-1 font-bold"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {availableStages.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-(--ed-blue) min-w-[200px]"
            >
              {availableStages.map((st) => (
                <option key={st} value={st}>
                  {st} ({stageStandingsMap[st]?.length || 0} teams)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => importStageAsPrimary(selectedStage)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--ed-blue) text-white hover:bg-(--ed-blue) text-xs font-bold transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> Set as Finals (#1–#{stageStandingsMap[selectedStage]?.length || 16})
            </button>

            <button
              type="button"
              onClick={() => appendStageEliminated(selectedStage)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Append Eliminated Teams (Next Ranks)
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic">
            No match scorecards recorded yet. You can manually add teams below or click "⚡ Auto-Fill Prizes" anytime.
          </p>
        )}
      </div>

      {/* Rankings list */}
      {rankings.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {rankings.map((r, idx) => (
            <div
              key={r.teamId || idx}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all shadow-sm ${
                r.rank === 1
                  ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/10'
                  : r.rank === 2
                  ? 'bg-slate-200/40 border-slate-300 dark:bg-slate-800/40 dark:border-slate-700'
                  : r.rank === 3
                  ? 'bg-amber-700/10 border-amber-700/30 dark:bg-amber-700/10'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Rank Badge + Team */}
              <div className="flex items-center gap-2.5 min-w-[200px]">
                <span
                  className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                    r.rank === 1
                      ? 'bg-amber-500 text-white shadow-md'
                      : r.rank === 2
                      ? 'bg-slate-400 text-white'
                      : r.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  #{r.rank}
                </span>

                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                    {r.rank === 1 && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <span>{r.teamName}</span>
                    {r.tag && <span className="text-[10px] text-slate-400">({r.tag})</span>}
                  </div>
                </div>
              </div>

              {/* Editable Rank Number, Cumulative Prize Won & Qualified Seeds */}
              <div className="flex items-center gap-2 flex-1 justify-end flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Rank:</span>
                  <input
                    type="number"
                    value={r.rank}
                    onChange={(e) => updateRank(idx, Number(e.target.value))}
                    className="w-14 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-center font-bold"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Prize ({currency}):</span>
                  <input
                    type="number"
                    value={r.prizeWon || ''}
                    onChange={(e) => updatePrize(idx, Number(e.target.value))}
                    placeholder="0"
                    className="w-28 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-right font-bold"
                  />
                </div>

                <div className="flex items-center gap-1 min-w-[140px] flex-1">
                  <input
                    type="text"
                    defaultValue={(r.qualifications || []).join(', ')}
                    onChange={(e) => updateQualifications(idx, e.target.value)}
                    placeholder="Seed (e.g. PMGC, EWC)"
                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeTeam(idx)}
                  className="text-slate-400 hover:text-rose-500 p-1 transition-colors ml-1"
                  title="Remove from rankings"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
          No team rankings added yet. Choose a stage above to import or add teams manually below.
        </div>
      )}

      {/* Add team dropdown for manual additions */}
      <div className="flex items-center gap-2 pt-1 max-w-sm">
        <SearchableSelect
          options={teamOptions}
          value={selectedTeamId}
          onChange={(val) => {
            if (val) {
              addTeam(val);
              setSelectedTeamId('');
            }
          }}
          placeholder="+ Manually add a team to rankings…"
          size="admin"
        />
      </div>
    </div>
  );
}
