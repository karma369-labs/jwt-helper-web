import { LazyJsonPane as JsonPane } from '../components/editors/LazyJsonPane';
import { AlgSelect } from '../components/editors/AlgSelect';
import { KeyInput } from '../components/editors/KeyInput';
import { ExpirySelector } from '../components/editors/ExpirySelector';
import { VerifyBadge } from '../components/badges/VerifyBadge';
import { ExpiryBadge } from '../components/badges/ExpiryBadge';
import { headerClaims, standardClaims } from '../core/jwt/claims';
import type { UseJwtReturn } from '../hooks/useJwt';
import { track } from '../core/analytics';

// Encoder page: build-a-token workflow. Left = header/payload, right = key + signed output.
export function EncoderPage(jwt: UseJwtReturn) {
  const { token, header, payload, keyMaterial, verify, keyInputType, setHeader, setPayload, setAlg, setSignKeyMaterial } = jwt;
  const alg = (header.alg as string) ?? 'HS256';

  return (
    <div className="page page--encoder">
      <section className="app__column">
        <div className="encoder__alg-row">
          <h2>Configuration</h2>
          <AlgSelect alg={alg} onChange={setAlg} />
        </div>
        <JsonPane title="Header" value={header} onChange={setHeader} accentClass="pane--header" claimsTable={headerClaims} />
        <JsonPane title="Payload" value={payload} onChange={setPayload} accentClass="pane--payload" claimsTable={standardClaims} />
        <ExpirySelector payload={payload} onChange={setPayload} />
        <ExpiryBadge payload={payload} />
      </section>

      <section className="app__column">
        <h2>Sign &amp; Output</h2>
        <div className="signature-panel">
          <KeyInput keyInputType={keyInputType} keyMaterial={keyMaterial} onChange={setSignKeyMaterial} variant="sign" />
        </div>
        
        <div className="encoder__output">
          <div className="encoder__output-header">
            <span>Encoded Token</span>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                track('copy', { target: 'encoded_token' });
                navigator.clipboard.writeText(token);
              }}
            >
              Copy
            </button>
          </div>
          <code className="encoder__token-text">{token}</code>
        </div>
        <VerifyBadge verify={verify} />
      </section>
    </div>
  );
}
