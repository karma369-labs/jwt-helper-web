import { TokenInput } from '../components/editors/TokenInput';
import { JsonPane } from '../components/editors/JsonPane';
import { KeyInput } from '../components/editors/KeyInput';
import { VerifyBadge } from '../components/badges/VerifyBadge';
import { ExpiryBadge } from '../components/badges/ExpiryBadge';
import { headerClaims, standardClaims } from '../core/jwt/claims';
import type { UseJwtReturn } from '../hooks/useJwt';

// Decoder page: paste-a-token workflow. Header stays editable (e.g. to test an alg swap); Payload is read-only, reflecting the pasted token.
export function DecoderPage(jwt: UseJwtReturn) {
  const { token, header, payload, keyMaterial, parseError, verify, keyInputType, setToken, clearToken, setHeader, setKeyMaterial } = jwt;

  return (
    <div className="page page--decoder">
      <section className="app__column">
        <h2>Encoded</h2>
        <TokenInput token={token} onChange={setToken} onClear={clearToken} parseError={parseError} />
      </section>

      <section className="app__column">
        <h2>Decoded</h2>
        <JsonPane title="Header" value={header} onChange={setHeader} accentClass="pane--header" claimsTable={headerClaims} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <JsonPane title="Payload" value={payload} onChange={() => {}} accentClass="pane--payload" claimsTable={standardClaims} readOnly />
          <ExpiryBadge payload={payload} />
        </div>

        <div className="signature-panel">
          <KeyInput keyInputType={keyInputType} keyMaterial={keyMaterial} onChange={setKeyMaterial} variant="verify" />
          <VerifyBadge verify={verify} />
        </div>
      </section>
    </div>
  );
}
