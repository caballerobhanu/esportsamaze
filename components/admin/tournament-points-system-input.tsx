'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, Award, Sliders, Check, Plus, Trash2, Edit3, HelpCircle, Sparkles } from 'lucide-react';
import { POINTS_SYSTEM_PRESETS, type PointsSystemPreset, readKillMultiplier } from '@/lib/tournament-math';

interface TournamentPointsSystemInputProps {
  initialFormatDetails?: any;
}

export function TournamentPointsSystemInput({
  initialFormatDetails,
}: TournamentPointsSystemInputProps) {
  const initialSystemId = initialFormatDetails?.pointsSystem || 'BGIS_OFFICIAL_10';
  const initialMatrix = initialFormatDetails?.placementPoints || null;
  const initialKillPts = readKillMultiplier(initialFormatDetails);
  const initialCustomTitle = initialFormatDetails?.systemName || '';
  const initialCustomDesc = initialFormatDetails?.systemDescription || '';
  const initialOverview = initialFormatDetails?.formatOverview || '';
  const initialRules = initialFormatDetails?.rulesAndTiebreakers || '';

  const [selectedSystem, setSelectedSystem] = useState<string>(initialSystemId);
  const [systemName, setSystemName] = useState<string>(initialCustomTitle);
  const [systemDescription, setSystemDescription] = useState<string>(initialCustomDesc);
  const [formatOverview, setFormatOverview] = useState<string>(initialOverview);
  const [rulesAndTiebreakers, setRulesAndTiebreakers] = useState<string>(initialRules);
  const [killPoints, setKillPoints] = useState<number>(initialKillPts);
  const [maxRanks, setMaxRanks] = useState<number>(() => {
    if (initialMatrix && typeof initialMatrix === 'object') {
      const keys = Object.keys(initialMatrix).map(Number).filter((n) => !isNaN(n));
      if (keys.length > 0) return Math.max(16, ...keys);
    }
    return 16;
  });

  const [customPlacement, setCustomPlacement] = useState<Record<number, number>>(() => {
    if (initialMatrix && typeof initialMatrix === 'object') {
      const parsed: Record<number, number> = {};
      const keys = Object.keys(initialMatrix).map(Number).filter((n) => !isNaN(n));
      const highest = Math.max(16, ...keys);
      for (let r = 1; r <= highest; r++) {
        parsed[r] = initialMatrix[r] !== undefined ? Number(initialMatrix[r]) : 0;
      }
      return parsed;
    }
    const preset = POINTS_SYSTEM_PRESETS.find((p) => p.id === initialSystemId) || POINTS_SYSTEM_PRESETS[0];
    return { ...preset.placementPoints };
  });

  const currentPreset = POINTS_SYSTEM_PRESETS.find((p) => p.id === selectedSystem);

  const handleSystemPresetChange = (systemId: string) => {
    setSelectedSystem(systemId);
    const preset = POINTS_SYSTEM_PRESETS.find((p) => p.id === systemId);
    if (preset && systemId !== 'CUSTOM') {
      setCustomPlacement({ ...preset.placementPoints });
      setKillPoints(preset.killPoints);
      setSystemName(preset.name);
      setSystemDescription(preset.description);
      setMaxRanks(Math.max(16, Object.keys(preset.placementPoints).length));
    }
  };

  const handlePlacementChange = (rank: number, points: number) => {
    setCustomPlacement((prev) => ({
      ...prev,
      [rank]: Math.max(0, points),
    }));
    if (selectedSystem !== 'CUSTOM') {
      setSelectedSystem('CUSTOM');
    }
  };

  const addRankRow = () => {
    const nextRank = maxRanks + 1;
    setMaxRanks(nextRank);
    setCustomPlacement((prev) => ({
      ...prev,
      [nextRank]: 0,
    }));
    if (selectedSystem !== 'CUSTOM') {
      setSelectedSystem('CUSTOM');
    }
  };

  const removeLastRankRow = () => {
    if (maxRanks <= 8) return;
    const rankToRemove = maxRanks;
    setMaxRanks((prev) => prev - 1);
    setCustomPlacement((prev) => {
      const next = { ...prev };
      delete next[rankToRemove];
      return next;
    });
    if (selectedSystem !== 'CUSTOM') {
      setSelectedSystem('CUSTOM');
    }
  };

  // Compile full JSON payload with custom title and wording
  const compiledFormatDetails = useMemo(() => {
    return {
      pointsSystem: selectedSystem,
      systemName: systemName.trim() || currentPreset?.name || 'Official Points System',
      systemDescription: systemDescription.trim(),
      formatOverview: formatOverview.trim(),
      rulesAndTiebreakers: rulesAndTiebreakers.trim(),
      placementPoints: customPlacement,
      killPointsPerElim: Number(killPoints) || 1,
      killPoints: Number(killPoints) || 1,
      ...(initialFormatDetails?.calendarPhases ? { calendarPhases: initialFormatDetails.calendarPhases } : {}),
      ...(initialFormatDetails?.featuredStage ? { featuredStage: initialFormatDetails.featuredStage } : {}),
      ...(initialFormatDetails?.backdropText ? { backdropText: initialFormatDetails.backdropText } : {}),
      ...(initialFormatDetails?.stageFormats ? { stageFormats: initialFormatDetails.stageFormats } : {}),
      ...(initialFormatDetails?.headerCards ? { headerCards: initialFormatDetails.headerCards } : {}),
      ...(initialFormatDetails?.tiebreakerTiers ? { tiebreakerTiers: initialFormatDetails.tiebreakerTiers } : {}),
      ...(initialFormatDetails?.stages ? { stages: initialFormatDetails.stages } : {}),
    };
  }, [selectedSystem, systemName, systemDescription, formatOverview, rulesAndTiebreakers, customPlacement, killPoints, initialFormatDetails]);

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue) transition-all';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1';

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name="formatDetailsJson"
        value={JSON.stringify(compiledFormatDetails)}
      />

      {/* Preset Quick Loader */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Presets Quick Loader:
          </span>
          <select
            value={selectedSystem}
            onChange={(e) => handleSystemPresetChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-(--ed-blue) cursor-pointer"
          >
            {POINTS_SYSTEM_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-[11px] text-slate-500">
          Selecting a preset loads defaults — you can customize all titles, rules, and point values below.
        </span>
      </div>

      {/* Fully Editable System Name & Kill Points */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Customizable Title */}
        <div className="md:col-span-8">
          <label className={labelCls}>Points System Custom Title / Name *</label>
          <div className="relative">
            <input
              type="text"
              value={systemName}
              onChange={(e) => {
                setSystemName(e.target.value);
                if (selectedSystem !== 'CUSTOM') setSelectedSystem('CUSTOM');
              }}
              placeholder={currentPreset?.name || 'e.g. BGIS 2026 Official Scoring System'}
              className={inputCls + ' font-semibold'}
            />
            <Edit3 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Change this wording on the go to match your event, sponsor, or league branding.
          </p>
        </div>

        {/* Kill / Finish Points */}
        <div className="md:col-span-4">
          <label className={labelCls}>Kill / Finish Points Multiplier *</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={killPoints}
              onChange={(e) => setKillPoints(parseFloat(e.target.value) || 0)}
              className={inputCls + ' font-mono font-bold'}
            />
            <span className="text-xs text-slate-500 font-bold shrink-0">pt / kill</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Default is 1 pt per kill.</p>
        </div>
      </div>

      {/* Custom Rules / Tiebreaker Notes */}
      <div>
        <label className={labelCls}>Points Table Rules &amp; Tiebreaker Notes (Optional)</label>
        <textarea
          rows={2}
          value={systemDescription}
          onChange={(e) => {
            setSystemDescription(e.target.value);
            if (selectedSystem !== 'CUSTOM') setSelectedSystem('CUSTOM');
          }}
          placeholder="e.g. 1 pt per kill. WWCD gets 10 pts. Ties broken by total WWCDs, followed by total placement points and last match placement."
          className={inputCls + ' resize-none'}
        />
      </div>

      {/* Placement Matrix Grid (Dynamic Ranks 1 to N) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-(--ed-blue)" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Placement Points Breakdown (Rank 1 – {maxRanks})
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
              {maxRanks} Ranks
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addRankRow}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Add Rank slot (e.g. for 18, 20, or 24-team lobbies)"
            >
              <Plus className="w-3.5 h-3.5" /> Add Rank (#{maxRanks + 1})
            </button>

            {maxRanks > 16 && (
              <button
                type="button"
                onClick={removeLastRankRow}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold transition-colors cursor-pointer"
                title="Remove highest rank slot"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove #{maxRanks}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-12 gap-2">
          {Array.from({ length: maxRanks }, (_, i) => i + 1).map((rank) => (
            <div
              key={rank}
              className={`p-2 rounded-xl border text-center transition-all ${
                rank === 1
                  ? 'border-amber-400/50 bg-amber-500/10'
                  : rank === 2
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-200/40 dark:bg-slate-800/40'
                  : rank === 3
                  ? 'border-amber-700/40 bg-amber-700/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                {rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `#${rank}`}
              </div>
              <input
                type="number"
                min={0}
                max={200}
                value={customPlacement[rank] ?? 0}
                onChange={(e) => handlePlacementChange(rank, parseInt(e.target.value) || 0)}
                className="w-full text-center text-sm font-mono font-black bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-(--ed-blue) rounded text-slate-900 dark:text-white"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Format Overview & Editorial Rules (Format Tab Editorial) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-(--ed-blue)" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Format Tab Editorial & Custom Rules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Format Overview & Progression Narrative</label>
            <textarea
              rows={4}
              value={formatOverview}
              onChange={(e) => setFormatOverview(e.target.value)}
              placeholder="e.g. 64 teams divided into 4 groups. Top 8 from each group advance directly to Grand Finals, while remaining teams battle through Survival and Last Chance stages..."
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Summarizes the tournament progression structure in the public Format Tab.
            </p>
          </div>

          <div>
            <label className={labelCls}>Tiebreaker & Specific Match Rules</label>
            <textarea
              rows={4}
              value={rulesAndTiebreakers}
              onChange={(e) => setRulesAndTiebreakers(e.target.value)}
              placeholder="e.g. 1. Total WWCD count&#10;2. Total Placement Points&#10;3. Total Finish/Kill Points&#10;4. Best placement in final match of the stage"
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Displayed in the official rules and tiebreaker cards on the tournament Format Tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
