export type ClaimFormat = 'unix-date' | 'string' | 'list';

export interface ClaimMeta {
  label: string;
  format: ClaimFormat;
}

/** Registered JWT claims (RFC 7519 §4.1). Add new recognized claims here — no UI changes needed. */
export const standardClaims: Record<string, ClaimMeta> = {
  iss: { label: 'Issuer', format: 'string' },
  sub: { label: 'Subject', format: 'string' },
  aud: { label: 'Audience', format: 'list' },
  exp: { label: 'Expiration Time', format: 'unix-date' },
  nbf: { label: 'Not Before', format: 'unix-date' },
  iat: { label: 'Issued At', format: 'unix-date' },
  jti: { label: 'JWT ID', format: 'string' },
};

/** Registered JOSE header parameters (RFC 7515 §4.1). */
export const headerClaims: Record<string, ClaimMeta> = {
  alg: { label: 'Algorithm', format: 'string' },
  typ: { label: 'Token Type', format: 'string' },
  kid: { label: 'Key ID', format: 'string' },
  cty: { label: 'Content Type', format: 'string' },
};

export interface ExpiryStatus {
  hasExpiry: boolean;
  expired: boolean;
  date?: Date;
}

/** Read the `exp` claim and report whether the token is expired, without throwing. */
export function getExpiryStatus(payload: Record<string, unknown>): ExpiryStatus {
  const exp = payload.exp;
  if (typeof exp !== 'number') return { hasExpiry: false, expired: false };
  const date = new Date(exp * 1000);
  return { hasExpiry: true, expired: date.getTime() < Date.now(), date };
}


function formatValue(value: unknown, format: ClaimFormat): string {
  if (format === 'unix-date' && typeof value === 'number') {
    return new Date(value * 1000).toLocaleString();
  }
  if (format === 'list' && Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

export interface ClaimRow {
  key: string;
  label: string;
  value: string;
  recognized: boolean;
}

/** Build display rows for the "Claims Breakdown" view — recognized claims get a label + formatted value. */
export function buildClaimRows(
  obj: Record<string, unknown>,
  table: Record<string, ClaimMeta>
): ClaimRow[] {
  return Object.entries(obj).map(([key, value]) => {
    const meta = table[key];
    return {
      key,
      label: meta?.label ?? key,
      value: meta ? formatValue(value, meta.format) : JSON.stringify(value),
      recognized: Boolean(meta),
    };
  });
}
