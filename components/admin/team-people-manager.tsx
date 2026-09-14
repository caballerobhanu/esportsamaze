'use client';

import * as React from 'react';
import { CheckCircle2, Crown, Trash2, UserPlus, Users } from 'lucide-react';
import { Combobox } from '@/components/admin/combobox';

const STAFF_ROLES = ['Head Coach', 'Coach', 'Assistant Coach', 'Analyst', 'Manager', 'Content Creator'];
const PLAYER_ROLES = ['Assaulter', 'IGL', 'Support', 'Sniper', 'Flex'];

interface TeamPerson {
  id: string;
  ign: string;
  slug: string | null;
  role: string | null;
  staffRole: string | null;
  isPlayer: boolean;
}

/**
 * Manage who is attached to a team: see the current people, attach an existing
 * player record, create a brand-new staff / organisation person, or unlink
 * someone. Player rows are kept — unlink only clears `currentTeamId`.
 */
export function TeamPeopleManager({
  teamId,
  players,
  attachAction,
  createAction,
  removeAction,
}: {
  teamId: string;
  players: TeamPerson[];
  attachAction: (formData: FormData) => void | Promise<void>;
  createAction: (formData: FormData) => void | Promise<void>;
  removeAction: (formData: FormData) => void | Promise<void>;
}) {
  const [staffRole, setStaffRole] = React.useState('');

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-(--ed-blue)" />
        <h2 className="text-sm font-black uppercase tracking-tight">People &amp; roster</h2>
      </div>

      {/* Current people */}
      {players.length > 0 ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {players.map((person) => (
            <div
              key={person.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold">{person.ign}</span>
                <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {person.isPlayer
                    ? person.role || 'Player'
                    : person.staffRole || 'Organisation'}
                  {person.isPlayer && person.staffRole ? ` · ${person.staffRole}` : ''}
                </span>
              </span>
              {person.isPlayer && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
              <form action={removeAction}>
                <input type="hidden" name="teamId" value={teamId} />
                <input type="hidden" name="playerId" value={person.id} />
                <button
                  type="submit"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title={`Unlink ${person.ign}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No people attached to this team yet.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Attach existing person */}
        <form action={attachAction} className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
          <input type="hidden" name="teamId" value={teamId} />
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attach existing player</p>
          <Combobox
            name="playerId"
            options={[]}
            searchUrl="/api/admin/search?type=player"
            placeholder="Search players by IGN…"
            ariaLabel="Player"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Role</label>
              <select name="role" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs">
                <option value="">—</option>
                {PLAYER_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Staff role</label>
              <select name="staffRole" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs">
                <option value="">—</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input type="checkbox" name="isPlayer" defaultChecked className="accent-(--ed-blue)" />
            This person is a playing roster member
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) hover:brightness-110 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Attach
          </button>
        </form>

        {/* Create new person */}
        <form action={createAction} className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
          <input type="hidden" name="teamId" value={teamId} />
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Create new person</p>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">IGN *</label>
            <input
              name="ign"
              required
              placeholder="e.g. Coach Jimmy"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Role</label>
              <input name="role" placeholder="IGL / Coach…" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Staff role</label>
              <select
                name="staffRole"
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs"
              >
                <option value="">—</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input type="checkbox" name="isPlayer" defaultChecked={false} className="accent-(--ed-blue)" />
            This person is a playing roster member
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:brightness-110 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Create
          </button>
        </form>
      </div>
    </div>
  );
}