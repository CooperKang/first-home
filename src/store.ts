import { useEffect, useState } from 'react'
import type { Profile, Scenario } from './calc/afford'

// 한 번 입력한 내 상황은 모든 계산기가 같이 쓴다. 이 기기 브라우저에만 저장된다.
export const DEFAULT_PROFILE: Profile = {
  me: { age: 29, income: 4200, job: 'employee', tenure: 2 },
  spouse: null,
  married: 'single',
  marriageYears: 0,
  newborn: false,
  kids: 0,
  homeless: true,
  firstTime: true,
  cash: 8000,
  netAssets: 8000,
  debts: [],
}

export const DEFAULT_SCENARIO: Scenario = {
  region: 'capital',
  ratePct: 4.1,
  rateType: 'mixed',
  years: 30,
  method: 'equal',
  over85: false,
  useFutureIncome: true,
  coBorrow: true,
  lender: 'bank',
  moving: 300,
}

const KEY = 'first-home:v1'

type Saved = { profile: Profile; scenario: Scenario }

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<Saved>
      return { profile: { ...DEFAULT_PROFILE, ...s.profile }, scenario: { ...DEFAULT_SCENARIO, ...s.scenario } }
    }
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)이면 기본값으로 시작한다
  }
  return { profile: DEFAULT_PROFILE, scenario: DEFAULT_SCENARIO }
}

let state = load()
const listeners = new Set<() => void>()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 저장 실패는 무시한다. 이번 방문 동안은 메모리에 남아 있다.
  }
  listeners.forEach((l) => l())
}

export function setProfile(next: Profile | ((p: Profile) => Profile)) {
  state = { ...state, profile: typeof next === 'function' ? next(state.profile) : next }
  save()
}

export function setScenario(next: Partial<Scenario>) {
  state = { ...state, scenario: { ...state.scenario, ...next } }
  save()
}

export function resetAll() {
  state = { profile: DEFAULT_PROFILE, scenario: DEFAULT_SCENARIO }
  save()
}

export function useStore() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return state
}

// 계산기마다 따로 쓰는 입력값(목표 집값 등)도 기억해 둔다
export function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`first-home:${key}`)
      return raw ? { ...initial, ...JSON.parse(raw) } : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(`first-home:${key}`, JSON.stringify(v))
    } catch {
      // 무시
    }
  }, [key, v])
  return [v, setV] as const
}
