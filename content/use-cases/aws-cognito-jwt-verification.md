---
title: AWS Cognito JWTs - ID token vs access token and how to verify them
description: Amazon Cognito user pools issue three tokens. Learn what the ID and access tokens contain, how token_use and client_id replace the usual audience check, where the JWKS lives, and how to verify with aws-jwt-verify or any JWT library.
intro: Cognito's tokens follow the standard closely enough to verify with any library, and differ in just enough places to trip up a verifier written for another provider. Here is what to expect and how to check them.
date: 2026-09-20
tags:
  - aws
  - cognito
relatedTools:
  - /
faqs:
  - question: Which Cognito token should my API accept?
    answer: The access token. It carries scopes and cognito:groups and is meant for authorising API calls. The ID token is for the client to learn who signed in. API Gateway's Cognito authorizer accepts either, but if you verify yourself, pin token_use to "access".
  - question: Why does audience validation fail on a Cognito access token?
    answer: Cognito access tokens do not have an aud claim. The app client id is in client_id instead. Verify client_id yourself, or use a library such as aws-jwt-verify that knows to check it.
  - question: Can I add custom claims to Cognito tokens?
    answer: Yes, with a Pre Token Generation Lambda trigger. It can add, override, or suppress claims in the ID token, and since the V2 trigger version it can modify the access token as well.
---

## Three tokens

A successful sign-in against a Cognito user pool returns an **ID token**, an **access token**, and a **refresh token**. The first two are JWTs signed with RS256. The refresh token is opaque and only Cognito can read it.

The ID token says who the user is. The access token says what they can do. If you paste both into the [decoder](/), the fastest way to tell them apart is the `token_use` claim: `id` or `access`.

## What the ID token contains

```json
{
  "sub": "8f3c1a2b-4d5e-6f70-8a9b-0c1d2e3f4a5b",
  "aud": "1h57kf5cpq17m0eml12EXAMPLE",
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE",
  "token_use": "id",
  "cognito:username": "jane",
  "cognito:groups": ["admins"],
  "email": "jane@example.com",
  "email_verified": true,
  "auth_time": 1758326400,
  "iat": 1758326400,
  "exp": 1758330000
}
```

`aud` is the app client id. `iss` is built from the region and user pool id. Profile attributes appear as standard OIDC claims, and Cognito-specific ones are prefixed `cognito:`.

## What the access token contains

```json
{
  "sub": "8f3c1a2b-4d5e-6f70-8a9b-0c1d2e3f4a5b",
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE",
  "client_id": "1h57kf5cpq17m0eml12EXAMPLE",
  "token_use": "access",
  "scope": "openid email orders/read",
  "username": "jane",
  "cognito:groups": ["admins"],
  "auth_time": 1758326400,
  "iat": 1758326400,
  "exp": 1758330000,
  "jti": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

The important difference: **there is no `aud` claim**. The app client id sits in `client_id`. A verifier configured with an audience check will reject every Cognito access token, which is the single most common Cognito integration bug.

Custom scopes from a resource server appear in `scope` as `resource-server-identifier/scope-name`.

## Issuer and JWKS

Both tokens share the issuer format:

```text
https://cognito-idp.{region}.amazonaws.com/{userPoolId}
```

Note there is no trailing slash, unlike Auth0. The public keys live at the issuer plus `/.well-known/jwks.json`:

```text
https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE/.well-known/jwks.json
```

Each user pool has its own key set, and keys rotate rarely but do rotate. Cache the JWKS and refetch when a token arrives with an unknown `kid`.

## Verifying with aws-jwt-verify (Node)

AWS publishes a library that encodes all of the Cognito-specific rules.

```bash
npm install aws-jwt-verify
```

```js
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: 'us-east-1_EXAMPLE',
  tokenUse: 'access',                 // or 'id'
  clientId: '1h57kf5cpq17m0eml12EXAMPLE',
});

