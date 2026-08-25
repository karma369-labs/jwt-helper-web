import { memo } from 'react';
import type { VerifyState } from '../../hooks/useJwt';

const VERIFY_STATUS_MAP: Record<VerifyState['status'], { label: string; className: string }> = {
  idle: { label: 'Signature Idle', className: 'badge--idle' },
  checking: { label: 'Checking Signature…', className: 'badge--checking' },
  valid: { label: 'Signature Verified', className: 'badge--valid' },
  invalid: { label: 'Invalid Signature', className: 'badge--invalid' },
  'unsupported-alg': { label: 'Unsupported Algorithm', className: 'badge--invalid' },
};

function VerifyBadgeImpl({ verify }: { verify: VerifyState }) {
  const { label, className } = VERIFY_STATUS_MAP[verify.status];

  return (
    <div className={`verify-badge ${className}`}>
      <div className="verify-badge__left">
        {verify.status === 'valid' && (
          <svg className="verify-badge__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5L2.5 3.5V7.5C2.5 11 5 14 8 15C11 14 13.5 11 13.5 7.5V3.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M5.5 8L7.2 9.7L10.5 6.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {verify.status === 'invalid' || verify.status === 'unsupported-alg' ? (
          <svg className="verify-badge__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5L2.5 3.5V7.5C2.5 11 5 14 8 15C11 14 13.5 11 13.5 7.5V3.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M8 5.5V8.5M8 11H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : null}
        {verify.status === 'checking' && (
          <svg className="verify-badge__icon verify-badge__icon--spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
            <path d="M14 8A6 6 0 0 0 8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
        {verify.status === 'idle' && (
          <svg className="verify-badge__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5L2.5 3.5V7.5C2.5 11 5 14 8 15C11 14 13.5 11 13.5 7.5V3.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          </svg>
        )}
        <span className="verify-badge__label">{label}</span>
      </div>
      {verify.message && <span className="verify-badge__message">{verify.message}</span>}
    </div>
  );
}

export const VerifyBadge = memo(VerifyBadgeImpl);

