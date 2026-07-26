import { memo, useState, useRef, useEffect } from 'react';

interface Props {
  token: string;
  onChange: (token: string) => void;
  onClear: () => void; // resets state, unlike onChange('')
  parseError: string | null;
}

function TokenInputImpl({ token, onChange, onClear, parseError }: Props) {
  const [isEditing, setIsEditing] = useState(token.length === 0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = token.length === 0;

  // Local buffer so mid-edit/invalid input isn't snapped back to the last
  // valid `token` on every keystroke (same pattern as JsonPane's text state).
  const [text, setText] = useState(token);
  const [prevToken, setPrevToken] = useState(token);
  if (token !== prevToken) {
    setPrevToken(token);
    setText(token);
  }

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Position cursor at the end of the text on edit activation
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleViewerClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    if (token.length > 0) {
      setIsEditing(false);
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
        <>
          <span className="jwt-part jwt-part--header">{parts[0]}</span>
          <span className="jwt-part jwt-part--dot">.</span>
          <span className="jwt-part jwt-part--payload">{parts[1]}</span>
          <span className="jwt-part jwt-part--dot">.</span>
          <span className="jwt-part jwt-part--signature">{parts[2]}</span>
        </>
      );
    }
    return <span>{token}</span>;
  };

  return (
    <div className="token-input">
      <div className="token-input__toolbar">
        <button type="button" className="button-secondary" onClick={() => navigator.clipboard.writeText(token)} disabled={isEmpty}>
          Copy
        </button>
        <button type="button" className="button-secondary" onClick={handleClear} disabled={isEmpty}>
          Clear
        </button>
      </div>

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
          placeholder="Paste your encoded JWT token here..."
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
          <span className="token-input__viewer-edit-badge">Click to edit</span>
        </div>
      )}

      <div className="token-input__status">
        <span className={`validity-badge ${parseError || isEmpty ? 'validity-badge--invalid' : 'validity-badge--valid'}`}>
          {parseError ? 'Invalid JWT' : isEmpty ? 'No token' : 'Valid JWT'}
        </span>
        {parseError && <span className="token-input__error">{parseError}</span>}
      </div>
    </div>
  );
}

export const TokenInput = memo(TokenInputImpl);
