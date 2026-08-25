/**
 * The mark is the token itself: three stacked bars in the same three accent colours the
 * token viewer uses for header / payload / signature, at uneven widths because real
 * segments are uneven. Decorative only — the adjacent wordmark carries the accessible name.
 */
export function Logo() {
  return (
    <svg
      className="logo"
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0.9"
        y="0.9"
        width="22.2"
        height="22.2"
        rx="6.4"
        fill="var(--surface-2)"
        stroke="var(--hairline-strong)"
        strokeWidth="1.3"
      />
      <rect className="logo__seg logo__seg--header" x="5.6" y="6.8" width="9.2" height="2.5" rx="1.25" />
      <rect className="logo__seg logo__seg--payload" x="5.6" y="10.75" width="12.8" height="2.5" rx="1.25" />
      <rect className="logo__seg logo__seg--signature" x="5.6" y="14.7" width="6.4" height="2.5" rx="1.25" />
    </svg>
  );
}
