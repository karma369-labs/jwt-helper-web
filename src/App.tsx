import { useState } from 'react';
import { useJwt } from './hooks/useJwt';
import { Tabs, type TabId } from './components/layout/Tabs';
import { DecoderPage } from './pages/DecoderPage';
import { EncoderPage } from './pages/EncoderPage';

function App() {
  const jwt = useJwt();
  const [tab, setTab] = useState<TabId>('decode');

  return (
    <div className="app">
      <header className="app__header">
        <h1>JWT Debugger</h1>
        <Tabs active={tab} onChange={setTab} />
      </header>

      <main className="app__main">
        {tab === 'decode' ? <DecoderPage {...jwt} /> : <EncoderPage {...jwt} />}
      </main>
    </div>
  );
}

export default App;
