// 부모님 등 가족에게 받는 도움: 증여와 차용. 금액은 만원.
import type { Profile } from './afford'

// 증여재산공제(직계존속 → 성인 자녀, 10년 합산 5천만원)
export const GIFT_BASE = 5000
// 혼인·출산 증여재산공제: 혼인신고일 전후 2년 안 또는 자녀 출생 후 2년 안, 둘을 합쳐 1억원
export const GIFT_MARRIAGE = 10000
// 상속세 및 증여세법 시행규칙의 적정 이자율
export const LEGAL_RATE = 4.6
// 덜 낸 이자가 1년에 1천만원 미만이면 증여로 보지 않는다
export const BENEFIT_LIMIT = 1000

// 혼인·출산 공제를 받을 수 있는지(결혼 예정, 혼인신고 2년 이내, 2년 안에 출산)
export function marriageGiftEligible(p: Profile) {
  return p.married === 'engaged' || (p.married === 'married' && p.marriageYears <= 2) || p.newborn
}

export function giftDeduction(p: Profile, prior = 0) {
  const base = Math.max(0, GIFT_BASE - prior)
  const extra = marriageGiftEligible(p) ? GIFT_MARRIAGE : 0
  return { base, extra, total: base + extra }
}

// 증여세 누진세율 후 신고세액공제 3%
export function giftTax(amount: number, deduction: number) {
  const t = Math.max(0, amount - deduction)
  let tax: number
  if (t <= 10000) tax = t * 0.1
  else if (t <= 50000) tax = t * 0.2 - 1000
  else if (t <= 100000) tax = t * 0.3 - 6000
  else if (t <= 300000) tax = t * 0.4 - 16000
  else tax = t * 0.5 - 46000
  return { taxable: t, tax: tax * 0.97 }
}

export function householdGift(p: Profile) {
  const me = giftTax(p.giftMe, giftDeduction(p, p.priorGift).total)
  const spouse = p.spouse ? giftTax(p.giftSpouse, giftDeduction(p).total) : { taxable: 0, tax: 0 }
  const amount = p.giftMe + (p.spouse ? p.giftSpouse : 0)
  return { amount, tax: me.tax + spouse.tax, me, spouse }
}

// 가족에게 빌린 돈: 이자를 얼마 이상 받아야 증여로 보지 않는지
export function familyLoanRule(amount: number, ratePct: number) {
  const freeLimit = BENEFIT_LIMIT / (LEGAL_RATE / 100) // 약 2억 1,739만원까지는 무이자도 된다
  const minRate = amount <= freeLimit ? 0 : LEGAL_RATE - (BENEFIT_LIMIT / amount) * 100
  const benefit = (amount * Math.max(0, LEGAL_RATE - ratePct)) / 100
  return {
    freeLimit,
    minRate,
    minMonthly: (amount * minRate) / 100 / 12,
    monthlyInterest: (amount * ratePct) / 100 / 12,
    benefit, // 1년에 덜 낸 이자
    ok: benefit < BENEFIT_LIMIT,
  }
}

// 집 살 때 쓸 수 있는 돈 = 모은 돈 + 증여(세금 뺀 금액) + 가족에게 빌린 돈
export function availableCash(p: Profile) {
  const g = householdGift(p)
  return p.cash + g.amount - g.tax + p.familyLoan
}
