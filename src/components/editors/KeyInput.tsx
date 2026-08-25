import { memo } from 'react';
import type { KeyMaterial, KeyInputType } from '../../core/jwt/algorithms';
import { trackThrottled } from '../../core/analytics';
import { useCopy } from '../../hooks/useCopy';

interface Props {
  keyInputType: KeyInputType;
  keyMaterial: KeyMaterial;
  onChange: (key: KeyMaterial) => void;
  variant?: 'verify' | 'sign';
}

function KeyInputImpl({ keyInputType, keyMaterial, onChange, variant = 'sign' }: Props) {
  const { copied, copy } = useCopy('secret');

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
      <div className="card-header-bar">
        <div className="card-header-bar__title-wrap">
          <span className="key-pip" />
          <span className="card-header-bar__title">
            {variant === 'verify' ? 'Signature Verification' : 'Signature Key'}
          </span>
          {variant === 'verify' && <span className="card-header-bar__tag">optional</span>}
        </div>
        <span className="card-header-bar__hint">
          {keyInputType === 'secret' ? 'HMAC secret' : 'Key pair'}
        </span>
      </div>

      <div className="key-section__body">
        {keyInputType === 'secret' ? (
          <div className="key-input">
            <div className="key-input__row">
              <label htmlFor="key-secret">Secret Key</label>
              <button
                type="button"
                className={`button-secondary ${copied ? 'button--copied' : ''}`}
                onClick={() => copy(keyMaterial.secret ?? '')}
              >
                {copied ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M2 8.5V2.5C2 1.94772 2.44772 1.5 3 1.5H9" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <input
              id="key-secret"
              type="text"
              className="key-secret-input"
              value={keyMaterial.secret ?? ''}
              onChange={(e) => editKey('secret', { ...keyMaterial, secret: e.target.value }, e.target.value)}
              placeholder="your-256-bit-secret"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="key-input key-input--pair">
            <div className="key-input-field">
              <label htmlFor="key-public">Public Key (SPKI / PEM)</label>
              <textarea
                id="key-public"
                value={keyMaterial.publicKey ?? ''}
                onChange={(e) => editKey('public_key', { ...keyMaterial, publicKey: e.target.value }, e.target.value)}
                placeholder="-----BEGIN PUBLIC KEY-----"
                spellCheck={false}
              />
            </div>
            <div className="key-input-field">
              <label htmlFor="key-private">
                Private Key {variant === 'verify' && <span className="key-section__optional-tag">(optional)</span>}
              </label>
              <textarea
                id="key-private"
                value={keyMaterial.privateKey ?? ''}
                onChange={(e) => editKey('private_key', { ...keyMaterial, privateKey: e.target.value }, e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----"
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const KeyInput = memo(KeyInputImpl);


