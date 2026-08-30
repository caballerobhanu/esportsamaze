'use client';

import React from 'react';
import { Trophy, Award, Sliders, Check } from 'lucide-react';
import { POINTS_SYSTEM_PRESETS, PointsSystemPreset } from '@/lib/tournament-math';

interface TournamentPointsSystemInputProps {
  initialFormatDetails?: any;
}

export function TournamentPointsSystemInput({
  initialFormatDetails,
}: TournamentPointsSystemInputProps) {
  const initialSystemId = initialFormatDetails?.pointsSystem || 'BGIS_OFFICIAL_10';
  const initialMatrix = initialFormatDetails?.placementPoints || null;
  const initialKillPts = initialFormatDetails?.killPoints ?? 1;

  const [selectedSystem, setSelectedSystem] = React.useState<string>(initialSystemId);
  const [killPoints, setKillPoints] = React.useState<number>(initialKillPts);
  const [customPlacement, setCustomPlacement] = React.useState<Record<number, number>>(() => {
    if (initialMatrix && typeof initialMatrix === 'object') {
      const parsed: Record<number, number> = {};
      for (let r = 1; r <= 16; r++) {
        parsed[r] = initialMatrix[r] !== undefined ? Number(initialMatrix[r]) : 0;
      }
      return parsed;
    }
    const preset = POINTS_SYSTEM_PRESETS.find((p) => p.id === initialSystemId) || POINTS_SYSTEM_PRESETS[0];
    return { ...preset.placementPoints };
  });

  const handleSystemChange = (systemId: string) => {
    setSelectedSystem(systemId);
    const preset = POINTS_SYSTEM_PRESETS.find((p) => p.id === systemId);
    if (preset && systemId !== 'CUSTOM') {
      setCustomPlacement({ ...preset.placementPoints });
      setKillPoints(preset.killPoints);
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

  // Compile JSON value
  const compiledFormatDetails = React.useMemo(() => {
    return {
      pointsSystem: selectedSystem,
      placementPoints: customPlacement,
      killPoints: Number(killPoints) || 1,
    };
  }, [selectedSystem, customPlacement, killPoints]);

  const currentPreset = POINTS_SYSTEM_PRESETS.find((p) => p.id === selectedSystem) || POINTS_SYSTEM_PRESETS[0];

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name="formatDetailsJson"
        value={JSON.stringify(compiledFormatDetails)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Preset Selector */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Points Scoring System *
          </label>
          <select
            value={selectedSystem}
            onChange={(e) => handleSystemChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A5FC4] cursor-pointer"
          >
            {POINTS_SYSTEM_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                🏆 {p.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">{currentPreset.description}</p>
        </div>

        {/* Kill Points Multiplier */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Kill / Finish Points
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={killPoints}
              onChange={(e) => setKillPoints(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]"
            />
            <span className="text-xs text-slate-500 font-bold shrink-0">pt / kill</span>
          </div>
        </div>
      </div>

      {/* Placement Matrix Grid (1st to 16th rank) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#0A5FC4]" /> Placement Points Breakdown (Rank 1 – 16)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {selectedSystem === 'CUSTOM' ? '⚙️ Custom Adjusted' : '🔒 Standard Preset'}
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {Array.from({ length: 16 }, (_, i) => i + 1).map((rank) => (
            <div
              key={rank}
              className={`p-1.5 rounded-lg border text-center transition-all ${
                rank === 1
                  ? 'border-amber-400/40 bg-amber-500/10'
                  : rank === 2
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800/50'
                  : rank === 3
                  ? 'border-amber-700/30 bg-amber-700/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="text-[9px] font-bold uppercase text-slate-400">
                {rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `#${rank}`}
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={customPlacement[rank] ?? 0}
                onChange={(e) => handlePlacementChange(rank, parseInt(e.target.value) || 0)}
                className="w-full text-center text-xs font-mono font-black bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[#0A5FC4] rounded"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
