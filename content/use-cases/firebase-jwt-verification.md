---
title: Firebase ID tokens - what they contain and how to verify them on your server
description: Firebase Authentication issues RS256 ID tokens that expire after one hour. Learn the claims inside, the issuer and audience to check, where Google publishes the signing certificates, how to verify with the Admin SDK or a plain JWT library, and how custom claims work.
intro: Firebase ID tokens are ordinary RS256 JWTs with a Google issuer and your project id as the audience. Verifying them without the Admin SDK is straightforward once you know where the keys live and which claims to check.
date: 2026-09-20
tags:
  - firebase
  - google
relatedTools:
  - /
faqs:
  - question: Why does my Firebase ID token expire after one hour?
    answer: That is the fixed lifetime and it cannot be changed. The client SDK refreshes it automatically using a refresh token. Call getIdToken() before each request rather than caching the string; it returns a fresh token when the cached one is near expiry.
  - question: Can I verify Firebase tokens without the Admin SDK?
    answer: Yes. Fetch Google's public certificates, pick the one matching the token's kid, and verify RS256 with issuer https://securetoken.google.com/PROJECT_ID and audience PROJECT_ID. The Admin SDK does exactly this plus a check that sub is non-empty and auth_time is in the past.
  - question: How do I add roles to a Firebase token?
    answer: Set custom claims with the Admin SDK's setCustomUserClaims(uid, claims). They appear in the ID token after the client's next refresh, so force one with getIdToken(true) after changing them.
---

## What a Firebase ID token contains

After a user signs in with any Firebase Authentication provider, the client SDK holds an ID token. Call `user.getIdToken()` to read it, then paste it into the [decoder](/):

```json
{
  "iss": "https://securetoken.google.com/your-project-id",
  "aud": "your-project-id",
  "auth_time": 1758326400,
  "user_id": "Xy7kLm9nOpQrStUvWxYz012345",
  "sub": "Xy7kLm9nOpQrStUvWxYz012345",
  "iat": 1758326400,
  "exp": 1758330000,
  "email": "jane@example.com",
  "email_verified": true,
  "firebase": {
    "identities": { "email": ["jane@example.com"] },
    "sign_in_provider": "password"
  }
}
```

`sub` and `user_id` are both the Firebase UID. Use `sub`; `user_id` is a legacy duplicate.

`iss` is `https://securetoken.google.com/` followed by your project id, and `aud` is the bare project id. Both are fixed for a project and are the two values your verifier must be configured with.

`auth_time` is when the user actually authenticated, as opposed to `iat`, which is when this particular token was minted during a refresh. Use `auth_time` when you need to know whether the session is recent enough for a sensitive operation.

`firebase.sign_in_provider` tells you how they signed in: `password`, `google.com`, `apple.com`, `phone`, `anonymous`, and so on. Reject `anonymous` on endpoints that need a real account.

The header has `alg: RS256` and a `kid` naming one of Google's rotating signing keys.

## Where the keys are

Google publishes the public keys as X.509 certificates, not as a JWKS, at:

```text
https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
```

The response is a JSON object mapping `kid` to a PEM certificate. Extract the public key from the certificate matching the token's `kid`. The response's `Cache-Control: max-age` header tells you how long to cache; respect it and refetch when a token arrives with an unknown `kid`.

A JWKS version also exists at `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`, which is more convenient for libraries that speak JWKS natively.

## Verifying with the Admin SDK

This is the path Firebase recommends, and it handles key fetching, caching, and the extra checks for you.

```js
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({ credential: applicationDefault() });

export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }
  try {
    const decoded = await getAuth().verifyIdToken(token, /* checkRevoked */ false);
    req.user = { uid: decoded.uid, claims: decoded };
    next();
  } catch (err) {
    console.warn('token rejected', err.code);
    res.status(401).json({ error: 'invalid token' });
  }
}
```

Pass `true` as the second argument to also check whether the user's tokens were revoked with `revokeRefreshTokens`. That adds a database read per request, so use it only on sensitive endpoints.

