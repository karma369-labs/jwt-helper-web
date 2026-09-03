import { memo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { buildClaimRows, type ClaimMeta } from '../../core/jwt/claims';
import { track, trackThrottled } from '../../core/analytics';
import { useCopy } from '../../hooks/useCopy';

export interface JsonPaneProps {
  title: string;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  accentClass: string;
  claimsTable: Record<string, ClaimMeta>;
  readOnly?: boolean;
}

type ViewMode = 'json' | 'claims';

function JsonPaneImpl({ title, value, onChange, accentClass, claimsTable, readOnly = false }: JsonPaneProps) {
  const [view, setView] = useState<ViewMode>('json');
  const pane = title.toLowerCase();
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

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
      trackThrottled('json_invalid', { pane }, 3000, `json_invalid:${pane}`);
    }
  };

  const { copied, copy } = useCopy(pane);

  const handleViewChange = (next: ViewMode) => {
    if (next !== view) track('json_view_changed', { pane, view: next });
    setView(next);
  };

  return (
    <div className={`json-pane ${accentClass}`}>
      <div className="json-pane__header">
        <div className="json-pane__title-wrap">
          <span className="json-pane__title">{title}</span>
          {readOnly && <span className="tag">read-only</span>}
        </div>

        <div className="json-pane__controls">
          <div className="json-pane__view-toggle" role="tablist" aria-label={`${title} view modes`}>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'json'}
              className={view === 'json' ? 'active' : ''}
              onClick={() => handleViewChange('json')}
            >
              JSON
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'claims'}
              className={view === 'claims' ? 'active' : ''}
              onClick={() => handleViewChange('claims')}
            >
              Claims
            </button>
          </div>

          {error && <span className="json-pane__error">{error}</span>}

          <button
            type="button"
            className={`button-secondary button-secondary--sm ${copied ? 'button--copied' : ''}`}
            onClick={() => copy(text)}
            aria-label={`Copy ${title} JSON`}
          >
            {copied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Copied</span>
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M2 8.5V2.5C2 1.94772 2.44772 1.5 3 1.5H9" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {view === 'json' ? (
        <CodeMirror
          value={text}
          minHeight="96px"
          maxHeight="340px"
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

export const JsonPane = memo(JsonPaneImpl);

