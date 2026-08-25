import { memo } from 'react';
import { getExpiryStatus } from '../../core/jwt/claims';

function ExpiryBadgeImpl({ payload }: { payload: Record<string, unknown> }) {
  const status = getExpiryStatus(payload);
  if (!status.hasExpiry) return null;

  return (
    <div className={`expiry-badge ${status.expired ? 'expiry-badge--expired' : 'expiry-badge--active'}`}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span>{status.expired ? 'Expired' : 'Expires'}: {status.date?.toLocaleString()}</span>
    </div>
  );
}

export const ExpiryBadge = memo(ExpiryBadgeImpl);

