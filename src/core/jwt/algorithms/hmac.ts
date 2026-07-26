import { signWithKey, verifyWithKey, type VerifyResult } from './shared';

/** HMAC secret input: plain string, UTF-8 encoded (matches jwt.io behavior). */
function secretToKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function hmacSign(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  return signWithKey(header, payload, secretToKey(secret));
}

export async function hmacVerify(token: string, secret: string): Promise<VerifyResult> {
  return verifyWithKey(token, secretToKey(secret));
}
