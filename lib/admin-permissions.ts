/**
 * Admin roles and capabilities — pure and edge-safe.
 *
 * Imported by `proxy.ts` (edge runtime), the admin nav (client) and server code,
 * so it must never reach for Node built-ins or Prisma. It is the single source
 * of truth for "who may open what".
 */

export type AdminRole = 'OWNER' | 'EDITOR' | 'DATA';

export const ADMIN_ROLES: AdminRole[] = ['OWNER', 'EDITOR', 'DATA'];

/** Roles a contributor account may hold. OWNER is the env-password account only. */
export const CONTRIBUTOR_ROLES: AdminRole[] = ['EDITOR', 'DATA'];

export const ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: 'Owner',
  EDITOR: 'Editor',
  DATA: 'Tournaments & Data',
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  OWNER: 'Everything, including site settings, analytics and user management.',
  EDITOR: 'News, home-page curation, comments, tags and media.',
  DATA: 'Tournaments, matches and scores, teams, players, transfers, totals, KRAFTON and reference data.',
};

export type Capability =
  | 'dashboard'
  | 'news'
  | 'comments'
  | 'tags'
  | 'media'
  | 'data'
  | 'analytics'
  | 'settings'
  | 'users'
  /** Delete or purge records. Held by the OWNER alone. */
  | 'destructive';

export const ALL_CAPABILITIES: Capability[] = [
  'dashboard',
  'news',
  'comments',
  'tags',
  'media',
  'data',
  'analytics',
  'settings',
  'users',
  'destructive',
];

/** Which capabilities one role grants. OWNER holds every capability. */
export const ROLE_CAPABILITIES: Record<AdminRole, Capability[]> = {
  OWNER: ALL_CAPABILITIES,
  EDITOR: ['dashboard', 'news', 'comments', 'tags', 'media'],
  DATA: ['dashboard', 'data', 'media'],
};

export function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as string[]).includes(value);
}

/** The union of capabilities across the roles held. Unknown roles are ignored. */
export function capabilitiesForRoles(roles: readonly string[]): Set<Capability> {
  const out = new Set<Capability>();
  for (const role of roles) {
    if (!isAdminRole(role)) continue;
    for (const capability of ROLE_CAPABILITIES[role]) out.add(capability);
  }
  return out;
}

/**
 * Whether a role set satisfies a capability.
 *
 * `dashboard` is granted to every signed-in account so a roleless or
 * data-only account always has somewhere to land.
 */
export function hasCapabilityIn(roles: readonly string[], capability: Capability): boolean {
  if (capability === 'dashboard') return true;
  return capabilitiesForRoles(roles).has(capability);
}

/** Longest-prefix wins, so `/admin/matches/matrix` resolves to its own entry. */
const PATH_CAPABILITIES: Array<[string, Capability]> = [
  ['/admin/settings', 'settings'],
  ['/admin/analytics', 'analytics'],
  ['/admin/users', 'users'],
  ['/admin/trash', 'destructive'],
  ['/admin/news', 'news'],
  ['/admin/coverage-pack', 'news'],
  ['/admin/home', 'news'],
  ['/admin/comments', 'comments'],
  ['/admin/tags', 'tags'],
  ['/admin/media', 'media'],
  ['/admin/tournaments', 'data'],
  ['/admin/matches', 'data'],
  ['/admin/teams', 'data'],
  ['/admin/players', 'data'],
  ['/admin/transfers', 'data'],
  ['/admin/totals', 'data'],
  ['/admin/krafton', 'data'],
  ['/admin/regions', 'data'],
  ['/admin/games', 'data'],
  ['/admin/organizers', 'data'],
  ['/admin/sponsors', 'data'],
  ['/admin/venues', 'data'],
];

/** The capability an `/admin/...` path needs. Falls back to the dashboard. */
export function capabilityForAdminPath(adminPath: string): Capability {
  const path = adminPath.split('?')[0];
  for (const [prefix, capability] of PATH_CAPABILITIES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return capability;
  }
  return 'dashboard';
}

export function canAccessAdminPath(roles: readonly string[], adminPath: string): boolean {
  return hasCapabilityIn(roles, capabilityForAdminPath(adminPath));
}

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

/** Lower-case, 3–32 chars of `a-z 0-9 . _ -`. */
export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}