The Admin SDK is available for Node, Python, Java, Go, and C#, with the same `verify_id_token` shape in each.

## Verifying with a plain JWT library

If you do not want the Admin SDK dependency, any library that supports RS256 and JWKS can do it.

Node with jose, using the JWKS endpoint:

```js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const PROJECT_ID = 'your-project-id';
const JWKS = createRemoteJWKSet(new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
));

export async function verifyFirebaseToken(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
    algorithms: ['RS256'],
  });
  if (!payload.sub) throw new Error('missing sub');
  if (payload.auth_time > Date.now() / 1000) throw new Error('auth_time in future');
  return payload;
}
```

Python with PyJWT:

```python
from jwt import PyJWKClient
import jwt

PROJECT_ID = "your-project-id"
jwks = PyJWKClient(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
)

def verify_firebase_token(token: str) -> dict:
    key = jwks.get_signing_key_from_jwt(token).key
    claims = jwt.decode(
        token, key, algorithms=["RS256"],
        issuer=f"https://securetoken.google.com/{PROJECT_ID}",
        audience=PROJECT_ID,
    )
    if not claims.get("sub"):
        raise jwt.InvalidTokenError("missing sub")
    return claims
```

The [Node.js](/guides/jwt-authentication-nodejs), [Python](/guides/jwt-authentication-python), [Java](/guides/jwt-authentication-java), and [Go](/guides/jwt-authentication-go) guides show how to wrap these in middleware.

## Custom claims

Roles and permissions go in as custom claims from a trusted server:

```js
await getAuth().setCustomUserClaims(uid, { admin: true, tier: 'pro' });
```

They appear at the top level of the ID token payload, next to `email` and `sub`, but only after the client fetches a new token. Custom claims are capped at 1000 bytes serialised and must not use reserved OIDC or Firebase names.

On the client, force a refresh after changing claims:

```js
await user.getIdToken(true);
```

Security rules for Firestore, Realtime Database, and Storage can read the same claims through `request.auth.token.admin`, which is the main reason to prefer custom claims over a roles collection.

## Sending the token to your API

The client SDK keeps the ID token fresh. Do not cache the string yourself; ask for it before each request.

```js
const token = await auth.currentUser.getIdToken();
await fetch('/api/orders', {
  headers: { Authorization: `Bearer ${token}` },
});
```

`getIdToken()` returns the cached token if it has more than five minutes left, and refreshes it otherwise.

## Session cookies

For server-rendered apps, the Admin SDK can exchange an ID token for a session cookie with a lifetime of up to two weeks, verified with `verifySessionCookie`. This gives you an HttpOnly cookie instead of a bearer header, which is the safer place for a browser to keep a credential. The [security best practices](/blog/jwt-security-best-practices) article explains why.

## Errors and what they mean

**`auth/id-token-expired`** or **`ERR_JWT_EXPIRED`**. The one-hour lifetime passed. The client should have refreshed; check that it calls `getIdToken()` per request rather than caching.

**`auth/argument-error: Firebase ID token has incorrect "aud" claim`**. The token is from a different Firebase project than the one your server is configured for. Decode it and compare `aud` with your project id.

**`auth/argument-error: ... incorrect "iss" claim`**. Same cause, or your issuer string is missing the project id.

**`auth/id-token-revoked`**. You called `verifyIdToken(token, true)` and the user's refresh tokens were revoked. Have the client sign in again.

**`no applicable key found`**. The `kid` is not in the cached certificates. Refetch; Google rotates keys and the cache may be stale.

**Verification works locally but fails in production**. Clock skew on the server. Firebase tokens are issued with `iat` set to now, and a server clock a minute behind will see a token from the future. Sync NTP.

## Debugging checklist

1. Paste the token into the [decoder](/). Is `aud` your project id?
2. Is `iss` `https://securetoken.google.com/` plus that same project id?
3. Is `exp` within the last hour from `iat`?
4. Is `sub` non-empty?
5. Does the header `kid` appear in Google's current certificate list?
