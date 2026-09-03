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
    <JsonPaneFallback
      title={props.title}
      accentClass={props.accentClass}
      readOnly={props.readOnly}
      value={props.value}
    />
  );

  if (!hydrated) return fallback;

  return (
    <Suspense fallback={fallback}>
      <JsonPaneLazy {...props} />
    </Suspense>
  );
}

function JsonPaneFallback({
  title,
  accentClass,
  readOnly,
  value,
}: Pick<JsonPaneProps, 'title' | 'accentClass' | 'readOnly' | 'value'>) {
  // The editor replaces this node on hydration, so any difference between the two heights
  // lands directly in Cumulative Layout Shift. Reserve the height CodeMirror will take:
  // one 1.4em line per JSON line plus its padding, clamped to the same min/max the
  // <CodeMirror> element is configured with. Kept in em so it tracks .cm-editor's font-size.
  const lines = JSON.stringify(value, null, 2).split('\n').length;

  return (
    <div className={`json-pane ${accentClass}`}>
      <div className="json-pane__header">
        <span>
          {title}
          {readOnly && <span className="tag"> (read-only)</span>}
        </span>
      </div>
      <div className="json-pane__skeleton" style={{ height: `calc(${lines} * 1.4em + 32px)` }} />
    </div>
  );
}
