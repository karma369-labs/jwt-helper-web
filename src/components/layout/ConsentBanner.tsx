import { useState } from 'react';
import { getStoredConsent, setConsent, type ConsentValue } from '../../core/analytics';

export function ConsentBanner() {
  const [visible, setVisible] = useState(() => getStoredConsent() === null);

  if (!visible) return null;

  const choose = (value: ConsentValue) => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div className="consent-banner" role="dialog" aria-label="Cookie consent">
      <p className="consent-banner__text">
        This site uses Google Analytics to see which features get used — never your tokens, keys,
        or claim values, which stay in your browser. Allow analytics cookies?
      </p>
      <div className="consent-banner__actions">
        <button type="button" className="button-secondary" onClick={() => choose('denied')}>
          Decline
        </button>
        <button type="button" className="button-primary" onClick={() => choose('granted')}>
          Accept
        </button>
      </div>
    </div>
  );
}
