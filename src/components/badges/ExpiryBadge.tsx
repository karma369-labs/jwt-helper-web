import { memo } from 'react';
import { getExpiryStatus } from '../../core/jwt/claims';

function ExpiryBadgeImpl({ payload }: { payload: Record<string, unknown> }) {
  const status = getExpiryStatus(payload);
  if (!status.hasExpiry) return null;

  return (
    <div className={`expiry-badge ${status.expired ? 'expiry-badge--expired' : 'expiry-badge--active'}`}>
      {status.expired ? 'Expired' : 'Expires'} {status.date?.toLocaleString()}
    </div>
  );
}

export const ExpiryBadge = memo(ExpiryBadgeImpl);