try {
  const payload = await verifier.verify(token);
  console.log(payload.sub, payload['cognito:groups']);
} catch (err) {
  console.warn('token rejected', err.message);
}
```

It checks the signature against the pool's JWKS, `iss`, `exp`, `token_use`, and `client_id` or `aud` as appropriate for the token type. Create the verifier once; it caches keys.

## Verifying with a generic library

Any JWT library works if you handle the two Cognito quirks: skip the built-in audience check on access tokens and verify `client_id` and `token_use` by hand.

Python with PyJWT:

```python
from jwt import PyJWKClient
import jwt

REGION = "us-east-1"
POOL_ID = "us-east-1_EXAMPLE"
CLIENT_ID = "1h57kf5cpq17m0eml12EXAMPLE"
ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{POOL_ID}"

jwks = PyJWKClient(f"{ISSUER}/.well-known/jwks.json")

def verify_access_token(token: str) -> dict:
    key = jwks.get_signing_key_from_jwt(token).key
    claims = jwt.decode(
        token, key, algorithms=["RS256"], issuer=ISSUER,
        options={"verify_aud": False},   # access tokens have no aud
    )
    if claims.get("token_use") != "access":
        raise jwt.InvalidTokenError("not an access token")
    if claims.get("client_id") != CLIENT_ID:
        raise jwt.InvalidTokenError("wrong client_id")
    return claims
```

Go with golang-jwt and keyfunc:

```go
jwks, _ := keyfunc.NewDefaultCtx(ctx, []string{issuer + "/.well-known/jwks.json"})

claims := jwt.MapClaims{}
_, err := jwt.ParseWithClaims(tokenString, claims, jwks.Keyfunc,
    jwt.WithValidMethods([]string{"RS256"}),
    jwt.WithIssuer(issuer),
    jwt.WithExpirationRequired(),
)
if err != nil { return err }
if claims["token_use"] != "access" || claims["client_id"] != clientID {
    return errors.New("wrong token type or client")
}
```

The [Node.js](/guides/jwt-authentication-nodejs), [Python](/guides/jwt-authentication-python), [Java](/guides/jwt-authentication-java), and [Go](/guides/jwt-authentication-go) guides cover the middleware around these calls.

## API Gateway authorizers

If your API sits behind API Gateway, a Cognito user pool authorizer (REST APIs) or JWT authorizer (HTTP APIs) does verification before your code runs. The JWT authorizer takes the issuer URL and an audience list; for access tokens, put the app client id in the audience list and it will match against `client_id`.

Your Lambda then receives the claims in `event.requestContext.authorizer`. You still need to check `cognito:groups` or `scope` yourself for authorisation.

## Groups and roles

`cognito:groups` lists the user pool groups the user belongs to. It is present in both tokens. Use it for coarse role checks. For fine-grained permissions, define a resource server with custom scopes and check `scope` on the access token.

## Token lifetimes

ID and access tokens default to one hour and can be set between five minutes and one day per app client. Refresh tokens default to thirty days and can go up to ten years. Keep the access token short and let the client use the refresh token through `InitiateAuth` with `REFRESH_TOKEN_AUTH` to get new ones.

## Errors and what they mean

**`Invalid audience`** on an access token. Your verifier is checking `aud`, which the access token does not have. Switch to checking `client_id`, or verify the ID token if identity rather than authorisation is what you need.

**`Token use not allowed`** from aws-jwt-verify. You created the verifier with `tokenUse: 'id'` and received an access token, or the reverse.

**`Invalid issuer`**. Region or pool id mismatch, or a trailing slash added to the issuer. Copy the `iss` claim from a decoded token and use it verbatim.

**`Unable to find a signing key that matches`**. The `kid` is not in the JWKS. Usually the token is from a different user pool (dev vs prod) than the one configured.

**Expired within an hour**. That is the default. Adjust the app client's access token expiry or implement refresh.

## Debugging checklist

1. Paste the token into the [decoder](/) and read `token_use`. Is it the type your verifier expects?
2. Read `iss`. Build your expected issuer from region and pool id and compare exactly.
3. For access tokens, read `client_id`. For ID tokens, read `aud`. Both should be your app client id.
4. Read the header `kid` and confirm it appears in the pool's JWKS.
5. Read `exp`.
