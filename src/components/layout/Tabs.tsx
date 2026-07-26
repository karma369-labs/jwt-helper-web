import { memo } from 'react';

export type TabId = 'decode' | 'encode';

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'decode', label: 'Decoder' },
  { id: 'encode', label: 'Encoder' },
];

function TabsImpl({ active, onChange }: Props) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tabs__item ${active === t.id ? 'tabs__item--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const Tabs = memo(TabsImpl);
