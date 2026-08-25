import { lazy, Suspense, useEffect, useState } from 'react';
import type { JsonPaneProps } from './JsonPane';

// CodeMirror (~pulled in by JsonPane) is the largest dependency in the app and is split into
// its own chunk (see vite.config.ts manualChunks) — load it async so the shell (nav, token
// input) paints and becomes interactive before the editor chunk arrives.
const JsonPaneLazy = lazy(() => import('./JsonPane').then((m) => ({ default: m.JsonPane })));

export function LazyJsonPane(props: JsonPaneProps) {
  // The prerenderer (scripts/prerender.mjs) uses renderToString, which cannot resolve a
  // Suspense boundary — it emits the fallback and marks the boundary unfinished, and
  // hydration then aborts it with React error #419 and re-renders the subtree client-side.
  //
  // Gating on mount sidesteps that entirely: the server and the client's *first* render both
  // produce this skeleton, so hydration matches exactly, and the editor is swapped in on the
  // next commit. It also keeps the CodeMirror request off the hydration critical path.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const fallback = (
    <JsonPaneFallback title={props.title} accentClass={props.accentClass} readOnly={props.readOnly} />
  );

  if (!hydrated) return fallback;

  return (
    <Suspense fallback={fallback}>
      <JsonPaneLazy {...props} />
    </Suspense>
  );
}

function JsonPaneFallback({ title, accentClass, readOnly }: Pick<JsonPaneProps, 'title' | 'accentClass' | 'readOnly'>) {
  return (
    <div className={`json-pane ${accentClass}`}>
      <div className="json-pane__header">
        <span>
          {title}
          {readOnly && <span className="json-pane__readonly-tag"> (read-only)</span>}
        </span>
      </div>
      <div className="json-pane__skeleton" />
    </div>
  );
}
