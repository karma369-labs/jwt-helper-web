/**
 * Single source of truth for per-route SEO metadata and FAQ content.
 * Drives the prerendered head, sitemap.xml, the on-page h1/lead/FAQ, and <Seo>.
 * Adding a route here plus a <Route> in App.tsx is all a new page needs.
 */

export const SITE_ORIGIN = 'https://jwtdev.com';

export interface Faq {
  question: string;
  answer: string;
}

export interface RouteSeo {
  /** Route path; also the sitemap `loc` and the prerender output directory. */
  path: string;
  title: string;
  description: string;
  /** Visible <h1>, distinct per page — the strongest on-page relevance signal. */
  h1: string;
  /** Lead paragraph under the h1. Real prose, not keyword filler. */
  intro: string;
  /** Rendered as an accordion and emitted as FAQPage JSON-LD for rich snippets. */
  faqs: Faq[];
  /** Bump by hand when content materially changes — not from the build date, or it stops meaning anything. */
  lastmod: string;
}

export const routes: RouteSeo[] = [
  {
    path: '/',
    title: 'JWT Debugger — Decode, Verify & Generate JSON Web Tokens',
    description:
      'Free, open-source JWT debugger. Decode, verify, and generate JSON Web Tokens (HS256/384/512, RS256/384/512, ES256/384/512) entirely in your browser — tokens and keys never leave your machine.',
    h1: 'Decode, Verify & Generate JSON Web Tokens',
    intro:
      'Paste a JSON Web Token to decode its header and payload instantly, then add a secret or public key to verify the signature. Nothing leaves your browser.',
    lastmod: '2026-08-20',
    faqs: [
      {
        question: 'Is it safe to paste my JWT and keys into this site?',
        answer:
          'Yes — everything runs client-side in your browser. Tokens, secrets, and keys are never sent to a server; there is no backend at all. You can confirm this yourself by opening the Network tab in your browser’s developer tools and watching that nothing is transmitted as you type.',
      },
      {
        question: 'What is a JWT?',
        answer:
          'A JSON Web Token is a compact, URL-safe way to represent claims between two parties. It has three base64url-encoded parts separated by dots: a header naming the signing algorithm, a payload carrying the claims, and a signature that lets the receiver confirm the token has not been altered.',
      },
      {
        question: 'What is the difference between HS256 and RS256?',
        answer:
          'HS256 is symmetric: the same secret both signs and verifies, so anyone able to verify a token can also forge one. RS256 is asymmetric: a private key signs and a separate public key verifies, so you can distribute verification ability without granting the power to issue tokens.',
      },
      {
        question: 'Why does my JWT show "invalid signature"?',
        answer:
          'Usually the key does not match the one used to sign the token, the token was modified after signing, or the selected algorithm differs from the one named in the header. For PEM keys, check that line breaks and the BEGIN/END armour were pasted intact — a single missing newline invalidates the key.',
      },
      {
        question: 'What is the "exp" claim in a JWT?',
        answer:
          'The "exp" (expiration time) claim holds a Unix timestamp after which the token must be rejected. This tool checks it and flags expired tokens, but expiry is not part of the signature — the service receiving the token is still responsible for enforcing it.',
      },
      {
        question: 'Can I use this instead of jwt.io?',
        answer:
          'Yes. This tool covers the same core workflow — decoding, verifying, and generating tokens across HS256/384/512, RS256/384/512, and ES256/384/512 — as a free, open-source, fully client-side alternative.',
      },
    ],
  },
  {
    path: '/encoder',
    title: 'JWT Encoder — Generate & Sign JSON Web Tokens Online',
    description:
      'Generate and sign a JSON Web Token in your browser. Edit the header and payload, choose HS256, RS256, or ES256, set an expiry, and get a signed JWT — entirely client-side.',
    h1: 'Generate & Sign a JSON Web Token',
    intro:
      'Edit the header and payload, choose a signing algorithm, set an expiry, and sign a JWT with your own key — entirely in your browser.',
    lastmod: '2026-08-20',
    faqs: [
      {
        question: 'How do I generate a JWT?',
        answer:
          'Edit the payload with the claims you need, pick a signing algorithm, and enter the secret or private key to sign with. The signed token is produced immediately and updates as you type — copy it from the Encoded Token panel when you are done.',
      },
      {
        question: 'How long should my HS256 secret be?',
        answer:
          'RFC 7518 requires a key of at least the hash output size, so HS256 needs 256 bits (32 bytes) of entropy, HS384 needs 384, and HS512 needs 512. Short, human-memorable secrets are brute-forceable offline by anyone holding a token — generate them randomly.',
      },
      {
        question: 'What key format do RS256 and ES256 need?',
        answer:
          'Both take PEM-encoded keys: a PKCS#8 private key for signing (the "BEGIN PRIVATE KEY" block) and a SPKI public key for verification (the "BEGIN PUBLIC KEY" block). ES256 specifically requires a P-256 curve key — a P-384 key will fail with an algorithm mismatch.',
      },
      {
        question: 'Should I put sensitive data in the payload?',
        answer:
          'No. A signed JWT is encoded, not encrypted — anyone holding the token can read every claim without any key. Signing protects against tampering, not disclosure. Keep secrets, passwords, and personal data out of the payload entirely.',
      },
      {
        question: 'How do I set an expiry on the token?',
        answer:
          'Use the expiry selector to pick a preset duration or an exact date and time; it writes the "exp" claim as a Unix timestamp into the payload. Short lifetimes limit the damage if a token leaks, so prefer minutes or hours over days for access tokens.',
      },
    ],
  },
  {
    path: '/jwt-decrypter',
    title: 'JWT Decrypter — Decrypt & Decode a JSON Web Token Online',
    description:
      'Trying to decrypt a JWT? Most JSON Web Tokens are signed, not encrypted — the payload is base64url-encoded and readable by anyone. Decode any JWT here instantly, in your browser.',
    h1: 'JWT Decrypter — Decode Any JSON Web Token',
    intro:
      'Most tokens people want to "decrypt" are signed, not encrypted — the payload is readable without any key. Paste one below to decode it.',
    lastmod: '2026-08-20',
    faqs: [
      {
        question: 'Can you decrypt a JWT?',
        answer:
          'Usually there is nothing to decrypt. The common JWT is a JWS — a signed token whose payload is base64url-encoded, not encrypted. Decoding it requires no key at all, which is exactly what this page does. Only a JWE token is genuinely encrypted, and that does require the recipient’s key.',
      },
      {
        question: 'How do I tell a signed JWT from an encrypted one?',
        answer:
          'Count the dot-separated parts. A signed JWS has three (header, payload, signature). An encrypted JWE has five (header, encrypted key, initialisation vector, ciphertext, authentication tag). You can also check the header: a JWE carries an "enc" field alongside "alg".',
      },
      {
        question: 'Do I need a secret key to decode a JWT?',
        answer:
          'No. Decoding needs no key whatsoever — the header and payload are plain base64url. A key is only needed to verify the signature, which proves the token has not been tampered with. Decoding and verifying are separate steps, and this tool does both.',
      },
      {
        question: 'If anyone can read my JWT, is that a security problem?',
        answer:
          'It is only a problem if you put confidential data in the payload. Signed tokens guarantee integrity, not confidentiality. Treat the payload as public: store identifiers rather than personal data, and if the contents genuinely must be hidden, use JWE encryption or keep the data server-side.',
      },
      {
        question: 'What is JWE?',
        answer:
          'JSON Web Encryption is the standard for tokens whose contents are actually encrypted, defined in RFC 7516. A JWE has five parts and its payload is unreadable without the correct decryption key. It is far less common than JWS in practice, since most systems only need tamper-evidence.',
      },
    ],
  },
];

export function routeByPath(path: string): RouteSeo {
  // Normalise a trailing slash so '/encoder/' and '/encoder' resolve alike.
  const normalised = path !== '/' ? path.replace(/\/$/, '') : path;
  return routes.find((r) => r.path === normalised) ?? routes[0];
}

export function canonicalFor(path: string): string {
  return path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}
