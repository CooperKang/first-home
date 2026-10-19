// 금액은 계산 전체에서 만원 단위로 다룬다

// 73500 → '7억 3,500만원'
export function man(n: number, unit = '원') {
  const v = Math.round(n)
  if (v === 0) return `0${unit}`
  const sign = v < 0 ? '−' : ''
  const a = Math.abs(v)
  const eok = Math.floor(a / 10000)
  const rest = a % 10000
  if (!eok) return `${sign}${rest.toLocaleString('ko-KR')}만${unit}`
  return `${sign}${eok}억${rest ? ` ${rest.toLocaleString('ko-KR')}만` : ''}${unit}`
}

// 짧게: 73500 → '7.4억', 3200 → '3,200만'
export function manShort(n: number) {
  const v = Math.round(n)
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억`
  return `${v.toLocaleString('ko-KR')}만`
}

// 월 상환액처럼 작은 금액: 47.7 → '47만 7천원'
export function monthly(n: number) {
  const won = Math.round(n * 10) * 1000
  const m = Math.floor(won / 10000)
  const k = Math.round((won % 10000) / 1000)
  return `${m.toLocaleString('ko-KR')}만${k ? ` ${k}천` : ''}원`
}

export function pct(r: number, digits = 1) {
  return `${(r * 100).toFixed(digits).replace(/\.0+$/, '')}%`
}
