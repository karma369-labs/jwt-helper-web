---
title: JWT authentication in Node.js with jsonwebtoken and jose
description: Sign and verify JSON Web Tokens in Node.js. Covers the jsonwebtoken package, the modern jose library, RS256 with PEM keys, JWKS verification, an Express middleware, and the errors you will hit along the way.
intro: Two libraries cover almost every Node.js JWT need. jsonwebtoken is the one you have seen in every tutorial; jose is the standards-complete option that also runs in browsers and edge runtimes. Here is both, done properly.
date: 2026-09-20
tags:
  - nodejs
  - jsonwebtoken
  - jose
  - express
relatedTools:
  - /
  - /jwt-encoder-online
faqs:
  - question: jsonwebtoken or jose?
    answer: For a new project, jose. It has no dependencies, implements the full JOSE spec, supports JWKS out of the box, and runs on Node, Deno, Bun, Cloudflare Workers, and browsers. jsonwebtoken is fine if it is already in your codebase, but pass an explicit algorithms list.
  - question: Why does jwt.verify throw "invalid algorithm"?
    answer: The token's alg header is not in the algorithms list you passed, or you passed a secret string for an RS256 token. Check the header in a decoder and make sure the key type matches the algorithm.
  - question: How do I verify tokens from Auth0 or Cognito in Node?
    answer: Use jose's createRemoteJWKSet pointed at the provider's JWKS URL, then jwtVerify with the issuer and audience the provider documents. The keys are cached and refreshed when an unknown kid appears.
---

## Install

```bash
npm install jose
# or, for the classic API
npm install jsonwebtoken
```

## Signing with jose

`jose` uses a builder. Every claim is a method, and the key is passed at the end.

```js
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET); // 32+ random bytes

const token = await new SignJWT({ role: 'admin' })
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setSubject('user_123')
  .setIssuer('https://api.example.com')
  .setAudience('https://api.example.com')
  .setIssuedAt()
  .setExpirationTime('15m')
  .sign(secret);
```

For RS256, import a PEM private key first. The key must be PKCS#8 (`BEGIN PRIVATE KEY`), not the older PKCS#1 (`BEGIN RSA PRIVATE KEY`). Convert with `openssl pkcs8 -topk8 -nocrypt` if needed.

```js
import { SignJWT, importPKCS8 } from 'jose';

const privateKey = await importPKCS8(process.env.JWT_PRIVATE_KEY, 'RS256');

const token = await new SignJWT({ role: 'admin' })
  .setProtectedHeader({ alg: 'RS256', kid: 'key-2026-09' })
  .setSubject('user_123')
  .setIssuer('https://api.example.com')
  .setAudience('https://api.example.com')
  .setIssuedAt()
  .setExpirationTime('15m')
  .sign(privateKey);
```

## Verifying with jose

`jwtVerify` checks the signature and the standard time claims, and rejects tokens whose `iss` or `aud` do not match what you pass. It returns the payload and protected header.

```js
import { jwtVerify, importSPKI } from 'jose';

const publicKey = await importSPKI(process.env.JWT_PUBLIC_KEY, 'RS256');

try {
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: 'https://api.example.com',
    audience: 'https://api.example.com',
    algorithms: ['RS256'],
  });
  console.log(payload.sub);
} catch (err) {
  // err.code is one of ERR_JWT_EXPIRED, ERR_JWS_SIGNATURE_VERIFICATION_FAILED,
  // ERR_JWT_CLAIM_VALIDATION_FAILED, ERR_JWS_INVALID, ...
  console.error(err.code, err.message);
}
```

Pass `algorithms` even though jose derives the expected algorithm from the key type. It documents intent and protects against a future key change.

## Verifying against a JWKS endpoint

This is how you verify tokens from Auth0, Cognito, Firebase, Okta, or your own identity service. `createRemoteJWKSet` fetches the key set once, caches it, and refetches when a token arrives with a `kid` it has not seen.

```js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://YOUR_DOMAIN/.well-known/jwks.json')
);

const { payload } = await jwtVerify(token, JWKS, {
  issuer: 'https://YOUR_DOMAIN/',
  audience: 'https://your-api-identifier',
});
```

Create the JWKS object once at module level, not per request, or you lose the cache.

## The jsonwebtoken API

`jsonwebtoken` is callback- or sync-based and takes options objects. The important habit is passing `algorithms` to `verify`; without it, older versions would accept whatever the header said.

```js
import jwt from 'jsonwebtoken';

// Sign
const token = jwt.sign(
  { sub: 'user_123', role: 'admin' },
  process.env.JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '15m', issuer: 'https://api.example.com', audience: 'https://api.example.com' }
);

// Verify
try {
  const payload = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'https://api.example.com',
    audience: 'https://api.example.com',
  });
} catch (err) {
  // err.name: TokenExpiredError | JsonWebTokenError | NotBeforeError
}
```

For RS256, pass the PEM strings directly as the key argument. `jsonwebtoken` accepts both PKCS#1 and PKCS#8 private keys.

`jsonwebtoken` has no built-in JWKS support. Pair it with `jwks-rsa` if you need remote keys, or switch to jose.

## Express middleware

```js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL(process.env.JWKS_URL));

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });
    req.user = { id: payload.sub, claims: payload };
    next();
  } catch (err) {
    // Log the reason, never the token.
    console.warn('token rejected', err.code);
    res.status(401).json({ error: 'invalid token' });
  }
}
```

Return the same 401 body for every failure. Distinguishing "expired" from "bad signature" in the response tells an attacker which tokens are worth replaying.

## Errors you will meet

**`ERR_JWS_SIGNATURE_VERIFICATION_FAILED`** or **`invalid signature`**. The key does not match, the token was modified, or you verified with the wrong algorithm. Paste the token into the [decoder](/) and check the `alg` header and `kid` against the key you are using. For PEM keys, a lost newline is enough to break them.

**`ERR_JWT_EXPIRED`** or **`TokenExpiredError`**. `exp` has passed. Check the server clock, then check the lifetime you set.

**`ERR_JWT_CLAIM_VALIDATION_FAILED`** with `claim: "aud"`. The token's audience does not include yours. Common with Auth0 when the client requested a token without specifying the API's `audience` parameter, which yields an opaque or wrongly targeted token.

**`no applicable key found in the JSON Web Key Set`**. The token's `kid` is not in the JWKS. Either the issuer rotated keys and the cache is stale (jose handles this by refetching), or the token came from a different tenant or environment than the JWKS URL you configured.

## Testing your setup

The [encoder](/jwt-encoder-online) will produce a token with any header and payload you like, signed with a secret or PEM key you paste, so you can generate test tokens without writing a script. Feed one to your middleware and confirm it accepts a good token and rejects one where you have changed a single payload character.
