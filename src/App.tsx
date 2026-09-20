import { useEffect, useRef } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useJwt } from './hooks/useJwt';
import { SiteNav } from './components/layout/SiteNav';
import { Logo } from './components/layout/Logo';
import { SiteFooter } from './components/layout/SiteFooter';
import { ConsentBanner } from './components/layout/ConsentBanner';
import { FaqSection } from './components/layout/FaqSection';
import { FurtherReading } from './components/layout/FurtherReading';
import { DecoderPage } from './pages/DecoderPage';
import { EncoderPage } from './pages/EncoderPage';
import { JwtDecrypterPage } from './pages/JwtDecrypterPage';
import { ArticlePage } from './pages/ArticlePage';
import { SectionIndexPage } from './pages/SectionIndexPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Seo } from './seo/Seo';
import { findRoute, isArticleRoute, notFoundRoute } from './seo/routes';
import { trackPageView } from './core/analytics';

function App() {
  // Held above <Routes> deliberately: navigating between Decoder, Encoder, and Decrypter
  // remounts the page components but not this hook, so in-progress work survives the move
  // exactly as it did with the old in-app tab toggle.
  const jwt = useJwt();

  const location = useLocation();
  const route = findRoute(location.pathname) ?? notFoundRoute;

  // gtag's own config call already reports the initial load; only report navigations after it.
  const isInitialRender = useRef(true);
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    trackPageView(location.pathname, route.title);
  }, [location.pathname, route.title]);

  // Article and section pages are resolved from the content index rather than fixed
  // <Route> paths, so one element covers every markdown file under content/.
  const contentElement = isArticleRoute(route) ? (
    <ArticlePage key={route.path} route={route} />
  ) : route.kind === 'section' ? (
    <SectionIndexPage route={route} />
  ) : (
    <NotFoundPage />
  );

  return (
    <div className="app">
      <Seo route={route} />

      <header className="app__header">
        <Link to="/" className="app__brand">
          <Logo />
          <span className="app__brand-name">JWT Debugger</span>
        </Link>
        <SiteNav />
      </header>

      <div className="app__intro">
        <h1 className="app__title">{route.h1}</h1>
        <p className="app__lede">{route.intro}</p>
      </div>

      <main className="app__main">
        <Routes>
          <Route path="/" element={<DecoderPage {...jwt} />} />
          <Route path="/jwt-encoder-online" element={<EncoderPage {...jwt} />} />
          <Route path="/jwt-decrypter" element={<JwtDecrypterPage {...jwt} />} />
          <Route path="*" element={contentElement} />
        </Routes>
      </main>

      {route.kind === 'tool' && <FurtherReading toolPath={route.path} />}

      <FaqSection faqs={route.faqs} />

      <SiteFooter />

      <ConsentBanner />
    </div>
  );
}

export default App;
