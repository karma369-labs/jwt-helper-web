/**
 * GA4 event wrapper.
 *
 * Hard rule for this app: nothing derived from a user's token, key, secret, or
 * decoded claim *values* is ever passed to `track`. Callers send shape only —
 * algorithm names, statuses, which pane was edited, coarse length buckets.
 * `sanitize` below is a backstop rather than the primary defence: it drops any
 * value that is long or PEM/JWT-shaped, so a careless future call site can't
 * quietly ship key material to Google.
 *
 * The gtag snippet itself lives in index.html; this module only ever reads
 * `window.gtag`, so an ad blocker removing it degrades to a no-op.
 */

type Primitive = string | number | boolean;

export type EventParams = Record<string, Primitive | undefined>;

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Only report from production builds — otherwise `bun run dev` pollutes the
// property with local traffic. In dev the same calls log to the console, which
// is how you verify instrumentation without opening GA. Set
// VITE_ANALYTICS_DEV=true to send real hits from a dev server anyway.
const ENABLED = import.meta.env.PROD || import.meta.env.VITE_ANALYTICS_DEV === 'true';

// GA4 caps param values at 100 chars; we cap far lower since nothing we send
// legitimately needs more than a short enum-ish token.
const MAX_VALUE_LENGTH = 64;
const PEM_RE = /-----\s*BEGIN/i;
const JWT_RE = /[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/;

function sanitizeValue(value: Primitive | undefined): Primitive | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  const text = value.trim();
  if (!text) return undefined;
  if (text.length > MAX_VALUE_LENGTH) return undefined;
  if (PEM_RE.test(text) || JWT_RE.test(text)) return undefined;
  return text;
}

function sanitize(params: EventParams): Record<string, Primitive> {
  const clean: Record<string, Primitive> = {};
  for (const [key, value] of Object.entries(params)) {
    const safe = sanitizeValue(value);
    if (safe !== undefined) clean[key] = safe;
  }
  return clean;
}

/** Trim free-form text (error messages) to something the sanitizer will accept. */
export function shorten(text: string, max = MAX_VALUE_LENGTH): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Coarse size bucket — keeps GA cardinality low and never reveals exact content length. */
export function lengthBucket(length: number): string {
  if (length === 0) return '0';
  if (length < 128) return '1-127';
  if (length < 256) return '128-255';
  if (length < 512) return '256-511';
  if (length < 1024) return '512-1023';
  return '1024+';
}

export function track(event: string, params: EventParams = {}): void {
  const clean = sanitize(params);
  if (!ENABLED) {
    if (import.meta.env.DEV) console.debug('[analytics]', event, clean);
    return;
  }
  window.gtag?.('event', event, clean);
}

const lastFiredAt = new Map<string, number>();

/**
 * For events driven by typing — fires at most once per `windowMs` so a burst of
 * keystrokes becomes one "the user edited this field" signal instead of 40.
 */
export function trackThrottled(
  event: string,
  params: EventParams = {},
  windowMs = 3000,
  key = event
): void {
  const now = Date.now();
  if (now - (lastFiredAt.get(key) ?? 0) < windowMs) return;
  lastFiredAt.set(key, now);
  track(event, params);
}

/**
 * The app is a single document with an in-app tab toggle, so GA's automatic
 * page_view only ever fires once. This reports Decoder/Encoder as separate
 * virtual pages so they show up in the Pages report.
 */
export function trackPageView(path: string, title: string): void {
  if (!ENABLED) {
    if (import.meta.env.DEV) console.debug('[analytics] page_view', path, title);
    return;
  }
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: title,
  });
}

/** Uncaught errors and rejections, so breakage shows up in GA rather than only in a user's console. */
export function installErrorTracking(): void {
  window.addEventListener('error', (event) => {
    track('js_error', {
      message: shorten(event.message ?? 'unknown'),
      source: shorten(`${event.filename ?? ''}:${event.lineno ?? 0}`),
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    track('unhandled_rejection', {
      message: shorten(reason instanceof Error ? reason.message : String(reason ?? 'unknown')),
    });
  });
}

/** One-shot session event with the capability flags that actually gate this app's features. */
export function trackAppLoaded(): void {
  track('app_loaded', {
    webcrypto: typeof crypto !== 'undefined' && !!crypto.subtle,
    clipboard: typeof navigator !== 'undefined' && !!navigator.clipboard,
  });
}

/**
 * Consent Mode v2 (EU/UK ePrivacy). `analytics_storage` defaults to 'denied' in
 * index.html, so GA sets no cookie until the user accepts the in-app banner.
 * The key here must match the one read synchronously in index.html.
 */
const CONSENT_KEY = 'cookie_consent';

export type ConsentValue = 'granted' | 'denied';

export function getStoredConsent(): ConsentValue | null {
  const value = localStorage.getItem(CONSENT_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

export function setConsent(value: ConsentValue): void {
  localStorage.setItem(CONSENT_KEY, value);
  window.gtag?.('consent', 'update', { analytics_storage: value });
}
