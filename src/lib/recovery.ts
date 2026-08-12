/**
 * Password-recovery deep-link parsing.
 * Pure — no React Native imports — so it is unit-testable anywhere.
 */

export interface RecoveryTokens {
  access_token: string;
  refresh_token: string;
}

/**
 * Parse a Supabase recovery link and return usable tokens, or null.
 *
 * - Reads tokens from EITHER the `#` fragment or the `?` query string
 *   (`#` wins when both are present).
 * - Requires `type=recovery` — magic-link / signup links are rejected.
 * - Rejects links whose `expires_at` (seconds since epoch) is in the past.
 * - Decodes URI-encoded values.
 */
export function parseRecoveryUrl(url: string | null | undefined): RecoveryTokens | null {
  if (!url) return null;

  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const raw =
    hashIdx !== -1
      ? url.slice(hashIdx + 1)
      : queryIdx !== -1
        ? url.slice(queryIdx + 1)
        : null;
  if (!raw) return null;

  const fields: Record<string, string> = {};
  for (const pair of raw.split("&")) {
    const eq = pair.indexOf("=");
    if (eq === -1) {
      fields[pair] = "";
      continue;
    }
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    try {
      fields[key] = decodeURIComponent(value);
    } catch {
      fields[key] = value;
    }
  }

  // Only password-recovery links are accepted; magic links are rejected.
  if (fields.type !== "recovery") return null;

  // Guard against an already-expired link (expires_at is unix seconds).
  if (fields.expires_at) {
    const expires = Number(fields.expires_at);
    if (Number.isFinite(expires) && expires <= Date.now() / 1000) return null;
  }

  if (fields.access_token && fields.refresh_token) {
    return { access_token: fields.access_token, refresh_token: fields.refresh_token };
  }
  return null;
}
