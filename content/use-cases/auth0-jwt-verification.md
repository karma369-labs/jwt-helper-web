---
title: Auth0 JWTs - what is in the token and how to verify it
description: Auth0 issues RS256 access tokens and ID tokens. Learn what each one contains, why you sometimes get an opaque token instead of a JWT, how to verify against Auth0's JWKS, and how to fix the common "invalid audience" and "jwt malformed" errors.
intro: Auth0 hands your app two different tokens, and most integration problems come from confusing them or forgetting the audience parameter. Here is what each token holds and how to verify it on your API.
date: 2026-09-20
tags:
  - auth0
  - oauth2
  - openid-connect
relatedTools:
  - /
faqs:
  - question: Why is my Auth0 access token not a JWT?
    answer: You requested it without an audience. Without a target API, Auth0 issues an opaque token meant only for its own /userinfo endpoint. Pass the audience parameter set to your API identifier when starting the login and you will get a JWT.
  - question: Should my API verify the ID token or the access token?
    answer: The access token. The ID token is for the client application to learn who logged in; its audience is the client id, not your API. Sending it to an API is a common mistake that fails audience validation once you check it properly.
  - question: How do I add custom claims to an Auth0 token?
    answer: With an Action on the post-login trigger, calling api.accessToken.setCustomClaim or api.idToken.setCustomClaim. Use a namespaced claim name such as a URL to avoid collisions with reserved claims.
---

## Two tokens, two jobs

After login, Auth0 returns an **ID token** and an **access token**. They look similar in a decoder and are meant for different readers.

The ID token is for your front end. It says who logged in. Its `aud` is your application's client id, and it carries profile claims such as `email`, `name`, and `picture`. It is an OpenID Connect artifact and should never be sent to your API.

The access token is for your API. Its `aud` is your API identifier, the URL-shaped string you set when you registered the API in the Auth0 dashboard. It carries `scope` and `permissions`, and by default almost no profile data.

Paste each into the [decoder](/) and compare the `aud` claim. That one field tells you which token you are holding.

## What an Auth0 access token contains

```json
{
  "iss": "https://YOUR_TENANT.us.auth0.com/",
  "sub": "auth0|64f1c2a3b8e9d0001a2b3c4d",
  "aud": [
    "https://your-api-identifier",
    "https://YOUR_TENANT.us.auth0.com/userinfo"
  ],
  "iat": 1758326400,
  "exp": 1758412800,
  "scope": "openid profile email read:orders",
  "azp": "YOUR_CLIENT_ID",
  "permissions": ["read:orders"]
}
```

A few things to notice.

`iss` ends with a trailing slash. Your verifier must match it exactly, slash included, or issuer validation fails.

`aud` is often an array. It includes your API identifier and, when the client asked for `openid` scope, the userinfo endpoint. Your verifier should check that your identifier is *in* the list, not that the list equals it.

`sub` is `connection|id`. The prefix tells you which identity source the user came from: `auth0|` for the built-in database, `google-oauth2|` for Google, and so on. Use the whole string as the user id; the part after the pipe is not unique across connections.

`permissions` only appears when RBAC is enabled for the API and "Add Permissions in the Access Token" is switched on.

The header carries `alg: RS256` and a `kid` that maps to a key in the tenant's JWKS.

## Why you got an opaque token

If the access token is a short random string rather than three dot-separated parts, the login request did not include an `audience` parameter. Without a target API, Auth0 issues an opaque token that only its own `/userinfo` endpoint can read.

Fix it in the client:

```js
// auth0-spa-js / @auth0/auth0-react
const auth0 = await createAuth0Client({
  domain: 'YOUR_TENANT.us.auth0.com',
  clientId: 'YOUR_CLIENT_ID',
  authorizationParams: {
    audience: 'https://your-api-identifier',
    scope: 'openid profile email read:orders',
  },
});
```

You can also set a default audience on the tenant under Settings, which applies when the client sends none.

## Verifying on your API

Auth0 signs with RS256 and publishes the public keys at `https://YOUR_TENANT.us.auth0.com/.well-known/jwks.json`. Your verifier needs the issuer (with the trailing slash), the API identifier as audience, and the algorithm pinned.

Node with jose:

```js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://YOUR_TENANT.us.auth0.com/.well-known/jwks.json')
);

const { payload } = await jwtVerify(token, JWKS, {
  issuer: 'https://YOUR_TENANT.us.auth0.com/',
  audience: 'https://your-api-identifier',
  algorithms: ['RS256'],
});
```

Python with PyJWT:

```python
from jwt import PyJWKClient
import jwt

jwks = PyJWKClient("https://YOUR_TENANT.us.auth0.com/.well-known/jwks.json")

def verify(token):
    key = jwks.get_signing_key_from_jwt(token).key
    return jwt.decode(
        token, key, algorithms=["RS256"],
        issuer="https://YOUR_TENANT.us.auth0.com/",
        audience="https://your-api-identifier",
    )
```

The [Node.js](/guides/jwt-authentication-nodejs), [Python](/guides/jwt-authentication-python), [Java](/guides/jwt-authentication-java), and [Go](/guides/jwt-authentication-go) guides show full middleware for each.

If you use a custom domain, the issuer and JWKS URL use that domain instead of the `*.auth0.com` one. Tokens from the same tenant will have `iss` set to the custom domain, and verification against the default domain's issuer string will fail.

## Custom claims

Add claims with a post-login Action:

```js
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://example.com';
  api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization?.roles ?? []);
  api.idToken.setCustomClaim(`${namespace}/org`, event.organization?.name);
};
```

Auth0 rejects claims that collide with reserved OIDC names, and historically required non-standard claims to be namespaced with a URL. Keeping the namespace habit avoids surprises when a future standard claims the name you picked.

## Errors and what they mean

**`jwt malformed`** or **"not a JWT"**. Opaque token. Add the `audience` parameter.

**`jwt audience invalid`** or **`InvalidAudienceError`**. Either you sent the ID token to the API, or the `audience` in the client does not match the API identifier in the dashboard. The identifier is a plain string compared exactly; a trailing slash difference is enough to fail.

**`jwt issuer invalid`**. Missing the trailing slash in your configured issuer, or a custom domain mismatch.

**`no applicable key found in the JSON Web Key Set`**. The `kid` is not in the JWKS you fetched. The token came from a different tenant (dev vs prod) than the JWKS URL you configured.

**Token expired within an hour**. Access token lifetime defaults to 86400 seconds but is configurable per API in the dashboard. Short lifetimes are the right choice; use refresh tokens with rotation to keep sessions alive.

## Debugging checklist

1. Paste the token into the [decoder](/). Three parts? If not, it is opaque.
2. Read `aud`. Is your API identifier in it? If it is a client id, you have the ID token.
3. Read `iss`. Does it match your configured issuer character for character?
4. Read `kid` in the header. Does it appear in the JWKS at your configured URL?
5. Read `exp`. Has it passed?

Four out of five integration failures resolve at step 2.
