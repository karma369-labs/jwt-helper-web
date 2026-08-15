import { memo } from 'react';
import type { KeyMaterial, KeyInputType } from '../../core/jwt/algorithms';
import { track, trackThrottled } from '../../core/analytics';

interface Props {
  keyInputType: KeyInputType;
  keyMaterial: KeyMaterial;
  onChange: (key: KeyMaterial) => void;
  /** Decoder shows this as an optional verification step; Encoder needs it to sign. Changes the heading/copy only. */
  variant?: 'verify' | 'sign';
}

function KeyInputImpl({ keyInputType, keyMaterial, onChange, variant = 'sign' }: Props) {
  // Records *that* a key field was touched and whether it ended up non-empty —
  // never the key itself. Throttled per field so typing sends one event, not one per keystroke.
  const editKey = (field: string, next: KeyMaterial, value: string) => {
    trackThrottled(
      'key_input',
      { field, mode: variant, key_type: keyInputType, filled: value.length > 0 },
      3000,
      `key_input:${field}`
    );
    onChange(next);
  };

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
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                track('copy', { target: 'secret' });
                navigator.clipboard.writeText(keyMaterial.secret ?? '');
              }}
            >
              Copy
            </button>
          </div>
          <input
            id="key-secret"
            type="text"
            value={keyMaterial.secret ?? ''}
            onChange={(e) => editKey('secret', { ...keyMaterial, secret: e.target.value }, e.target.value)}
            placeholder="your-256-bit-secret"
          />
        </div>
      ) : (
        <div className="key-input key-input--pair">
          <div>
            <label htmlFor="key-public">Public Key</label>
            <textarea
              id="key-public"
              value={keyMaterial.publicKey ?? ''}
              onChange={(e) => editKey('public_key', { ...keyMaterial, publicKey: e.target.value }, e.target.value)}
              placeholder="-----BEGIN PUBLIC KEY-----"
            />
          </div>
          <div>
            {/* Editing header/payload always re-signs (see useJwt's EditOrigin model), even on the
                Decoder — so the private key has to be collectable here too, or that re-sign silently
                fails with a confusing PKCS8 error and no way to fix it. Optional: only needed if you
                edit content; pasting/verifying an as-is token only ever uses the public key above. */}
            <label htmlFor="key-private">Private Key {variant === 'verify' && <span className="key-section__optional-tag">(optional — only if editing header/payload)</span>}</label>
            <textarea
              id="key-private"
              value={keyMaterial.privateKey ?? ''}
              onChange={(e) => editKey('private_key', { ...keyMaterial, privateKey: e.target.value }, e.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const KeyInput = memo(KeyInputImpl);
