import { TokenInput } from '../components/editors/TokenInput';
import { LazyJsonPane as JsonPane } from '../components/editors/LazyJsonPane';
import { KeyInput } from '../components/editors/KeyInput';
import { VerifyBadge } from '../components/badges/VerifyBadge';
import { ExpiryBadge } from '../components/badges/ExpiryBadge';
import { headerClaims, standardClaims } from '../core/jwt/claims';
import type { UseJwtReturn } from '../hooks/useJwt';

export function DecoderPage(jwt: UseJwtReturn) {
  const { token, header, payload, keyMaterial, parseError, verify, keyInputType, setToken, clearToken, setHeader, setKeyMaterial } = jwt;

  // No column headings here: the page lede already says "paste a token to decode its header
  // and payload", and each card names itself. A second "ENCODED / DECODED" row was restating it.
  // Left column is the token and its signature; right column is what the token contains.
  return (
    <div className="page page--decoder">
      <section className="app__column">
        <TokenInput token={token} onChange={setToken} onClear={clearToken} parseError={parseError} />
        <div className="signature-panel">
          <KeyInput keyInputType={keyInputType} keyMaterial={keyMaterial} onChange={setKeyMaterial} variant="verify" />
          <div className="signature-panel__footer">
            <VerifyBadge verify={verify} />
          </div>
        </div>
      </section>

      <section className="app__column">
        <JsonPane title="Header" value={header} onChange={setHeader} accentClass="pane--header" claimsTable={headerClaims} />
        <JsonPane title="Payload" value={payload} onChange={() => {}} accentClass="pane--payload" claimsTable={standardClaims} readOnly />
        <ExpiryBadge payload={payload} />
      </section>
    </div>
  );
}
