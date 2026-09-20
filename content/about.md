---
title: About JWT Debugger
description: JWT Debugger is a free, client-side tool for decoding, verifying, and generating JSON Web Tokens. Nothing you paste leaves your browser. Here is what it does, how it is built, and why it works the way it does.
h1: About JWT Debugger
intro: A JWT tool that runs entirely in your browser, with no backend to trust and nothing to sign up for.
date: 2026-09-20
relatedTools:
  - /
  - /jwt-encoder-online
  - /jwt-decrypter
faqs:
  - question: Does JWT Debugger store or transmit my tokens?
    answer: No. There is no backend. Decoding, signing, and verification run in your browser using the WebCrypto API. You can confirm this in your browser's Network tab, where nothing is sent while you type.
  - question: Is it free to use?
    answer: Yes, with no account and no limits. Analytics is limited to aggregate interaction events, such as which algorithm was selected, and never includes token, key, or claim values.
  - question: Which algorithms are supported?
    answer: HS256, HS384, HS512, RS256, RS384, RS512, ES256, ES384, and ES512. Signed tokens (JWS) are fully supported. Encrypted tokens (JWE) are detected but cannot be decrypted, since that would require the recipient's private key.
---

## What it does

JWT Debugger takes a JSON Web Token and shows you what is inside it. Paste one into the [decoder](/) and the header and payload appear as formatted JSON, with recognised claims labelled and expiry flagged. Add the secret or public key and it verifies the signature.

The [encoder](/jwt-encoder-online) works the other way. Edit a header and payload, pick an algorithm, supply a key, and it produces a signed token that updates as you type. It is the quickest way to make a test token with a specific claim or an already-expired timestamp.

The [decrypter](/jwt-decrypter) page exists because a lot of people search for "decrypt JWT" when what they have is a signed token that only needs decoding. It explains the difference and decodes the token anyway.

## Where your data goes

Nowhere. This is the whole design.

The site is static HTML and JavaScript. There is no API, no server-side session, and no request that carries your input. Base64url decoding is a few lines of code. Signing and verification use the browser's built-in WebCrypto API through the `jose` library. Your tokens, secrets, and private keys stay in the tab and are gone when you close it.

You do not have to take that on trust. Open your browser's developer tools, switch to the Network tab, and paste a token. The list stays empty.

The only network traffic the site generates is loading its own files and, if you accept the cookie banner, Google Analytics. Analytics events describe interactions in the abstract, such as "algorithm changed to RS256" or "signature verified", and are filtered so that anything resembling a token, key, or claim value is dropped before it is sent.

## Why tamper detection is treated as the hard part

A JWT debugger has one job it must never get wrong: if you paste a token and a key, and the token was modified after signing, the tool has to say so.

That sounds simple until you notice that most tools reformat the JSON they show you. Reformatting changes bytes. If a tool re-encodes the header and payload from its pretty-printed view and then verifies that, it is verifying its own output rather than your token, and a tampered token can pass.

JWT Debugger keeps the raw base64url segments exactly as you pasted them and verifies those. It only re-encodes when you edit the JSON yourself, because at that point you are authoring a new token and want a fresh signature. Every state change is tagged with where it came from so the two paths never cross.

## What it is built with

React and TypeScript, bundled with Vite. The `jose` library for cryptography, because it implements the JOSE specifications faithfully and defers to WebCrypto rather than shipping its own primitives. CodeMirror for the JSON editors. Every page is prerendered to static HTML at build time so the content is readable without JavaScript, then hydrated for interactivity.

The tool pages are the product. The [blog](/blog), [guides](/guides), and [use cases](/use-cases) exist because the most common reason a token fails to verify is a misunderstanding rather than a bug, and a good explanation saves more time than a good error message.

## Known limits

- JWE (encrypted) tokens are identified but cannot be decrypted. That requires the recipient's private key and is not something a general-purpose tool should ask for.
- `alg: none` tokens are reported as unsupported rather than accepted.
- There is no server, so there is no way to save or share a token by link. That is deliberate.

## Related

The same approach to keeping data in the browser is behind [jsonspace.io](https://jsonspace.io), a JSON formatter and validator from the same author.
