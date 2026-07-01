/**
 * License activation — compatible with `assets/ativador - Copy.html` (MONICA 2.0 generator).
 *
 * Key format:  MONICA-<D><TIMESTAMP><C>
 *   D          1 char  — duration: '1' = 30 days, '3' = 90 days, 'Y' = 365 days
 *   TIMESTAMP  10 digits — Unix seconds at generation (informational only)
 *   C          1 digit  — checksum = (Σ parseInt(char, 36) over D+TIMESTAMP) % 10
 *
 * Validity starts at FIRST ACTIVATION (not at generation), per the generator's note.
 * Storage is NOT handled here — the activation record lives in the per-company synced
 * snapshot (DataContext → Supabase business_state), so a license covers the whole company.
 */

const DURATION_DAYS: Record<string, number> = { '1': 30, '3': 90, Y: 365 };

export interface ParsedKey {
  key: string; // normalised (no separators, uppercase)
  duration: string;
  durationDays: number;
}

/** Activation record stored in the per-company snapshot. */
export interface ActivationRecord {
  key: string;
  activatedAt: string; // ISO — when first activated
  durationDays: number;
}

export interface ActivationStatus {
  activated: boolean;
  expired: boolean;
  expiresAt: Date | null;
  durationDays: number;
  key: string | null;
}

/** Validate a raw key string against the MONICA checksum. Returns null when invalid. */
export function parseKey(raw: string): ParsedKey | null {
  const clean = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean.startsWith('MONICA')) return null;
  const body = clean.substring(6, 18); // D(1) + TIMESTAMP(10) + C(1)
  if (body.length !== 12) return null;
  if (!/^[0-9]$/.test(body[11])) return null;

  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const val = parseInt(body[i], 36);
    sum += isNaN(val) ? 0 : val;
  }
  if (sum % 10 !== Number(body[11])) return null;

  const duration = body[0];
  const durationDays = DURATION_DAYS[duration];
  if (!durationDays) return null;

  return { key: clean, duration, durationDays };
}

/** Build a fresh activation record (validity starts now). */
export function makeRecord(parsed: ParsedKey): ActivationRecord {
  return { key: parsed.key, activatedAt: new Date().toISOString(), durationDays: parsed.durationDays };
}

/** Derive the live status from a stored record. */
export function computeStatus(rec: ActivationRecord | null | undefined): ActivationStatus {
  if (!rec) return { activated: false, expired: false, expiresAt: null, durationDays: 0, key: null };
  const expiresAt = new Date(new Date(rec.activatedAt).getTime() + rec.durationDays * 86400000);
  return {
    activated: true,
    expired: Date.now() > expiresAt.getTime(),
    expiresAt,
    durationDays: rec.durationDays,
    key: rec.key,
  };
}
