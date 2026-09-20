---
title: JWT security best practices - the checklist that prevents real breaches
description: Pin the algorithm, validate every claim, keep lifetimes short, store tokens where scripts cannot reach them, and never put secrets in the payload. A practical checklist drawn from how JWT deployments actually get broken.
intro: Most JWT breaches are not cryptographic. They come from a verifier that skips a check, a token that lives too long, or a payload that carries something it should not. This is the checklist.
date: 2026-09-20
tags:
  - security
  - best-practices
relatedTools:
  - /
  - /jwt-encoder-online
faqs:
  - question: Should I store a JWT in localStorage?
    answer: Not if you can avoid it. Any script running on the page, including a compromised dependency, can read localStorage and exfiltrate the token. An HttpOnly, Secure, SameSite cookie is out of reach of JavaScript. If you must use localStorage, keep the token lifetime very short.
  - question: How long should an access token live?
    answer: Minutes, not days. Five to fifteen minutes is common. Pair it with a refresh token that the server can revoke, so a leaked access token expires on its own and a leaked refresh token can be killed.
  - question: Is alg none ever legitimate?
    answer: Only inside a system that has already verified the token by other means and is passing it along internally. A verifier facing the network should reject it outright. Every modern library does so by default; the risk is an older library or a hand-rolled verifier.
---

## 1. Pin the algorithm

The single most exploited JWT mistake is letting the token choose how it is verified. A verifier that reads `alg` from the header and dispatches on it is open to two attacks.

The first is `alg: none`. Older libraries treated it as "no signature required" and accepted anything. The second is key confusion, where an attacker signs with HS256 using your RSA public key as the secret, and a verifier that uses one key variable for all algorithms accepts it.

The fix is the same for both. Tell the library which algorithm you expect, in code, and reject anything else.

```js
// jsonwebtoken
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

```python
# PyJWT
jwt.decode(token, public_key, algorithms=["RS256"])
```

Every mainstream library takes an explicit list now. Use it, even when the library claims a safe default.

## 2. Validate every claim you rely on

A valid signature says the token is unmodified. It says nothing about whether the token is for you, from who you think, or still current. Those come from claims, and each one has to be checked.

- `exp`: reject if in the past. Allow a small clock skew, thirty seconds or so, not minutes.
- `nbf`: reject if in the future.
- `iss`: must equal the issuer you configured. A token from a different tenant of the same identity provider will have a valid signature and the wrong issuer.
- `aud`: must contain your service's identifier. A token issued for a different API is not for you, even if it came from the same issuer.
- `sub`: must be present and in the format you expect before you use it as a user id.

Libraries validate `exp` by default and most will check `iss` and `aud` if you pass them. Pass them.

## 3. Keep access tokens short-lived

A JWT cannot be revoked. Whatever lifetime you set is how long a stolen token works. Five to fifteen minutes for an access token is the usual range. Pair it with a refresh token, stored more carefully, that the server can invalidate.

If your product needs instant revocation, keep a server-side denylist keyed by `jti` and check it on every request. At that point you have reintroduced a database lookup, which is worth knowing before choosing JWTs over plain sessions.

## 4. Treat the payload as public

The payload is base64url, not ciphertext. Anyone holding the token, including the browser it sits in, can read every claim. This site's [decoder](/) does it without a key.

Never put in a payload: passwords or hashes, API keys, personal data beyond what the receiver needs, internal ids that leak system structure, or anything a regulator would call sensitive. If a claim truly must be hidden, use JWE encryption or keep it server-side and reference it by id.

## 5. Store tokens where scripts cannot reach them

In a browser, `localStorage` and `sessionStorage` are readable by any script on the page. A cross-site scripting bug or a poisoned npm dependency can lift the token and use it from anywhere.

Prefer a cookie with `HttpOnly`, `Secure`, and `SameSite=Lax` or `Strict`. JavaScript cannot read it, it only travels over TLS, and the browser will not send it on cross-site requests. Cookies bring CSRF considerations, which `SameSite` handles for most cases and a CSRF token handles for the rest.

For native and mobile apps, use the platform keychain or keystore, not a plain file or shared preferences.

## 6. Use asymmetric keys once a second party verifies

HS256 means every verifier holds the signing secret and could forge tokens. As soon as a separate API, partner, or mobile app needs to verify, move to RS256 or ES256, publish the public key via JWKS, and keep the private key in one place. The [HS256 vs RS256](/blog/hs256-vs-rs256) article covers the details.

If you stay on HS256, the secret must be at least 32 random bytes from a real random source. Not a passphrase, not the app name, not `secret`.

## 7. Rotate keys with `kid`

Put a `kid` (key id) in every token header and publish keys through a JWKS endpoint. Verifiers look up the key by `kid`, so you can add a new key, start signing with it, and retire the old one once every token signed with it has expired. Without `kid`, rotation means a hard cutover and a flood of invalid-signature errors.

Never fetch keys from a URL supplied inside the token (`jku`, `x5u`). Configure the JWKS URL in the verifier and fetch it over TLS.

## 8. Send tokens only in headers

Put the token in `Authorization: Bearer <token>`, not in a query string. URLs end up in server logs, browser history, referrer headers, and analytics. A token in a URL is a token in a dozen places you do not control.

## 9. Reject what you do not understand

A token with `typ` set to something unexpected, an `alg` you did not list, a `crit` header naming an extension you do not implement, or five segments instead of three should be rejected, not partially processed. Fail closed.

## 10. Log verification failures, not tokens

Log that a token was rejected and why: expired, bad signature, wrong audience. Do not log the token itself. A log line with a bearer token in it is a credential in your log pipeline, your log vendor, and every backup of both.

## Quick audit

Paste one of your production tokens into the [decoder](/) and ask:

- Is `alg` what my verifier pins, and does the verifier actually pin it?
- Is `exp` minutes away, or days?
- Do `iss` and `aud` name my issuer and my API, and does my code check them?
- Is there anything in the payload I would not want on a billboard?
- Is there a `kid`, and can I rotate the key behind it without downtime?

Five yeses and the token side of your system is in good shape. Each no is a concrete fix.
