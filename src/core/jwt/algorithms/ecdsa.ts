import { importSPKI, importPKCS8 } from 'jose';
import { signWithKey, verifyWithKey, type VerifyResult } from './shared';

export async function ecdsaSign(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKeyPem: string,
  alg: string
): Promise<string> {
  const key = await importPKCS8(privateKeyPem, alg);
  return signWithKey(header, payload, key);
}

export async function ecdsaVerify(
  token: string,
  publicKeyPem: string,
  alg: string
): Promise<VerifyResult> {
  try {
    const key = await importSPKI(publicKeyPem, alg);
    return verifyWithKey(token, key);
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Invalid public key' };
  }
}
