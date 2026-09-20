---
title: What is a JWT? JSON Web Tokens explained
description: A JSON Web Token is three base64url strings joined by dots. Learn what each part holds, how the signature works, why the payload is readable by anyone, and when a JWT is the right tool.
intro: A JWT is a signed statement that one party hands to another. Here is what is inside one, how the signature is checked, and what it does and does not protect.
date: 2026-09-20
tags:
  - jwt
  - basics
relatedTools:
  - /
  - /jwt-encoder-online
faqs:
  - question: Is a JWT encrypted?
    answer: Usually not. The common form, a JWS, is signed rather than encrypted. Anyone who holds the token can base64url-decode the header and payload and read every claim. Only a JWE token has an encrypted payload, and those are rare in practice.
  - question: Can a JWT be revoked?
    answer: Not by itself. A signed token stays valid until its exp claim passes. Systems that need revocation keep token lifetimes short, pair them with a refresh token they can invalidate, or maintain a server-side denylist keyed by the jti claim.
  - question: What does the signature in a JWT prove?
    answer: That the header and payload have not changed since the issuer signed them, and that whoever signed them held the key. It does not hide the contents, and it says nothing about whether the token has expired or was meant for you. Those checks come from the claims.
---

## The three parts

Paste any JWT into a decoder and you get the same shape every time. Three chunks of base64url text, separated by dots.

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

The first chunk is the **header**. Decode it and you get a small JSON object naming the signing algorithm and, usually, the token type.

```json
{ "alg": "HS256", "typ": "JWT" }
```

The second is the **payload**. It carries the claims, which is the RFC's word for the facts the token asserts. Some claim names are registered in RFC 7519 and mean the same thing everywhere. `sub` is the subject, typically a user id. `iss` is who issued the token. `aud` is who it is for. `exp` and `iat` are expiry and issue time as Unix timestamps. Anything else is a private claim that means whatever the issuer decided.

```json
{ "sub": "1234567890", "name": "John Doe", "iat": 1516239022 }
```

The third is the **signature**. It is not JSON. It is the raw bytes produced by running the algorithm named in the header over the first two chunks, exactly as they appear in the token, using a key that only the issuer (and, for symmetric algorithms, the verifier) holds.

## Why base64url and not base64

Standard base64 uses `+`, `/`, and `=` padding. All three cause trouble in URLs and HTTP headers. Base64url swaps `+` for `-`, `/` for `_`, and drops the padding. The result is safe to put in a query string, a cookie, or an `Authorization: Bearer` header without escaping, which is the whole reason the format exists.

This is encoding, not encryption. A base64url decoder is all it takes to read the header and payload. Any browser can do it with `atob` after swapping the two characters back.

## How verification works

A receiver that wants to trust a JWT does the following, in order.

1. Split the token on dots. Anything other than three parts is not a JWS.
2. Decode the header and read `alg`. Reject it if the algorithm is not one the receiver expects. Never let the token pick the algorithm on its own, because that is how the `alg: none` and key-confusion attacks work.
3. Recompute the signature over `header.payload`, using the same bytes that arrived, with the receiver's key.
4. Compare the result to the third chunk in constant time.
5. Only then decode the payload and check the claims: `exp` has not passed, `nbf` has, `iss` and `aud` match what this service expects.

Step 3 is where the byte-for-byte rule matters. If a decoder reformats the JSON before re-signing, even by changing key order or whitespace, the signature stops matching. That is why a good debugger preserves the raw segments and only re-encodes when you actually edit them.

## What the signature does and does not give you

A valid signature proves two things. The token was produced by someone holding the signing key, and nothing in the header or payload has changed since. That is integrity and authenticity.

It does not give you confidentiality. The payload is public to anyone who sees the token. Putting an email address in `sub` is common and usually fine; putting a password reset code or a medical record in a claim is not.

It also does not give you freshness. A signature stays valid forever. Expiry is a claim, and enforcing it is the receiver's job. The same goes for revocation: once issued, a token cannot be recalled unless the receiver keeps its own list of tokens to refuse.

## Symmetric or asymmetric

The `alg` header decides who can verify. With HMAC algorithms such as HS256, the signing secret and the verification secret are the same string. Anyone who can verify can also forge. That is fine when one service issues and verifies its own tokens, and a problem the moment a second service needs to check them.

RSA and ECDSA algorithms (RS256, ES256, and their longer siblings) sign with a private key and verify with a public one. The issuer keeps the private key; every other service gets the public key, usually from a JWKS endpoint, and can verify without being able to mint tokens. For anything involving more than one party, this is the right choice. The [HS256 vs RS256](/blog/hs256-vs-rs256) article goes into the trade-offs.

## Where JWTs fit

JWTs are a good fit when a claim needs to travel between parties that do not share a database and cannot make a round trip for every request. An identity provider issues a token; an API verifies it locally and trusts the `sub` claim. OAuth 2.0 access tokens, OpenID Connect ID tokens, and most single sign-on flows use them this way.

They are a poor fit as a session store. A session that lives in a cookie and is looked up server-side can be revoked instantly and can hold as much state as you like. A JWT can do neither, and stuffing it with state makes every request larger. If you only have one server and it already has a database, a plain session is simpler and safer.

## Try it

The [decoder](/) on this site shows all three parts of any token you paste, flags expired ones, and verifies the signature if you supply the key. The [encoder](/jwt-encoder-online) builds a token from scratch so you can watch the signature change as you edit the payload. Both run entirely in your browser; nothing you paste leaves the page.
