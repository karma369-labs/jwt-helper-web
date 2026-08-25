import { memo } from 'react';

interface Props {
  alg: string;
  onChange: (alg: string) => void;
}

const ALG_GROUPS = [
  {
    family: 'HMAC (Shared Secret)',
    options: ['HS256', 'HS384', 'HS512'],
  },
  {
    family: 'RSA (Public/Private Key)',
    options: ['RS256', 'RS384', 'RS512'],
  },
  {
    family: 'ECDSA (Elliptic Curve)',
    options: ['ES256', 'ES384', 'ES512'],
  },
];

function AlgSelectImpl({ alg, onChange }: Props) {
  return (
    <div className="alg-select-wrapper">
      <label htmlFor="alg-select-input" className="sr-only">Signing Algorithm</label>
      <div className="alg-select-container">
        <span className="alg-select-prefix">ALG</span>
        <select
          id="alg-select-input"
          className="alg-select"
          aria-label="Algorithm"
          value={alg}
          onChange={(e) => onChange(e.target.value)}
        >
          {ALG_GROUPS.map((group) => (
            <optgroup key={group.family} label={group.family}>
              {group.options.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <svg
          className="alg-select-chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export const AlgSelect = memo(AlgSelectImpl);

