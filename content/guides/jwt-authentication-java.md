---
title: JWT authentication in Java with JJWT and Spring Security
description: Sign and verify JSON Web Tokens in Java using JJWT 0.12. Covers HS256 and RS256, claim validation, key generation, a servlet filter, and how Spring Security's resource server handles JWKS for you.
intro: JJWT is the most common standalone JWT library for Java, and Spring Security has first-class support for verifying tokens against a JWKS endpoint. Here is how to use both without the classic mistakes.
date: 2026-09-20
tags:
  - java
  - jjwt
  - spring-security
relatedTools:
  - /
  - /jwt-encoder-online
faqs:
  - question: JJWT or Nimbus JOSE+JWT?
    answer: JJWT has the friendlier API and is enough for issuing and verifying your own tokens. Nimbus is what Spring Security uses under the hood and covers more of the JOSE spec, including JWE. If you are on Spring, let Spring handle verification and reach for JJWT only when you need to issue tokens.
  - question: Why does JJWT throw WeakKeyException?
    answer: Your HS256 secret is shorter than 256 bits. JJWT enforces the RFC 7518 minimum. Generate a 32-byte random secret rather than reusing a short passphrase.
  - question: How do I verify Auth0 or Cognito tokens in Spring Boot?
    answer: Add spring-boot-starter-oauth2-resource-server and set spring.security.oauth2.resourceserver.jwt.issuer-uri to the provider's issuer. Spring discovers the JWKS URL, caches keys, and validates the signature and issuer. Add an audience validator yourself.
---

## Install

```xml
<dependency>
  <groupId>io.jsonwebtoken</groupId>
  <artifactId>jjwt-api</artifactId>
  <version>0.12.6</version>
</dependency>
<dependency>
  <groupId>io.jsonwebtoken</groupId>
  <artifactId>jjwt-impl</artifactId>
  <version>0.12.6</version>
  <scope>runtime</scope>
</dependency>
<dependency>
  <groupId>io.jsonwebtoken</groupId>
  <artifactId>jjwt-jackson</artifactId>
  <version>0.12.6</version>
  <scope>runtime</scope>
</dependency>
```

The three artifacts are deliberate: `api` is what you compile against, `impl` and a JSON binding are runtime-only so the implementation can change without touching your code.

## Keys

For HS256, the secret must be at least 32 bytes. JJWT will refuse anything shorter with `WeakKeyException`.

```java
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import java.util.Base64;

// From a base64-encoded 32+ byte secret in configuration
SecretKey key = Keys.hmacShaKeyFor(
    Base64.getDecoder().decode(System.getenv("JWT_SECRET_B64"))
);

// Or generate a fresh one (for tests)
SecretKey generated = Jwts.SIG.HS256.key().build();
```

For RS256, load a PEM key pair. JJWT does not parse PEM itself; use the JDK's `KeyFactory` with the base64 body, or a helper like Bouncy Castle's `PEMParser`.

```java
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;

static PrivateKey loadPrivate(String pem) throws Exception {
    String body = pem.replaceAll("-----\\w+ PRIVATE KEY-----", "").replaceAll("\\s", "");
    var spec = new PKCS8EncodedKeySpec(Base64.getDecoder().decode(body));
    return KeyFactory.getInstance("RSA").generatePrivate(spec);
}

static PublicKey loadPublic(String pem) throws Exception {
    String body = pem.replaceAll("-----\\w+ PUBLIC KEY-----", "").replaceAll("\\s", "");
    var spec = new X509EncodedKeySpec(Base64.getDecoder().decode(body));
    return KeyFactory.getInstance("RSA").generatePublic(spec);
}
```

The private key must be PKCS#8 (`BEGIN PRIVATE KEY`). A `BEGIN RSA PRIVATE KEY` block is PKCS#1 and `PKCS8EncodedKeySpec` will reject it; convert with `openssl pkcs8 -topk8 -nocrypt`.

## Signing

```java
import io.jsonwebtoken.Jwts;
import java.time.Instant;
import java.util.Date;

Instant now = Instant.now();

String token = Jwts.builder()
    .header().keyId("key-2026-09").and()
    .subject("user_123")
    .issuer("https://api.example.com")
    .audience().add("https://api.example.com").and()
    .issuedAt(Date.from(now))
    .expiration(Date.from(now.plusSeconds(15 * 60)))
    .claim("role", "admin")
    .signWith(privateKey)          // algorithm inferred from the key: RS256 for RSA-2048
    .compact();
```

