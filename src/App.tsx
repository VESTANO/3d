import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { stages } from './journey/content';
import { STAGE_STARTS, stageAt } from './journey/timeline';
import type { JourneyMode } from './journey/timeline';
import { RouteOverlay } from './components/RouteOverlay';
import { Enquiry } from './components/Enquiry';
import type { EnquiryLinks } from './components/Enquiry';

gsap.registerPlugin(ScrollTrigger);
const LogisticsScene = lazy(() => import('./components/LogisticsScene'));
const serviceList = [
  ['01', 'Rack equipment sourcing', 'Plan the rack uprights, beams, shelving components and packing requirements for your shipment from China.', 'source'],
  ['02', 'Import & export coordination', 'Bring shipment details, documentation requirements and the next steps into focus.', 'coordinate'],
  ['03', 'Ocean freight', 'Explore the sea freight approach that fits your consignment and destination.', 'ocean'],
  ['04', 'Port handling', 'Plan the handover between vessel, terminal and inland transport.', 'port'],
  ['05', 'Inland transportation', 'Connect the port and the warehouse with a considered road transport plan.', 'road'],
  ['06', 'Customer delivery', 'Coordinate the final destination, access requirements and consignment handover.', 'delivery'],
];
function ServiceIcon({ type }: { type: string }) {
  const paths: Record<string, React.ReactNode> = {
    source: <><circle cx="14" cy="14" r="10" /><path d="M4 14h20M14 4c-7 6-7 14 0 20M14 4c7 6 7 14 0 20M7 7c5 3 9 3 14 0M7 21c5-3 9-3 14 0" /></>,
    coordinate: <><path d="M7 3h11l5 5v18H7zM18 3v6h5M11 14h8M11 19h8M11 24h4" /><path d="M3 8v19" /></>,
    ocean: <><path d="m2 18 5 6h15l5-6-12-4ZM8 16V8h13v8M12 8V4h5v4M2 27q3-3 6 0t6 0 6 0 7 0" /><path d="M12 11h2M17 11h2" /></>,
    port: <><path d="M5 27V5h16M2 10h24M10 5v22M5 17h5M21 10v8l-3 3M15 24h11v4H15z" /></>,
    road: <><path d="M2 9h16v13H2zM18 14h6l4 5v3H18M23 14v5h5" /><circle cx="7" cy="24" r="3" /><circle cx="23" cy="24" r="3" /><path d="M10 24h10" /></>,
    delivery: <><path d="m3 9 12-6 12 6v15l-12 6-12-6ZM3 9l12 6 12-6M15 15v15M9 6l12 6" /><path d="m19 20 2 2 4-5" /></>,
  };
  return <svg viewBox="0 0 32 34" fill="none" stroke="currentColor" strokeWidth="1.15" aria-hidden="true">{paths[type]}</svg>;
}

