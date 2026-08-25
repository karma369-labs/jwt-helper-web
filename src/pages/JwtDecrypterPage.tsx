import { DecoderPage } from './DecoderPage';
import type { UseJwtReturn } from '../hooks/useJwt';

/**
 * Targets the "jwt decrypter" search intent, which rests on a misconception: a standard
 * JWT is signed (JWS), not encrypted, so there is nothing to decrypt. The page reuses the
 * decoder tool but leads with content that corrects the premise — the unique explainer
 * below is also what keeps this from reading as a duplicate of the decoder route.
 */
export function JwtDecrypterPage(jwt: UseJwtReturn) {
  return (
    <>
      <DecoderPage {...jwt} />

      <section className="prose" aria-labelledby="decrypt-vs-decode">
        <h2 id="decrypt-vs-decode">Decrypting vs. decoding a JWT</h2>
        <p>
          If a token has three dot-separated parts, it is a <strong>JWS</strong> — a signed token.
          Its payload is base64url-encoded, which is an encoding, not a cipher. Anyone who holds the
          token can read every claim inside it without a key, which is precisely what the tool above
          does. The signature does not hide the contents; it only proves they have not been changed
          since the issuer signed them.
        </p>
        <p>
          Genuinely encrypted tokens use <strong>JWE</strong> (RFC 7516) and have five parts. Their
          ciphertext is unreadable without the recipient&rsquo;s decryption key, so no browser tool can
          open one for you.
        </p>

        <div className="prose__table-wrap">
          <table className="prose__table">
            <caption className="prose__caption">How the two token types compare</caption>
            <thead>
              <tr>
                <th scope="col">&nbsp;</th>
                <th scope="col">JWS (signed)</th>
                <th scope="col">JWE (encrypted)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Parts</th>
                <td>3</td>
                <td>5</td>
              </tr>
              <tr>
                <th scope="row">Payload readable without a key</th>
                <td>Yes</td>
                <td>No</td>
              </tr>
              <tr>
                <th scope="row">Guarantees</th>
                <td>Integrity, authenticity</td>
                <td>Integrity, authenticity, confidentiality</td>
              </tr>
              <tr>
                <th scope="row">Header fields</th>
                <td>
                  <code>alg</code>
                </td>
                <td>
                  <code>alg</code> and <code>enc</code>
                </td>
              </tr>
              <tr>
                <th scope="row">Typical use</th>
                <td>Access tokens, ID tokens, API auth</td>
                <td>Tokens carrying data that must stay private</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The practical consequence: never put anything confidential in a signed token&rsquo;s payload.
          Store an opaque identifier and keep the sensitive data server-side, or reach for JWE if the
          contents genuinely must travel encrypted.
        </p>
      </section>
    </>
  );
}
