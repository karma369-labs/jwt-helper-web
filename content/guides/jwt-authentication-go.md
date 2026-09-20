---
title: JWT authentication in Go with golang-jwt
description: Sign and verify JSON Web Tokens in Go using golang-jwt/jwt v5. Covers HS256 and RS256, typed claims, parser options for issuer and audience, JWKS with keyfunc, and net/http middleware.
intro: golang-jwt (the maintained fork of dgrijalva/jwt-go) is the standard library for JWTs in Go. Version 5 tightened validation and made the safe options easier to reach. Here is the current API, end to end.
date: 2026-09-20
tags:
  - go
  - golang-jwt
relatedTools:
  - /
  - /jwt-encoder-online
faqs:
  - question: jwt-go or golang-jwt?
    answer: golang-jwt. dgrijalva/jwt-go is archived and has an unpatched CVE around audience handling. golang-jwt/jwt/v5 is the maintained successor with the same API shape and stricter defaults.
  - question: Why does Parse return "token signature is invalid" even though the key is right?
    answer: Usually the key function returned a string for an RS256 token, or []byte for one that needs an *rsa.PublicKey. Check t.Method inside the key function and return the type the method expects.
  - question: How do I verify Cognito or Auth0 tokens in Go?
    answer: Fetch the provider's JWKS with a library such as MicahParks/keyfunc, which handles caching and refresh, and pass its Keyfunc to jwt.ParseWithClaims along with WithIssuer, WithAudience, and WithValidMethods.
---

## Install

```bash
go get github.com/golang-jwt/jwt/v5
```

## Claims

Define a struct that embeds `jwt.RegisteredClaims` and adds your own. The embedded type gives you `exp`, `nbf`, `iat`, `iss`, `sub`, `aud`, and `jti`, plus the validation logic for the time-based ones.

```go
import "github.com/golang-jwt/jwt/v5"

type Claims struct {
    Role string `json:"role"`
    jwt.RegisteredClaims
}
```

## Signing

```go
import (
    "time"
    "github.com/golang-jwt/jwt/v5"
)

var secret = []byte(os.Getenv("JWT_SECRET")) // 32+ random bytes

func issue(userID string) (string, error) {
    now := time.Now()
    claims := Claims{
        Role: "admin",
        RegisteredClaims: jwt.RegisteredClaims{
            Subject:   userID,
            Issuer:    "https://api.example.com",
            Audience:  jwt.ClaimStrings{"https://api.example.com"},
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(secret)
}
```

For RS256, parse a PEM private key and pass an `*rsa.PrivateKey`. Set a `kid` in the header so verifiers can select the right public key.

```go
privateKey, err := jwt.ParseRSAPrivateKeyFromPEM([]byte(os.Getenv("JWT_PRIVATE_KEY")))
if err != nil {
    log.Fatal(err)
}

token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
token.Header["kid"] = "key-2026-09"
signed, err := token.SignedString(privateKey)
```

`ParseRSAPrivateKeyFromPEM` accepts both PKCS#1 (`BEGIN RSA PRIVATE KEY`) and PKCS#8 (`BEGIN PRIVATE KEY`).

## Verifying

The key function receives the parsed but unverified token and returns the key to verify with. The critical part is the parser options: `WithValidMethods` pins the algorithm, and `WithIssuer` and `WithAudience` make claim checks part of parsing.

```go
publicKey, err := jwt.ParseRSAPublicKeyFromPEM([]byte(os.Getenv("JWT_PUBLIC_KEY")))

func verify(tokenString string) (*Claims, error) {
    claims := &Claims{}
    token, err := jwt.ParseWithClaims(
        tokenString,
        claims,
        func(t *jwt.Token) (any, error) {
            return publicKey, nil // *rsa.PublicKey for RS256; []byte for HS256
        },
        jwt.WithValidMethods([]string{"RS256"}),
        jwt.WithIssuer("https://api.example.com"),
        jwt.WithAudience("https://api.example.com"),
        jwt.WithExpirationRequired(),
        jwt.WithLeeway(30*time.Second),
    )
    if err != nil {
        return nil, err
    }
    if !token.Valid {
        return nil, jwt.ErrTokenInvalidClaims
    }
    return claims, nil
}
```

