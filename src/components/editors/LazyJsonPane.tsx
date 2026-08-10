import { lazy, Suspense } from 'react';
import type { JsonPaneProps } from './JsonPane';

// CodeMirror (~pulled in by JsonPane) is the largest dependency in the app and is split into
// its own chunk (see vite.config.ts manualChunks) — load it async so the shell (tabs, token
// input) paints and becomes interactive before the editor chunk arrives.
const JsonPaneLazy = lazy(() => import('./JsonPane').then((m) => ({ default: m.JsonPane })));

export function LazyJsonPane(props: JsonPaneProps) {
  return (
    <Suspense fallback={<JsonPaneFallback title={props.title} accentClass={props.accentClass} readOnly={props.readOnly} />}>
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
