import { useEffect, useState } from 'react';
import { getStoredConsent, setConsent, type ConsentValue } from '../../core/analytics';

export function ConsentBanner() {
  // Must start hidden and reveal in an effect, not read localStorage in the useState
  // initialiser: this component is prerendered to static HTML at build time, where
  // localStorage does not exist, and any value read on the client would disagree with
  // the prerendered markup and trip a hydration mismatch.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === null) setVisible(true);
  }, []);

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
