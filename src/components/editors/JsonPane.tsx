import { memo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { buildClaimRows, type ClaimMeta } from '../../core/jwt/claims';

export interface JsonPaneProps {
  title: string;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  accentClass: string;
  claimsTable: Record<string, ClaimMeta>; // headerClaims or standardClaims, drives the Claims Breakdown view
  readOnly?: boolean; // decoder's payload pane is inspect-only
}

type ViewMode = 'json' | 'claims';

function JsonPaneImpl({ title, value, onChange, accentClass, claimsTable, readOnly = false }: JsonPaneProps) {
  const [view, setView] = useState<ViewMode>('json');
  // Local text buffer so the user can type invalid-JSON-in-progress without losing keystrokes.
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  // Sync state with incoming props during render to avoid effects, ensuring no flash of stale content.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(JSON.stringify(value, null, 2));
    setError(null);
  }

  const handleChange = (next: string) => {
    setText(next);
    try {
      const parsed = JSON.parse(next);
      setError(null);
      onChange(parsed);
    } catch {
      setError('Invalid JSON');
    }
  };

  const handleCopy = () => navigator.clipboard.writeText(text);

  return (
    <div className={`json-pane ${accentClass}`}>
      <div className="json-pane__header">
        <span>
          {title}
          {readOnly && <span className="json-pane__readonly-tag"> (read-only)</span>}
        </span>
        <div className="json-pane__controls">
          <div className="json-pane__view-toggle">
            <button
              type="button"
              className={view === 'json' ? 'active' : ''}
              onClick={() => setView('json')}
            >
              JSON
            </button>
            <button
              type="button"
              className={view === 'claims' ? 'active' : ''}
              onClick={() => setView('claims')}
            >
              Claims Breakdown
            </button>
          </div>
          {error && <span className="json-pane__error">{error}</span>}
          <button type="button" className="json-pane__copy" onClick={handleCopy}>
            Copy
          </button>
        </div>
      </div>

      {view === 'json' ? (
        <CodeMirror
          value={text}
          height="200px"
          theme={oneDark}
          extensions={[json()]}
          onChange={handleChange}
          readOnly={readOnly}
          basicSetup={{ lineNumbers: false, foldGutter: false }}
        />
      ) : (
        <div className="json-pane__claims">
          {buildClaimRows(value, claimsTable).map((row) => (
            <div key={row.key} className="claim-row">
              <span className={`claim-row__key ${row.recognized ? 'claim-row__key--recognized' : ''}`}>
                {row.key}
              </span>
              <span className="claim-row__label">{row.recognized ? row.label : 'Custom claim'}</span>
              <span className="claim-row__value">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Memoized: only re-renders when its own slice of state changes, per PRD perf requirements.
export const JsonPane = memo(JsonPaneImpl);
