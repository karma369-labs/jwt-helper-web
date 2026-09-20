---
title: JWT authentication in Python with PyJWT
description: Sign and verify JSON Web Tokens in Python using PyJWT. Covers HS256 and RS256, claim validation, JWKS with PyJWKClient, a FastAPI dependency, a Flask decorator, and the exceptions you need to catch.
intro: PyJWT is the standard JWT library for Python and the one most frameworks build on. Here is how to sign, verify with the right checks, pull keys from a JWKS endpoint, and wire it into FastAPI or Flask.
date: 2026-09-20
tags:
  - python
  - pyjwt
  - fastapi
  - flask
relatedTools:
  - /
  - /jwt-encoder-online
faqs:
  - question: PyJWT or python-jose?
    answer: PyJWT. It is actively maintained, has a smaller surface, and is what FastAPI's docs now recommend. python-jose had long gaps without releases and a history of CVEs; if it is already in your project, migrating is a small change.
  - question: Why does jwt.decode raise "Algorithm not allowed"?
    answer: The token's alg header is not in the algorithms list you passed. That is the library doing its job. Decode the token to see which algorithm it uses, then decide whether your verifier should accept it.
  - question: Do I need the cryptography package?
    answer: Only for RS256, ES256, and other asymmetric algorithms. Install PyJWT with the crypto extra, pip install "pyjwt[crypto]", and it pulls in cryptography for you. HS256 works with the base package.
---

## Install

```bash
pip install "pyjwt[crypto]"
```

The `crypto` extra brings in the `cryptography` package, which is required for RSA and ECDSA. Leave it off only if you will never use anything but HMAC.

## Signing

```python
import jwt
from datetime import datetime, timedelta, timezone

SECRET = os.environ["JWT_SECRET"]  # 32+ random bytes

now = datetime.now(tz=timezone.utc)
token = jwt.encode(
    {
        "sub": "user_123",
        "role": "admin",
        "iss": "https://api.example.com",
        "aud": "https://api.example.com",
        "iat": now,
        "exp": now + timedelta(minutes=15),
    },
    SECRET,
    algorithm="HS256",
)
```

PyJWT accepts `datetime` objects for the time claims and converts them to Unix timestamps. Always use timezone-aware datetimes; a naive `datetime.utcnow()` is deprecated and easy to get wrong.

For RS256, pass the PEM private key as the key argument and add a `kid` so verifiers can pick the right public key.

```python
with open("private.pem", "rb") as f:
    PRIVATE_KEY = f.read()

token = jwt.encode(
    payload,
    PRIVATE_KEY,
    algorithm="RS256",
    headers={"kid": "key-2026-09"},
)
```

## Verifying

`jwt.decode` verifies the signature, checks `exp` and `nbf`, and validates `iss` and `aud` when you pass them. It returns the payload as a dict.

```python
import jwt

try:
    payload = jwt.decode(
        token,
        PUBLIC_KEY,                    # or SECRET for HS256
        algorithms=["RS256"],          # always explicit
        issuer="https://api.example.com",
        audience="https://api.example.com",
        leeway=30,                     # seconds of clock skew to tolerate
    )
except jwt.ExpiredSignatureError:
    ...  # exp has passed
except jwt.InvalidAudienceError:
    ...  # aud does not match
except jwt.InvalidIssuerError:
    ...  # iss does not match
except jwt.InvalidSignatureError:
    ...  # wrong key, tampered token, or wrong algorithm
except jwt.InvalidTokenError as e:
    ...  # base class for everything above; catch this if you don't need detail
```

`algorithms` is required. Passing it is what defends against `alg: none` and key confusion. If you leave it out, PyJWT 2.x raises rather than guessing, which is the correct behaviour.

If you pass `audience`, the token must contain a matching `aud`. If the token has an `aud` claim and you do not pass `audience`, decode raises `InvalidAudienceError`. That surprises people the first time; it is the library refusing to let you skip a check the issuer clearly intended.

## Reading a token without verifying

Occasionally you need the claims before you know which key to use, for instance to read `iss` and pick a tenant. Do this with verification explicitly off, and never trust the result until you have verified with the proper key.

```python
unverified = jwt.decode(token, options={"verify_signature": False})
header = jwt.get_unverified_header(token)  # for kid, alg
```

The same view is available in this site's [decoder](/), which shows the header and payload of any token without a key.

## Verifying against a JWKS endpoint

`PyJWKClient` fetches a JSON Web Key Set, caches it, and picks the key matching the token's `kid`. This is how you verify tokens from Auth0, Cognito, Firebase, Okta, or Keycloak.

```python
from jwt import PyJWKClient

jwks_client = PyJWKClient(
    "https://YOUR_DOMAIN/.well-known/jwks.json",
    cache_keys=True,
)

def verify(token: str) -> dict:
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer="https://YOUR_DOMAIN/",
        audience="https://your-api-identifier",
    )
```

Instantiate `PyJWKClient` once at import time. Creating it per request throws away the cache and hits the JWKS URL on every call.

## FastAPI dependency

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

bearer = HTTPBearer(auto_error=False)

def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    try:
        return verify(creds.credentials)
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")

@app.get("/me")
def me(user: dict = Depends(current_user)):
    return {"id": user["sub"]}
```

Return the same 401 for every failure reason. Telling the client "expired" versus "bad signature" leaks which tokens are worth replaying.

## Flask decorator

```python
from functools import wraps
from flask import request, jsonify, g
import jwt

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        scheme, _, token = auth.partition(" ")
        if scheme != "Bearer" or not token:
            return jsonify(error="missing bearer token"), 401
        try:
            g.user = verify(token)
        except jwt.InvalidTokenError:
            return jsonify(error="invalid token"), 401
        return f(*args, **kwargs)
    return wrapper
```

## Errors you will meet

**`InvalidSignatureError`**. Wrong key, wrong algorithm, or a modified token. Paste the token into the [decoder](/) and compare `alg` and `kid` with the key you are verifying with. For PEM keys read from environment variables, check that newlines survived; a PEM with `\n` as two literal characters is not a PEM.

**`ExpiredSignatureError`**. Check the server clock first. Then check whether the issuer's lifetime is shorter than you assumed.

**`InvalidAudienceError`** with a token that has no `aud`. You passed `audience` but the issuer did not set one. Either configure the issuer to set it (preferred) or stop passing `audience`.

**`PyJWKClientError: Unable to find a signing key that matches`**. The `kid` in the token is not in the JWKS. Usually the JWKS URL points at a different tenant or environment than the one that issued the token.

## Generating test tokens

The [encoder](/jwt-encoder-online) builds a signed token from a header, payload, and key you paste, entirely in the browser. It is quicker than a script for producing a token with a specific `aud` or an already-expired `exp` to test your error handling.