`signWith(key)` picks the algorithm from the key type. Pass `Jwts.SIG.RS256` as a second argument if you want it pinned explicitly, which is worth doing for readability.

## Verifying

```java
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;

JwtParser parser = Jwts.parser()
    .verifyWith(publicKey)                     // or .verifyWith(secretKey) for HS256
    .requireIssuer("https://api.example.com")
    .requireAudience("https://api.example.com")
    .clockSkewSeconds(30)
    .build();

try {
    Claims claims = parser.parseSignedClaims(token).getPayload();
    String userId = claims.getSubject();
} catch (ExpiredJwtException e) {
    // exp has passed
} catch (JwtException e) {
    // bad signature, wrong issuer/audience, malformed, unsupported alg
}
```

Build the parser once and reuse it; it is thread-safe. `parseSignedClaims` refuses unsigned tokens and tokens whose algorithm does not match the key type, which closes the `alg: none` and key-confusion holes. Do not use `parseUnsecuredClaims` on anything that came from the network.

## Verifying against JWKS with JJWT

JJWT does not fetch remote key sets. You have two options: use a `Locator` that resolves keys by `kid` from a JWKS you fetch and cache yourself, or let Spring Security do it. For a plain servlet app the locator looks like this.

```java
import io.jsonwebtoken.Locator;
import io.jsonwebtoken.ProtectedHeader;
import java.security.Key;

class JwksLocator implements Locator<Key> {
    private final Map<String, PublicKey> keysByKid; // refreshed on a schedule

    @Override
    public Key locate(ProtectedHeader header) {
        Key key = keysByKid.get(header.getKeyId());
        if (key == null) throw new JwtException("unknown kid");
        return key;
    }
}

JwtParser parser = Jwts.parser()
    .keyLocator(new JwksLocator(...))
    .requireIssuer(issuer)
    .build();
```

Parsing a JWKS document into `PublicKey` objects is straightforward with `Jwts.parser().parse` on each JWK, or with Nimbus's `JWKSet.load`.

## Spring Security resource server

If you are on Spring Boot, skip the hand-rolled parser for verification. The resource server starter fetches JWKS, caches keys by `kid`, checks the signature, `exp`, `nbf`, and `iss`, and exposes claims as a `Jwt` principal.

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://YOUR_DOMAIN/
```

Spring reads `issuer-uri`, discovers the JWKS location from the issuer's OpenID configuration, and validates every incoming bearer token. What it does not do by default is check `aud`. Add that.

```java
@Bean
JwtDecoder jwtDecoder(OAuth2ResourceServerProperties props) {
    NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation(props.getJwt().getIssuerUri());
    OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>(
        "aud", aud -> aud != null && aud.contains("https://your-api-identifier"));
    OAuth2TokenValidator<Jwt> issuer = JwtValidators.createDefaultWithIssuer(props.getJwt().getIssuerUri());
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(issuer, audience));
    return decoder;
}
```

Then read claims in a controller with `@AuthenticationPrincipal Jwt jwt` and `jwt.getSubject()`.

## Errors you will meet

**`SignatureException: JWT signature does not match`**. Wrong key, wrong algorithm, or a modified token. Paste the token into the [decoder](/) to confirm the `alg` and `kid` and compare them with the key you loaded.

**`WeakKeyException`**. HS256 secret under 32 bytes. Generate a proper one.

**`UnsupportedJwtException: Unsigned Claims JWTs are not supported`**. You called `parseSignedClaims` on an `alg: none` token. This is the library protecting you.

**`InvalidKeySpecException`** while loading a PEM. Almost always a PKCS#1 key where PKCS#8 was expected, or header lines that were not stripped.

**`IncorrectClaimException: Expected aud claim to be ...`**. The token's audience does not include yours. Check the identity provider's API identifier against what you configured.

## Generating test tokens

The [encoder](/jwt-encoder-online) signs a token with any secret or PEM key you paste, in the browser. Use it to produce a token with a wrong audience or a past `exp` and confirm your filter rejects both with the same 401.