`WithExpirationRequired` matters. By default a token with no `exp` is accepted as never expiring. Almost nobody wants that.

Errors are wrapped, so use `errors.Is` to branch.

```go
switch {
case errors.Is(err, jwt.ErrTokenExpired):
    // exp has passed
case errors.Is(err, jwt.ErrTokenSignatureInvalid):
    // wrong key, wrong alg, or tampered
case errors.Is(err, jwt.ErrTokenInvalidAudience), errors.Is(err, jwt.ErrTokenInvalidIssuer):
    // claim mismatch
default:
    // malformed, etc.
}
```

## Verifying against a JWKS endpoint

golang-jwt does not fetch key sets. `github.com/MicahParks/keyfunc/v3` fills the gap: it downloads the JWKS, caches it, refreshes on unknown `kid`, and hands you a `jwt.Keyfunc`.

```bash
go get github.com/MicahParks/keyfunc/v3
```

```go
import (
    "context"
    "github.com/MicahParks/keyfunc/v3"
    "github.com/golang-jwt/jwt/v5"
)

var jwks keyfunc.Keyfunc

func init() {
    var err error
    jwks, err = keyfunc.NewDefaultCtx(context.Background(), []string{
        "https://YOUR_DOMAIN/.well-known/jwks.json",
    })
    if err != nil {
        log.Fatalf("jwks: %v", err)
    }
}

func verifyRemote(tokenString string) (*Claims, error) {
    claims := &Claims{}
    _, err := jwt.ParseWithClaims(tokenString, claims, jwks.Keyfunc,
        jwt.WithValidMethods([]string{"RS256"}),
        jwt.WithIssuer("https://YOUR_DOMAIN/"),
        jwt.WithAudience("https://your-api-identifier"),
        jwt.WithExpirationRequired(),
    )
    return claims, err
}
```

Create the keyfunc once. It runs a background refresh; building one per request defeats the cache and hammers the provider.

## net/http middleware

```go
type ctxKey struct{}

func RequireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        scheme, token, ok := strings.Cut(r.Header.Get("Authorization"), " ")
        if !ok || scheme != "Bearer" || token == "" {
            http.Error(w, `{"error":"missing bearer token"}`, http.StatusUnauthorized)
            return
        }
        claims, err := verify(token)
        if err != nil {
            log.Printf("token rejected: %v", err) // reason only, never the token
            http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
            return
        }
        ctx := context.WithValue(r.Context(), ctxKey{}, claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func UserFrom(ctx context.Context) *Claims {
    c, _ := ctx.Value(ctxKey{}).(*Claims)
    return c
}
```

Return the same 401 for every failure. Distinguishing reasons in the response tells an attacker which tokens are worth retrying.

## Errors you will meet

**`token signature is invalid`**. The key function returned the wrong type (`[]byte` where `*rsa.PublicKey` was needed, or vice versa), the wrong key, or the token was modified. Paste the token into the [decoder](/) and check `alg` and `kid`.

**`token has invalid claims: token is expired`**. Check the clock, then the lifetime.

**`token has invalid claims: token has invalid audience`**. The token's `aud` does not include the value you passed to `WithAudience`. Common with Auth0 when the client forgot the `audience` parameter.

**`signing method RS256 is invalid`**. `WithValidMethods` did not include the token's algorithm. That is the guard working; decide deliberately whether to accept it.

**`failed to parse PEM block containing the key`**. The PEM string lost its newlines on the way through an environment variable. Base64-encode the whole PEM in config and decode it at startup, or load it from a file.

## Generating test tokens

The [encoder](/jwt-encoder-online) produces a token from a header, payload, and key you paste, signed in the browser. Make one with a wrong `aud` and one with `exp` in the past and confirm your middleware rejects both.
