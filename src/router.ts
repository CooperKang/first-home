import { useEffect, useState } from 'react'

// GitHub Pages에서 새로고침해도 깨지지 않게 해시 주소(#/buy)로 화면을 나눈다
export type Route = 'home' | 'buy' | 'future' | 'rent' | 'presale' | 'policy'

export const ROUTES: { id: Route; label: string; short: string }[] = [
  { id: 'home', label: '처음', short: '처음' },
  { id: 'buy', label: '살 수 있는 집', short: '매매' },
  { id: 'future', label: '몇 년 뒤 내 집', short: '미래' },
  { id: 'rent', label: '전세·월세', short: '전월세' },
  { id: 'presale', label: '분양·청약 자금', short: '분양' },
  { id: 'policy', label: '규제·정책', short: '정책' },
]

function parse(): Route {
  const id = location.hash.replace(/^#\/?/, '').split('?')[0]
  // DSR 계산기는 '살 수 있는 집' 안으로 옮겼다. 예전 주소도 그쪽으로 보낸다.
  if (id === 'dsr') {
    history.replaceState(null, '', '#/buy?q=dsr')
    return 'buy'
  }
  return ROUTES.some((r) => r.id === id) ? (id as Route) : 'home'
}

export function href(route: Route) {
  return route === 'home' ? '#/' : `#/${route}`
}

// 주소의 ?q= 값(예: #/buy?q=dsr)
export function routeQuery(): string | null {
  return new URLSearchParams(location.hash.split('?')[1] ?? '').get('q')
}

// 읽은 ?q=는 주소에서 지워서, 새로고침하면 마지막에 고른 화면이 나오게 한다
export function clearQuery() {
  const [path, query] = location.hash.split('?')
  if (query) history.replaceState(null, '', path)
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const onHash = () => {
      setRoute(parse())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}
