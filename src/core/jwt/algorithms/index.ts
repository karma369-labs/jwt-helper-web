import { hmacSign, hmacVerify } from './hmac';
import { rsaSign, rsaVerify } from './rsa';
import { ecdsaSign, ecdsaVerify } from './ecdsa';
import type { VerifyResult } from './shared';

export type KeyInputType = 'secret' | 'pem-pair';

/** Everything a key-input form might need to supply, per algorithm family. */
export interface KeyMaterial {
  secret?: string;
  publicKey?: string;
  privateKey?: string;
}

export interface AlgHandler {
  keyInputType: KeyInputType;
  sign: (
    header: Record<string, unknown>,
    payload: Record<string, unknown>,
    key: KeyMaterial
  ) => Promise<string>;
  verify: (token: string, key: KeyMaterial) => Promise<VerifyResult>;
}

/**
 * Registry: alg name -> handler. To add a new algorithm, add one entry here
 * (plus its family module if it's a new family). No other file needs to change.
 */
export const algorithms: Record<string, AlgHandler> = {
  HS256: {
    keyInputType: 'secret',
    sign: (h, p, k) => hmacSign(h, p, k.secret ?? ''),
    verify: (t, k) => hmacVerify(t, k.secret ?? ''),
  },
  HS384: {
    keyInputType: 'secret',
    sign: (h, p, k) => hmacSign(h, p, k.secret ?? ''),
    verify: (t, k) => hmacVerify(t, k.secret ?? ''),
  },
  HS512: {
    keyInputType: 'secret',
    sign: (h, p, k) => hmacSign(h, p, k.secret ?? ''),
    verify: (t, k) => hmacVerify(t, k.secret ?? ''),
  },
  RS256: {
    keyInputType: 'pem-pair',
    sign: (h, p, k) => rsaSign(h, p, k.privateKey ?? '', 'RS256'),
    verify: (t, k) => rsaVerify(t, k.publicKey ?? '', 'RS256'),
  },
  RS384: {
    keyInputType: 'pem-pair',
    sign: (h, p, k) => rsaSign(h, p, k.privateKey ?? '', 'RS384'),
    verify: (t, k) => rsaVerify(t, k.publicKey ?? '', 'RS384'),
  },
  RS512: {
    keyInputType: 'pem-pair',
    sign: (h, p, k) => rsaSign(h, p, k.privateKey ?? '', 'RS512'),
    verify: (t, k) => rsaVerify(t, k.publicKey ?? '', 'RS512'),
  },
  ES256: {
    keyInputType: 'pem-pair',
    sign: (h, p, k) => ecdsaSign(h, p, k.privateKey ?? '', 'ES256'),
    verify: (t, k) => ecdsaVerify(t, k.publicKey ?? '', 'ES256'),
  },
  ES384: {
    keyInputType: 'pem-pair',
    sign: (h, p, k) => ecdsaSign(h, p, k.privateKey ?? '', 'ES384'),
    verify: (t, k) => ecdsaVerify(t, k.publicKey ?? '', 'ES384'),
  },
  ES512: {
    keyInputType: 'pem-pair',
    sign: (h, p, k) => ecdsaSign(h, p, k.privateKey ?? '', 'ES512'),
    verify: (t, k) => ecdsaVerify(t, k.publicKey ?? '', 'ES512'),
  },
};

export const algorithmNames = Object.keys(algorithms);
