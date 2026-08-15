# JWT Debugger

A client-side JWT encode/decode/verify tool (jwt.io clone). Pure frontend — no backend, tokens/keys never leave the browser.

## Stack
- React 19 + Vite + TypeScript
- `jose` for signing/verification (WebCrypto-based)
- CodeMirror 6 for JSON editing
- Bun as package manager/runtime

## Setup
```
bun install
bun run dev
```

Other scripts:
```
bun run build     # tsc -b && vite build
bun run lint      # oxlint
bun run preview   # preview a production build
```


## Architecture
```
src/
  core/jwt/            # pure logic, no React, unit-testable
    decode.ts            # parse/assemble tokens, base64url segment handling
    base64url.ts
    claims.ts            # headerClaims + standardClaims metadata, buildClaimRows()
    algorithms/
      shared.ts            # generic jose sign/verify helpers
      hmac.ts / rsa.ts / ecdsa.ts
      index.ts             # alg registry — add a new alg here, nothing else changes
  hooks/
    useJwt.ts            # single reducer, all debugger state, shared by both pages
    useDebounce.ts
  components/
    editors/             # TokenInput, JsonPane, KeyInput, AlgSelect
    badges/              # VerifyBadge, ExpiryBadge
    layout/              # Tabs
  pages/
    DecoderPage.tsx      # paste-a-token workflow; payload pane is read-only
    EncoderPage.tsx      # build-a-token workflow; header/payload fully editable
```

## State model
One `useReducer` in `useJwt.ts`, instantiated once in `App.tsx` and shared by both pages — switching tabs never loses your work. The encoded token is derived (`useMemo`) from tracked base64url segments, never stored as an independently-synced copy.

**Tamper detection.** Every change is tagged with an `EditOrigin`:
- `paste` — token pasted/edited directly. Segments are kept exactly as decoded and only *verified*, never regenerated. This is what makes a tampered token actually show as invalid, and what lets tokens from other JWT libraries (different JSON key order/spacing) still verify correctly.
- `content` — decoded header/payload edited, or algorithm changed. Authoring a new token, so the signature is recomputed fresh.
- `key` on the Decoder — secret/key changed; the existing signature is re-verified against it (tamper check). On the Encoder, a key change is treated as `content` instead, since there authoring is always the intent — a new secret should produce a newly-valid token, not fail against the old signature.

## Extensibility
- **Algorithms**: `core/jwt/algorithms/index.ts` is a registry, `alg name -> { sign, verify, keyInputType }`. New algorithm = one new file + one entry, nothing else touches it.
- **Claims**: `core/jwt/claims.ts` — `headerClaims`/`standardClaims` are plain data tables (label + format). New recognized claim = one entry, no UI changes needed.
- **Features**: `src/features/` is a stub folder for self-contained additions (share-link, JWKS fetch, history) that plug into `App.tsx` without touching core — empty for now.

## Supported algorithms
HS256/384/512, RS256/384/512, ES256/384/512.

## Known gaps
- `alg: none` falls into the generic "unsupported algorithm" path rather than a dedicated warning.
- No base64url-encoded-secret toggle, no auto-focus toggle, no share-link/URL-encoded state yet.

## Security notes
- All crypto runs client-side only (WebCrypto via `jose`); no token or key material is sent to a server.
- The site does send anonymous usage analytics (Google Analytics 4). Only interaction *shape* is reported — which tab you're on, which algorithm you picked, whether verification passed, coarse length buckets. Token contents, header/payload claim values, secrets, and keys are never included; `src/core/analytics.ts` drops any value that is over-long or PEM/JWT-shaped as a backstop.
- The `alg` in a token header is never auto-trusted — verification always uses the algorithm you explicitly select/enter a key for.
- A signature is never silently regenerated to mask tampering (see State model above).
