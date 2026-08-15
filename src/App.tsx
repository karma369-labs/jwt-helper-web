import { useCallback, useState } from 'react';
import { useJwt } from './hooks/useJwt';
import { Tabs, type TabId } from './components/layout/Tabs';
import { ConsentBanner } from './components/layout/ConsentBanner';
import { DecoderPage } from './pages/DecoderPage';
import { EncoderPage } from './pages/EncoderPage';
import { track, trackPageView } from './core/analytics';

const tabPages: Record<TabId, { path: string; title: string }> = {
  decode: { path: '/decoder', title: 'JWT Decoder' },
  encode: { path: '/encoder', title: 'JWT Encoder' },
};

function App() {
  const jwt = useJwt();
  const [tab, setTab] = useState<TabId>('decode');

  // There's no router, so the tab toggle is the only "navigation" GA can see —
  // report it as both an event and a virtual page_view.
  const handleTabChange = useCallback(
    (next: TabId) => {
      if (next === tab) return;
      track('tab_switch', { tab: next, from: tab });
      trackPageView(tabPages[next].path, tabPages[next].title);
      setTab(next);
    },
    [tab]
  );

  return (
    <div className="app">
      <header className="app__header">
        <h1>JWT Debugger</h1>
        <Tabs active={tab} onChange={handleTabChange} />
      </header>

      <main className="app__main">
        {tab === 'decode' ? <DecoderPage {...jwt} /> : <EncoderPage {...jwt} />}
      </main>

      <ConsentBanner />
    </div>
  );
}

export default App;
