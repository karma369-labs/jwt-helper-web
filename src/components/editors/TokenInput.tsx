import { memo, useState, useRef, useEffect } from 'react';
import { track } from '../../core/analytics';
import { useCopy } from '../../hooks/useCopy';

interface Props {
  token: string;
  onChange: (token: string) => void;
  onClear: () => void;
  parseError: string | null;
}

function TokenInputImpl({ token, onChange, onClear, parseError }: Props) {
  const [isEditing, setIsEditing] = useState(token.length === 0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = token.length === 0;

  const [text, setText] = useState(token);
  const [prevToken, setPrevToken] = useState(token);
  if (token !== prevToken) {
    setPrevToken(token);
    setText(token);
  }

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleViewerClick = () => {
    track('token_edit_started');
    setIsEditing(true);
  };

  const { copied, copy } = useCopy('token');

  const handleBlur = () => {
    if (token.length > 0) {
      setIsEditing(false);
      if (parseError) setText(token);
    }
  };

  const handleClear = () => {
    onClear();
    setText('');
    setIsEditing(true);
  };

  const renderVisualToken = () => {
    const parts = token.split('.');
    if (parts.length === 3) {
      return (
        <div className="token-viewer-content">
          <span className="jwt-part jwt-part--header">{parts[0]}</span>
          <span className="jwt-part jwt-part--dot">.</span>
          <span className="jwt-part jwt-part--payload">{parts[1]}</span>
          <span className="jwt-part jwt-part--dot">.</span>
          <span className="jwt-part jwt-part--signature">{parts[2]}</span>
        </div>
      );
    }
    return <div className="token-viewer-content">{token}</div>;
  };

  return (
    <div className="token-input">
      <div className="token-input__toolbar">
        <div className="token-input__legend">
          <span className="legend-chip legend-chip--header">Header</span>
          <span className="legend-chip legend-chip--payload">Payload</span>
          <span className="legend-chip legend-chip--signature">Signature</span>
        </div>

        <div className="token-input__actions">
          <button
            type="button"
            className={`button-secondary button-secondary--sm ${copied ? 'button--copied' : ''}`}
            onClick={() => copy(token)}
            disabled={isEmpty}
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Copied</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M2 8.5V2.5C2 1.94772 2.44772 1.5 3 1.5H9" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
          <button type="button" className="button-secondary button-secondary--sm" onClick={handleClear} disabled={isEmpty}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="token-input__body">
        {isEditing || isEmpty ? (
          <textarea
            ref={textareaRef}
            className="token-input__textarea"
            aria-label="Encoded JWT Token"
            value={text}
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              onChange(e.target.value);
            }}
            onBlur={handleBlur}
            placeholder="Paste your encoded JWT token (e.g. eyJhbGci...)"
          />
        ) : (
          <div 
            className="token-input__viewer" 
            onClick={handleViewerClick} 
            role="textbox" 
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsEditing(true);
              }
            }}
          >
            {renderVisualToken()}
            <span className="token-input__viewer-edit-badge">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1.5 10.5L3.5 10L10 3.5L8.5 2L2 8.5L1.5 10.5Z" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              Click to edit
            </span>
          </div>
        )}
      </div>

      <div className="token-input__status">
        <span className={`validity-badge ${parseError || isEmpty ? 'validity-badge--invalid' : 'validity-badge--valid'}`}>
          <span className="validity-dot" />
          {parseError ? 'Invalid JWT Structure' : isEmpty ? 'No Token Pasted' : 'Valid JWT Structure'}
        </span>
        {parseError && <span className="token-input__error">{parseError}</span>}
      </div>
    </div>
  );
}

export const TokenInput = memo(TokenInputImpl);

