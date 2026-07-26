import { CompactSign, compactVerify, type CryptoKey, type KeyObject } from 'jose';

export type KeyLike = CryptoKey | KeyObject;

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

/** Sign header+payload with any jose-compatible key (Uint8Array secret or KeyLike). */
export async function signWithKey(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  key: Uint8Array | KeyLike
): Promise<string> {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const jws = await new CompactSign(payloadBytes)
    .setProtectedHeader(header as any)
    .sign(key);
  return jws;
}

/** Verify a compact JWS against any jose-compatible key. Never throws — returns a result object. */
export async function verifyWithKey(
  token: string,
  key: Uint8Array | KeyLike
): Promise<VerifyResult> {
  try {
    await compactVerify(token, key);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Verification failed' };
  }
}
