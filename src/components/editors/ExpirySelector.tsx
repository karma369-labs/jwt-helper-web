import { memo, useState } from 'react';
import { track } from '../../core/analytics';

interface Props {
  payload: Record<string, unknown>;
  onChange: (payload: Record<string, unknown>) => void;
}

const PRESETS = [
  { value: 'none', label: 'None', seconds: 0 },
  { value: '15m', label: '15m', seconds: 15 * 60 },
  { value: '1h', label: '1 hour', seconds: 60 * 60 },
  { value: '1d', label: '1 day', seconds: 24 * 60 * 60 },
  { value: '7d', label: '7 days', seconds: 7 * 24 * 60 * 60 },
  { value: '30d', label: '30 days', seconds: 30 * 24 * 60 * 60 },
];

function toLocalInputValue(exp: number): string {
  const d = new Date(exp * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ExpirySelectorImpl({ payload, onChange }: Props) {
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined;

  const [selected, setSelected] = useState<string>(exp === undefined ? 'none' : 'custom');
  const [lastAppliedExp, setLastAppliedExp] = useState(exp);

  if (exp !== lastAppliedExp) {
    setLastAppliedExp(exp);
    setSelected(exp === undefined ? 'none' : 'custom');
  }

  const applyExp = (nextExp: number | undefined, nextSelected: string) => {
    const next = { ...payload };
    if (nextExp === undefined) {
      delete next.exp;
    } else {
      next.exp = nextExp;
    }
    setSelected(nextSelected);
    setLastAppliedExp(nextExp);
    onChange(next);
  };

  const handlePresetSelect = (value: string) => {
    track('expiry_changed', { preset: value });
    if (value === 'none') {
      applyExp(undefined, 'none');
      return;
    }
    const preset = PRESETS.find((p) => p.value === value);
    if (preset && preset.seconds > 0) {
      applyExp(Math.floor(Date.now() / 1000) + preset.seconds, value);
    }
  };

  const handleDateChange = (value: string) => {
    if (!value) return;
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) {
      track('expiry_changed', { preset: 'custom' });
      applyExp(Math.floor(ms / 1000), 'custom');
    }
  };

  return (
    <div className="expiry-card">
      <div className="card-header-bar">
        <div className="card-header-bar__title-wrap">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="expiry-icon">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="card-header-bar__title">Token Expiry (exp)</span>
        </div>
        {exp !== undefined ? (
          <span className="card-header-bar__badge card-header-bar__badge--active">
            {exp * 1000 > Date.now() ? 'Expires' : 'Expired'}: {new Date(exp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="card-header-bar__hint">Optional</span>
        )}
      </div>

      <div className="expiry-card__body">
        <div className="expiry-card__presets" role="group" aria-label="Expiry Presets">
          {PRESETS.map((p) => {
            const isActive = selected === p.value;
            return (
              <button
                key={p.value}
                type="button"
                className={`expiry-chip ${isActive ? 'expiry-chip--active' : ''}`}
                onClick={() => handlePresetSelect(p.value)}
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            className={`expiry-chip ${selected === 'custom' ? 'expiry-chip--active' : ''}`}
            onClick={() => {
              if (selected !== 'custom') {
                const nextExp = exp ?? Math.floor(Date.now() / 1000) + 3600;
                applyExp(nextExp, 'custom');
              }
            }}
          >
            Custom
          </button>
        </div>

        {selected === 'custom' && exp !== undefined && (
          <div className="expiry-card__custom-input">
            <input
              type="datetime-local"
              className="expiry-datetime-input"
              value={toLocalInputValue(exp)}
              onChange={(e) => handleDateChange(e.target.value)}
              aria-label="Exact expiry date and time"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const ExpirySelector = memo(ExpirySelectorImpl);


