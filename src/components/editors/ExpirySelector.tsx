import { memo, useState } from 'react';
import { track } from '../../core/analytics';

interface Props {
  payload: Record<string, unknown>;
  onChange: (payload: Record<string, unknown>) => void;
}

const PRESETS = [
  { value: '15m', label: 'In 15 minutes', seconds: 15 * 60 },
  { value: '1h', label: 'In 1 hour', seconds: 60 * 60 },
  { value: '6h', label: 'In 6 hours', seconds: 6 * 60 * 60 },
  { value: '1d', label: 'In 1 day', seconds: 24 * 60 * 60 },
  { value: '7d', label: 'In 7 days', seconds: 7 * 24 * 60 * 60 },
  { value: '30d', label: 'In 30 days', seconds: 30 * 24 * 60 * 60 },
];

// epoch seconds -> <input type="datetime-local"> value (local time, no tz suffix)
function toLocalInputValue(exp: number): string {
  const d = new Date(exp * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ExpirySelectorImpl({ payload, onChange }: Props) {
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined;

  // Which control set the current exp ('15m', '1h', ..., 'custom', 'none') — a
  // preset resolves to a concrete timestamp same as a manual pick, so the
  // select can't just derive "custom vs preset" from exp alone or picking
  // "1 hour" would immediately flip back to showing "Custom".
  const [selected, setSelected] = useState<string>(exp === undefined ? 'none' : 'custom');
  const [lastAppliedExp, setLastAppliedExp] = useState(exp);

  // Resync only when exp changed for a reason other than our own controls
  // below (e.g. exp edited directly in the Payload JSON pane).
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

  const handlePresetChange = (value: string) => {
    // The preset key ('15m', '1h', 'none') is app vocabulary, not user data.
    track('expiry_changed', { preset: value });
    if (value === 'none') {
      applyExp(undefined, 'none');
      return;
    }
    const preset = PRESETS.find((p) => p.value === value);
    if (preset) applyExp(Math.floor(Date.now() / 1000) + preset.seconds, value);
  };

  const handleDateChange = (value: string) => {
    if (!value) return;
    const ms = new Date(value).getTime();
    if (!Number.isNaN(ms)) {
      // The chosen date is user content, so only the fact of a custom pick is reported.
      track('expiry_changed', { preset: 'custom' });
      applyExp(Math.floor(ms / 1000), 'custom');
    }
  };

  return (
    <div className="expiry-selector">
      <label htmlFor="expiry-preset">Expires</label>
      <select
        id="expiry-preset"
        className="alg-select"
        value={selected}
        onChange={(e) => handlePresetChange(e.target.value)}
      >
        <option value="none">No expiry</option>
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
        {selected === 'custom' && <option value="custom">Custom date/time</option>}
      </select>
      {exp !== undefined && (
        <input
          type="datetime-local"
          className="expiry-selector__datetime"
          value={toLocalInputValue(exp)}
          onChange={(e) => handleDateChange(e.target.value)}
          aria-label="Exact expiry date and time"
        />
      )}
    </div>
  );
}

export const ExpirySelector = memo(ExpirySelectorImpl);
