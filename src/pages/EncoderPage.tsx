import { LazyJsonPane as JsonPane } from '../components/editors/LazyJsonPane';
import { AlgSelect } from '../components/editors/AlgSelect';
import { KeyInput } from '../components/editors/KeyInput';
import { ExpirySelector } from '../components/editors/ExpirySelector';
import { VerifyBadge } from '../components/badges/VerifyBadge';
import { headerClaims, standardClaims } from '../core/jwt/claims';
import type { UseJwtReturn } from '../hooks/useJwt';
import { useCopy } from '../hooks/useCopy';

export function EncoderPage(jwt: UseJwtReturn) {
  const { token, header, payload, keyMaterial, verify, keyInputType, setHeader, setPayload, setAlg, setSignKeyMaterial } = jwt;
  const alg = (header.alg as string) ?? 'HS256';
  const { copied, copy } = useCopy('encoded_token');

  const renderVisualToken = () => {
    const parts = token.split('.');
    if (parts.length === 3) {
      return (
        <div className="token-viewer-content">
          <span className="jwt-part jwt-part--header">{parts[0]}</span>
          <span className="jwt-part jwt-part--dot">.</span>
          <span className="jwt-part jwt-part--payload">{parts[1]}</span>
          <span className="jwt-part jwt-part--dot">.</span>
          <span className="jwt-part jwt-part--signature">{parts[2]}</span>
        </div>
      );
    }
    return <div className="token-viewer-content">{token}</div>;
  };

  return (
    <div className="page page--encoder">
      <section className="app__column">
        <div className="app__column-header">
          <div className="app__column-title">
            <h2>Configuration</h2>
          </div>
          <AlgSelect alg={alg} onChange={setAlg} />
        </div>

        <JsonPane title="Header" value={header} onChange={setHeader} accentClass="pane--header" claimsTable={headerClaims} />
        <JsonPane title="Payload" value={payload} onChange={setPayload} accentClass="pane--payload" claimsTable={standardClaims} />
        <ExpirySelector payload={payload} onChange={setPayload} />
      </section>

      <section className="app__column">
        <div className="app__column-header">
          <div className="app__column-title">
            <h2>Sign &amp; Output</h2>
          </div>
        </div>

        <div className="signature-panel">
          <KeyInput keyInputType={keyInputType} keyMaterial={keyMaterial} onChange={setSignKeyMaterial} variant="sign" />
        </div>
        
        <div className="encoder__output">
          <div className="encoder__output-header">
            <div className="encoder__output-title">
              <span>Encoded Token</span>
            </div>
            <button
              type="button"
              className={`button-secondary button-secondary--sm ${copied ? 'button--copied' : ''}`}
              onClick={() => copy(token)}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M2 8.5V2.5C2 1.94772 2.44772 1.5 3 1.5H9" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="encoder__token-box">
            {renderVisualToken()}
          </div>
          <div className="encoder__output-footer">
            <VerifyBadge verify={verify} />
          </div>
        </div>
      </section>
    </div>
  );
}

