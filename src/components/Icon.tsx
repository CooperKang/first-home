import type { Route } from '../router'

const PATHS: Record<Route, string> = {
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
  buy: 'M3 11 12 4l9 7M5 9.5V20h14V9.5M10 20v-5h4v5',
  future: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  rent: 'M15 7a3 3 0 1 1-2.8 4H5v3h2m-2-3v4m10-8v.01',
  presale: 'M4 21V8l5-3v16m0 0V3l6 3v15m0 0V10l5 2v9M2 21h20',
  policy: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
}

export function RouteIcon({ id, className }: { id: Route; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[id]} />
    </svg>
  )
}
