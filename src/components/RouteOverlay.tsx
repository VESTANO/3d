import type { JourneyMode } from '../journey/timeline';

export function RouteOverlay({ progress, mode }: { progress: number; mode: JourneyMode }) {
  const ocean = Math.max(0, Math.min(1, (progress - .41) / .28));
  const route = mode === 'import' ? 'M267 37 Q289 79 261 91 Q235 101 227 73' : 'M227 73 Q165 110 78 49';
  return <div className="route-overlay" aria-label={mode === 'import' ? 'Illustrative China to Kochi, Kerala ocean connection; not an exact shipping lane' : 'Illustrative Kochi to international destination connection'}>
    <div className="route-heading"><span className="live-dot" /> {mode === 'import' ? 'CHINA → KERALA' : 'KERALA → WORLD'} <span>ILLUSTRATIVE ROUTE</span></div>
    <svg viewBox="0 0 340 115" role="img" aria-label="Ocean journey progress">
      <defs><linearGradient id="route-gradient"><stop stopColor="#dfb58c" /><stop offset="1" stopColor="#f4e9d8" /></linearGradient></defs>
      <path className="map-land" d="m27 40 15-17 24-3 14 10 19-2 8 14-13 10 3 13-13 8-10 27-13-4-6-26-16-6ZM124 20l19-10 27 4 11 9 30-5 28 5 23-2 29 11 17 20-18 9-17-9-15 5-13 26-15-3-11-22-17-2-13 18-15-3-8-20-19-4-11-12-12 1ZM267 87l19-6 20 13-2 12-27 1-15-10Z" />
      <path className="route-track" d={route} pathLength="1" />
      <path className="route-line" d={route} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - ocean} />
      <circle cx={mode === 'import' ? 267 : 78} cy={mode === 'import' ? 37 : 49} r="3" fill="#ffc16a" /><circle cx="227" cy="73" r="4" fill="#f4e9d8" />
      <circle cx="227" cy="73" r="9" fill="none" stroke="#dfb58c" opacity=".4" />
    </svg>
    <div className="route-endpoints"><div><small>DEPARTURE</small><span>{mode === 'import' ? 'China' : 'Kochi, Kerala'}</span></div><span className="route-arrow">↗</span><div><small>DESTINATION</small><span>{mode === 'import' ? 'Kochi, Kerala' : 'Global markets'}</span></div></div>
  </div>;
}
