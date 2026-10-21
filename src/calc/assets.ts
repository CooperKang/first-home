// 모은 돈과 재산을 항목별로 받아 '집 사는 데 쓸 돈'과 '순자산'을 같이 만든다. 금액은 만원.
import type { Profile } from './afford'

export type AssetKind = 'savings' | 'checking' | 'deposit' | 'invest' | 'subscription' | 'other'
export type Assets = Record<AssetKind, number>

export const NO_ASSETS: Assets = { savings: 0, checking: 0, deposit: 0, invest: 0, subscription: 0, other: 0 }

// usable: 집 살 때 꺼내 쓸 수 있는 돈인지. 청약통장은 따로 고른다.
export const ASSET_KINDS: { id: AssetKind; label: string; hint: string; usable: boolean }[] = [
  { id: 'savings', label: '예금·적금', hint: '만기 전에 깨면 이자가 줄어요', usable: true },
  { id: 'checking', label: '입출금 통장·현금', hint: '파킹통장, CMA 포함', usable: true },
  { id: 'deposit', label: '돌려받을 보증금', hint: '지금 사는 집의 전월세 보증금. 전세대출이 있으면 아래 대출에 넣어요', usable: true },
  { id: 'invest', label: '주식·펀드·코인', hint: '팔아서 쓸 금액. 값이 바뀔 수 있어요', usable: true },
  { id: 'subscription', label: '청약통장', hint: '청약을 계속하려면 해지하지 않아요', usable: false },
  { id: 'other', label: '자동차·그 밖의 재산', hint: '집 사는 데 쓰지 않지만 순자산에는 들어가요', usable: false },
]

const sum = (a: Assets, pick: (k: AssetKind) => boolean) => ASSET_KINDS.reduce((t, k) => t + (pick(k.id) ? a[k.id] : 0), 0)

// 집 사는 데 쓸 수 있는 내 돈(가족 도움 제외)
export function ownCash(p: Profile) {
  return sum(p.assets, (k) => ASSET_KINDS.find((x) => x.id === k)!.usable || (k === 'subscription' && p.useSubscription))
}

export function totalAssets(p: Profile) {
  return sum(p.assets, () => true)
}

export function debtBalance(p: Profile) {
  return p.debts.reduce((t, d) => t + d.balance, 0)
}

// 정책 대출 자산 심사의 순자산 = 부부 합산 재산 − 부채
export function netWorth(p: Profile) {
  return totalAssets(p) - debtBalance(p)
}

// 모은 돈이 늘어난 만큼 예적금에 더한다(미래 계산기)
export function withSavings(p: Profile, extra: number): Profile {
  return { ...p, assets: { ...p.assets, savings: p.assets.savings + extra } }
}