export default function App({ quoteHref, contactHref, withShell = true }: EnquiryLinks & { withShell?: boolean }) {
  const [mode, setMode] = useState<JourneyMode>('import');
  const [current, setCurrent] = useState(0);
  const [percent, setPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const [routeVisible, setRouteVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [stepsView, setStepsView] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const progress = useRef(0);
  const scrollSection = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const fallback = reduced || stepsView || failed;
  const journeyStages = stages(mode);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.site-header')) setMenuOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 769px)');
    const resize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', outside);
    desktop.addEventListener('change', resize);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', outside);
      desktop.removeEventListener('change', resize);
    };
  }, [menuOpen]);
  useEffect(() => {
    if (fallback || !ready || current < 2 || current > 4) { setRouteVisible(false); return; }
    setRouteVisible(true);
    const timeout = window.setTimeout(() => setRouteVisible(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [current, mode, fallback, ready]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(mq.matches); mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (fallback) return;
    const update = (self: ScrollTrigger) => {
      progress.current = self.progress; setCurrent(stageAt(self.progress)); setPercent(Math.round(self.progress * 100));
    };
    trigger.current = ScrollTrigger.create({ trigger: scrollSection.current, start: 'top top', end: 'bottom bottom', onUpdate: update, onRefresh: update });
    return () => { trigger.current?.kill(); trigger.current = null; };
  }, [fallback]);
  useEffect(() => {
    const handleHash = () => {
      const match = window.location.hash.match(/^#stage-([1-6])$/);
      if (match && !fallback && trigger.current) {
        const index = Number(match[1]) - 1; const t = trigger.current;
        window.scrollTo({ top: t.start + (t.end - t.start) * (STAGE_STARTS[index] + .001), behavior: 'instant' });
      }
    }; handleHash(); window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [fallback]);
  function goToStage(index: number) {
    if (fallback) document.getElementById(`step-${index}`)?.scrollIntoView({ behavior: 'instant' });
    else if (trigger.current) {
      const t = trigger.current; const at = index === 5 ? .998 : STAGE_STARTS[index] + .005;
      window.scrollTo({ top: t.start + (t.end - t.start) * at, behavior: 'instant' });
    }
  }
  const isHero = percent < 2;
  return <div className="vestano-trade-page">
    <a className="skip-link" href="#services">Skip the animated journey</a>
    {withShell && <header className="site-header">
      <a className="wordmark" href="#" aria-label="Vestano, top of page"><img className="brand-logo" src="./vestano-logo.png" alt="Vestano" width="246" height="165" /><span className="brand-divider" /><span className="brand-category">IMPORT & EXPORT</span></a>
      <nav id="main-navigation" className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation"><a href="#journey" onClick={() => setMenuOpen(false)}>The journey</a><a href="#warehouse" onClick={() => setMenuOpen(false)}>Warehouse</a><a href="#services" onClick={() => setMenuOpen(false)}>Our expertise</a><a className="nav-contact" href="#enquiry" onClick={() => setMenuOpen(false)}>Let’s connect <span>↗</span></a></nav>
      <button ref={menuButton} className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
    </header>}

    <main>
      <section className={`journey-scroll ${fallback ? 'is-static' : ''}`} id="journey" ref={scrollSection} aria-label="Import and export journey">
        <div className="journey-viewport">
          {!fallback && <Suspense fallback={null}><LogisticsScene progress={progress} mode={mode} onReady={onReady} onError={onError} /></Suspense>}
          {fallback && <div className="static-background"><svg viewBox="0 0 800 450" aria-hidden="true"><path d="M120 340V180l200-95 210 95v160L320 445ZM120 180l200 105 210-105M320 285v160M220 134l207 103" /><path d="M515 190h120l90 60v90H530M635 190v70h90" /><circle cx="230" cy="359" r="34" /><circle cx="620" cy="359" r="34" /></svg></div>}
          <div className="scene-shade" />
          <div className="scene-grain" />
          <div className="journey-topline"><span><span className="tiny-square" /> ONE CONTAINER. A WORLD OF CONNECTIONS.</span><span className="edition">THE VESTANO JOURNEY — 01</span></div>
          <div className="journey-switch" role="group" aria-label="Select journey direction">
            <button aria-pressed={mode === 'import'} className={mode === 'import' ? 'active' : ''} onClick={() => setMode('import')}>Import journey <span>↙</span></button>
            <button aria-pressed={mode === 'export'} className={mode === 'export' ? 'active' : ''} onClick={() => setMode('export')}>Export journey <span>↗</span></button>
          </div>
          <div className={`hero-copy ${!isHero && !fallback ? 'copy-hidden' : ''}`} aria-hidden={!isHero && !fallback} inert={!isHero && !fallback}>
            <p className="eyebrow">{mode === 'import' ? 'CHINA TO KERALA. THE VESTANO WAY.' : 'FROM KERALA. CONNECTED TO THE WORLD.'}</p>
            <h1>{mode === 'import' ? <>From China<br />to <em>your warehouse.</em></> : <>From Kerala<br />to <em>the world.</em></>}</h1>
            <p className="hero-description">{mode === 'import' ? 'Rack equipment, sourced in China. Follow one container through factory loading, ocean freight and local delivery in Kerala.' : 'Follow a consignment from a Kerala warehouse through Kochi Port to an international customer.'}</p>
            <div className="shipment-spec"><span>THE CONSIGNMENT</span><strong>Rack uprights · Beams · Shelving</strong></div>
            <a href={fallback ? '#step-0' : '#stage-1'} className="explore-link" onClick={e => { if (!fallback) { e.preventDefault(); goToStage(0); window.scrollBy({ top: window.innerHeight * .3, behavior: 'instant' }); } }}>Follow the journey <span>↓</span></a>
          </div>
          {!fallback && <div className={`stage-copy ${isHero ? 'copy-hidden' : ''}`} aria-hidden={isHero} inert={isHero}>
            <p className="eyebrow"><span className="stage-count">0{current + 1} / 06</span> {journeyStages[current].label}</p>
            <h2>{journeyStages[current].title.split('\n').map((line, i) => <span key={line}>{i === 1 ? <em>{line}</em> : line}<br /></span>)}</h2>
            <p>{journeyStages[current].body}</p>
            {percent >= 100 && <a className="button button-light arrival-button" href="#enquiry">Your next journey starts here <span>↗</span></a>}
          </div>}
          {!fallback && !ready && <div className="loading-indicator" role="status"><span className="loading-bar" />Preparing your journey<span>BUILDING THE 3D WORLD</span></div>}
          {!fallback && <div className={`scene-location ${isHero ? 'at-source' : ''}`}><span className="location-ring" /><div><small>{percent >= 100 ? 'JOURNEY COMPLETE' : 'YOUR CONSIGNMENT'}</small><span>{isHero ? (mode === 'import' ? 'China · Rack equipment' : 'Kerala, India') : journeyStages[current].short === 'Ocean' ? (mode === 'import' ? 'KERALA, INDIA ↗' : 'GLOBAL MARKETS ↗') : journeyStages[current].caption}</span></div></div>}
          {!fallback && routeVisible && current >= 2 && current <= 4 && <RouteOverlay key={`${mode}-${current}`} progress={percent / 100} mode={mode} />}
          <div className="experience-tools"><span>{fallback ? 'A JOURNEY, STEP BY STEP' : 'SCROLL TO MOVE THE WORLD'}</span><button onClick={() => { setStepsView(!fallback); if (fallback) { setFailed(false); setReady(false); } }} disabled={reduced}>{fallback ? (reduced ? 'Reduced motion enabled' : 'Explore in 3D') : 'View without motion'} <span>{fallback ? '↗' : '↘'}</span></button></div>
          <div className="journey-bottom">
            <div className="scroll-cue"><span className="scroll-mouse" /><div>{fallback ? 'EXPLORE AT YOUR PACE' : 'SCROLL TO EXPLORE'}<small>{mode === 'import' ? 'CHINA → KERALA' : 'KERALA → WORLD'}</small></div></div>
            <nav className="stage-nav" aria-label="Journey stages">{journeyStages.map((stage, i) => <button key={stage.short} onClick={() => goToStage(i)} className={!fallback && current === i ? 'active' : ''} aria-label={`Stage ${i + 1}: ${stage.short}`} aria-current={!fallback && current === i ? 'step' : undefined}><span className="stage-track"><span style={{ width: current > i ? '100%' : current === i ? `${Math.max(4, (percent / 100 - STAGE_STARTS[i]) / ((STAGE_STARTS[i + 1] ?? 1) - STAGE_STARTS[i]) * 100)}%` : '0%' }} /></span><span><small>0{i + 1}</small> {stage.short}</span></button>)}</nav>
            <span className="journey-percent">{String(fallback ? 0 : percent).padStart(2, '0')}<small>%</small></span>
          </div>
        </div>
      </section>
      {fallback && <section className="static-steps" aria-label="Step-by-step logistics journey">{journeyStages.map((stage, i) => <article id={`step-${i}`} key={stage.short}><span className="step-number">0{i + 1}</span><div><p className="eyebrow">{stage.label}</p><h2>{stage.caption}</h2><p>{stage.body}</p></div><ServiceIcon type={serviceList[i][3]} /></article>)}</section>}
      <section className="journey-summary" aria-label="Journey overview"><span className="eyebrow">ONE CONNECTED JOURNEY</span><p>{mode === 'import' ? 'China · Rack equipment' : 'Kerala sourcing'} <span>→</span> Inland freight <span>→</span> Ocean crossing <span>→</span> {mode === 'import' ? 'Kerala delivery' : 'Global delivery'}</p><span className="summary-mark">V.</span></section>
      <section className="services-section" id="services">
        <div className="section-intro"><p className="eyebrow"><span className="tiny-square" /> THE CONNECTIONS THAT MATTER</p><div><h2>Many moving parts.<br /><em>One considered journey.</em></h2><p>International trade is a sequence of important handovers. Let’s discuss how your sourcing, shipping and delivery requirements fit together.</p></div></div>
        <div className="services-grid">{serviceList.map(([number, title, description, icon]) => <article className="service" key={number}><div className="service-top"><ServiceIcon type={icon} /><span>{number}</span></div><h3>{title}</h3><p>{description}</p></article>)}</div>
        <p className="services-note">Every shipment is different. Service scope, availability and arrangements are confirmed through your enquiry.</p>
      </section>
      <section className="enquiry-section" id="enquiry"><div className="enquiry-grid" aria-hidden="true" /><p className="eyebrow"><span className="tiny-square" /> YOUR NEXT CONNECTION</p><div className="enquiry-heading"><h2>The world is closer<br /><em>than you think.</em></h2><p>Tell us where you want to go.<br />Let’s plan the journey together.</p></div><Enquiry mode={mode} links={{ quoteHref, contactHref }} /><div className="enquiry-footnote"><span>VESTANO | IMPORT & EXPORT</span><span>SOURCED IN CHINA. DELIVERED IN KERALA.</span></div></section>
    </main>
    {withShell && <footer className="site-footer"><a className="footer-brand" href="#"><img src="./vestano-logo.png" alt="Vestano" width="246" height="165" /><span>Connections that move you forward.</span></a><p>© {new Date().getFullYear()} Vestano</p><a href="#journey">Back to the beginning <span>↑</span></a></footer>}
    <div className="sr-only" aria-live="polite" aria-atomic="true">{mode === 'import' ? 'Import' : 'Export'} journey. Stage {current + 1} of 6: {journeyStages[current].caption}</div>
  </div>;
}
