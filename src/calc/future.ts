// 지금부터 매달 모으면 몇 년 뒤 얼마짜리 집을 볼 수 있는지. 금액은 만원.
import { maxAffordable, type Profile, type Scenario } from './afford'

export type FutureInput = {
  monthlySaving: number
  savingYieldPct: number // 예적금·투자 연수익률
  incomeGrowthPct: number // 연봉 인상률(저축액도 같은 비율로 늘린다고 가정)
  priceGrowthPct: number // 집값 연 상승률
  target: number // 지금 기준 원하는 집값
  horizon: number // 몇 년까지 볼지
}

export type FutureYear = {
  year: number
  cash: number
  income: number
  canBuy: number // 그 해에 살 수 있는 최대 집값
  target: number // 그 해의 목표 집값(상승률 반영)
}

function grow(person: Profile['me'], g: number, y: number): Profile['me'] {
  return { ...person, age: person.age + y, income: person.income * (1 + g) ** y, tenure: person.tenure + y }
}

export function projectFuture(p: Profile, s: Scenario, f: FutureInput, lastOnly = false): FutureYear[] {
  const g = f.incomeGrowthPct / 100
  const monthlyYield = f.savingYieldPct / 100 / 12
  const rows: FutureYear[] = []
  let cash = p.cash
  for (let y = 0; y <= f.horizon; y++) {
    if (y > 0) {
      const monthly = f.monthlySaving * (1 + g) ** (y - 1)
      for (let m = 0; m < 12; m++) cash = cash * (1 + monthlyYield) + monthly
    }
    if (lastOnly && y < f.horizon) continue
    const future: Profile = { ...p, cash, me: grow(p.me, g, y), spouse: p.spouse ? grow(p.spouse, g, y) : null }
    const plan = maxAffordable(future, s)
    rows.push({
      year: y,
      cash,
      income: future.me.income + (future.spouse?.income ?? 0),
      canBuy: plan?.price ?? 0,
      target: f.target * (1 + f.priceGrowthPct / 100) ** y,
    })
  }
  return rows
}

export function reachYear(rows: FutureYear[]) {
  return rows.find((r) => r.canBuy >= r.target)?.year ?? null
}

// years 년 뒤 목표 집값에 닿으려면 필요한 월 저축액. 월 2천만원으로도 안 되면 null
export function savingNeeded(p: Profile, s: Scenario, f: FutureInput, years: number) {
  const reach = (m: number) => {
    const last = projectFuture(p, s, { ...f, monthlySaving: m, horizon: years }, true).at(-1)!
    return last.canBuy >= last.target
  }
  let lo = 0
  let hi = 2000
  if (!reach(hi)) return null
  if (reach(0)) return 0
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    if (reach(mid)) hi = mid
    else lo = mid
  }
  return Math.ceil(hi)
}
