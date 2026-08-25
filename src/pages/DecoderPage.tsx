import { TokenInput } from '../components/editors/TokenInput';
import { LazyJsonPane as JsonPane } from '../components/editors/LazyJsonPane';
import { KeyInput } from '../components/editors/KeyInput';
import { VerifyBadge } from '../components/badges/VerifyBadge';
import { ExpiryBadge } from '../components/badges/ExpiryBadge';
import { headerClaims, standardClaims } from '../core/jwt/claims';
import type { UseJwtReturn } from '../hooks/useJwt';

export function DecoderPage(jwt: UseJwtReturn) {
  const { token, header, payload, keyMaterial, parseError, verify, keyInputType, setToken, clearToken, setHeader, setKeyMaterial } = jwt;

  return (
    <div className="page page--decoder">
      <section className="app__column">
        <div className="app__column-header">
          <div className="app__column-title">
            <h2>Encoded</h2>
            <span className="app__column-subtitle">Paste a JWT token to inspect</span>
          </div>
        </div>
        <TokenInput token={token} onChange={setToken} onClear={clearToken} parseError={parseError} />
      </section>

      <section className="app__column">
        <div className="app__column-header">
          <div className="app__column-title">
            <h2>Decoded</h2>
            <span className="app__column-subtitle">Inspect claims &amp; verify signature</span>
          </div>
        </div>
        <JsonPane title="Header" value={header} onChange={setHeader} accentClass="pane--header" claimsTable={headerClaims} />
        <JsonPane title="Payload" value={payload} onChange={() => {}} accentClass="pane--payload" claimsTable={standardClaims} readOnly />
        <ExpiryBadge payload={payload} />

        <div className="signature-panel">
          <KeyInput keyInputType={keyInputType} keyMaterial={keyMaterial} onChange={setKeyMaterial} variant="verify" />
          <div className="signature-panel__footer">
            <VerifyBadge verify={verify} />
          </div>
        </div>
      </section>
    </div>
  );
}

