/**
 * The signed admin session payload — pure and edge-safe.
 *
 * Both the Node auth module (`lib/admin-auth.ts`) and the edge gate (`proxy.ts`)
 * encode and decode the payload here, so the token format cannot drift between
 * the two (they each implement the HMAC with their own crypto).
 */
import type { AdminRole } from '@/lib/admin-permissions';

export interface AdminSessionPayload {
  /** AdminUser id, or `owner` for the env-password owner account. */
  u: string;
  /** Roles held (OWNER / EDITOR / DATA). */
  r: AdminRole[];
  /** Issued-at, whole seconds. */
  i: number;
}

/** The id the env-password owner session carries. */
export const OWNER_USER_ID = 'owner';

// btoa/atob and TextEncoder/TextDecoder are globals in both the Node and the
// edge runtimes, so this needs no environment-specific import.
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string | null {
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeSessionPayload(payload: AdminSessionPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSessionPayload(encoded: string): AdminSessionPayload | null {
  const json = fromBase64Url(encoded);
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as Partial<AdminSessionPayload>;
    if (typeof parsed.u !== 'string' || !parsed.u) return null;
    if (typeof parsed.i !== 'number' || !Number.isFinite(parsed.i) || parsed.i <= 0) return null;
    const roles = Array.isArray(parsed.r)
      ? parsed.r.filter((role): role is AdminRole => typeof role === 'string')
      : [];
    return { u: parsed.u, r: roles, i: parsed.i };
  } catch {
    return null;
  }
}
