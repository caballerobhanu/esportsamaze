import React from 'react';
import {
  ScrollText,
  Layers,
  Award,
  Smartphone,
  Gamepad2,
  Trophy,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface EstaticFormatPanelProps {
  stages: Array<{
    id: string;
    sequence: number;
    name: string;
    stageType?: string | null;
    formatType?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }>;
  pointsMatrix?: Record<string, number>;
  killPoints?: number;
  gameMode?: string | null;
  eventType?: string | null;
  device?: string | null;
}

export function EstaticFormatPanel({
  stages,
  pointsMatrix = {
    '1': 10,
    '2': 6,
    '3': 5,
    '4': 4,
    '5': 3,
    '6': 2,
    '7': 1,
    '8': 1,
  },
  killPoints = 1,
  gameMode = 'Battle Royale Squads TPP',
  eventType = 'LAN Stage',
  device = 'Official Tournament Device',
}: EstaticFormatPanelProps) {
  return (
    <div className="space-y-8">
      {/* Format Header Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Competition Mode
            </span>
            <Gamepad2 className="h-4 w-4 text-[#0A5FC4]" />
          </div>
          <h4 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
            {gameMode}
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-400">Standard 16-Team Lobby</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Elimination Reward
            </span>
            <Award className="h-4 w-4 text-[#0A5FC4]" />
          </div>
          <h4 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
            +{killPoints} Point per Kill
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-400">Full Bounty Multiplier</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Tournament Environment
            </span>
            <Smartphone className="h-4 w-4 text-[#0A5FC4]" />
          </div>
          <h4 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
            {eventType}
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-400">{device}</p>
        </div>
      </div>

      {/* Stage Progression Architecture */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Structure & Roadmap
            </p>
            <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
              <Layers className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
              Stage Progression Structure
            </h3>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((st, idx) => (
            <div
              key={st.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition-all duration-300 hover:border-[#0A5FC4] hover:shadow-md dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Stage #{st.sequence || idx + 1}
                </span>
                <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
                  {st.stageType || st.formatType || 'Official Stage'}
                </span>
              </div>
              <h4 className="mt-3 text-base font-black tracking-tight text-slate-900 dark:text-white group-hover:text-[#0A5FC4] transition-colors">
                {st.name}
              </h4>
              <p className="mt-2 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Advancing Qualified Squads
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring Matrix Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Points Table Rule
          </p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
            <ScrollText className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
            Official Placement Points Matrix
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Object.entries(pointsMatrix).map(([rank, pts]) => (
            <div
              key={rank}
              className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center dark:border-white/10 dark:bg-white/5"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                #{rank} Place
              </span>
              <span className="mt-1 text-2xl font-black text-[#0A5FC4] dark:text-blue-300">
                {pts}
              </span>
              <span className="text-[10px] font-bold text-slate-400">pts</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
