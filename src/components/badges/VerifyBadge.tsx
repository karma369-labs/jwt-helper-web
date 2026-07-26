import { memo } from 'react';
import type { VerifyState } from '../../hooks/useJwt';

const VERIFY_STATUS_MAP: Record<VerifyState['status'], { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'badge--idle' },
  checking: { label: 'Checking…', className: 'badge--checking' },
  valid: { label: 'Signature Verified', className: 'badge--valid' },
  invalid: { label: 'Invalid Signature', className: 'badge--invalid' },
  'unsupported-alg': { label: 'Unsupported Algorithm', className: 'badge--invalid' },
};

function VerifyBadgeImpl({ verify }: { verify: VerifyState }) {
  const { label, className } = VERIFY_STATUS_MAP[verify.status];

  return (
    <div className={`verify-badge ${className}`}>
      <span>{label}</span>
      {verify.message && <span className="verify-badge__message">{verify.message}</span>}
    </div>
  );
}

export const VerifyBadge = memo(VerifyBadgeImpl);
