import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '../core/analytics';

/**
 * Clipboard write plus a short-lived `copied` flag for button feedback.
 * `target` is an app label ('token', 'secret') for analytics — the copied value itself is
 * never reported.
 */
export function useCopy(target: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear on unmount so a pane that closes mid-timeout doesn't setState afterwards.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    (value: string) => {
      track('copy', { target });
      void navigator.clipboard?.writeText(value).then(
        () => {
          setCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1500);
        },
        () => {
          // Clipboard can reject (permissions, insecure context). Staying silent is
          // better than falsely reporting success.
          setCopied(false);
        }
      );
    },
    [target]
  );

  return { copied, copy };
}
