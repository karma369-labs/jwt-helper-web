import { memo } from 'react';
import type { KeyMaterial, KeyInputType } from '../../core/jwt/algorithms';

interface Props {
  keyInputType: KeyInputType;
  keyMaterial: KeyMaterial;
  onChange: (key: KeyMaterial) => void;
  /** Decoder shows this as an optional verification step; Encoder needs it to sign. Changes the heading/copy only. */
  variant?: 'verify' | 'sign';
}

function KeyInputImpl({ keyInputType, keyMaterial, onChange, variant = 'sign' }: Props) {
  return (
    <div className="key-section">
      <h3>
        JWT Signature {variant === 'verify' ? 'Verification (Optional)' : 'Signing'}
      </h3>
      <p className="key-section__hint">
        {variant === 'verify'
          ? 'Enter the secret/key used to sign the JWT below:'
          : 'Enter a secret/key to sign the token with:'}
      </p>

      {keyInputType === 'secret' ? (
        <div className="key-input">
          <div className="key-input__row">
            <label htmlFor="key-secret">Secret</label>
            <button type="button" className="button-secondary" onClick={() => navigator.clipboard.writeText(keyMaterial.secret ?? '')}>Copy</button>
          </div>
          <input
            id="key-secret"
            type="text"
            value={keyMaterial.secret ?? ''}
            onChange={(e) => onChange({ ...keyMaterial, secret: e.target.value })}
            placeholder="your-256-bit-secret"
          />
        </div>
      ) : variant === 'verify' ? (
        // verifying only ever needs the public key — asking for a private key here is wrong
        <div className="key-input">
          <label htmlFor="key-public">Public Key</label>
          <textarea
            id="key-public"
            value={keyMaterial.publicKey ?? ''}
            onChange={(e) => onChange({ ...keyMaterial, publicKey: e.target.value })}
            placeholder="-----BEGIN PUBLIC KEY-----"
          />
        </div>
      ) : (
        <div className="key-input key-input--pair">
          <div>
            <label htmlFor="key-public">Public Key</label>
            <textarea
              id="key-public"
              value={keyMaterial.publicKey ?? ''}
              onChange={(e) => onChange({ ...keyMaterial, publicKey: e.target.value })}
              placeholder="-----BEGIN PUBLIC KEY-----"
            />
          </div>
          <div>
            <label htmlFor="key-private">Private Key</label>
            <textarea
              id="key-private"
              value={keyMaterial.privateKey ?? ''}
              onChange={(e) => onChange({ ...keyMaterial, privateKey: e.target.value })}
              placeholder="-----BEGIN PRIVATE KEY-----"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const KeyInput = memo(KeyInputImpl);
