// 소득·자산·규제를 합쳐 '얼마짜리 집까지 살 수 있나'를 계산한다. 금액은 만원.
import {
  DSR_LIMIT,
  LTV,
  POLICY_LOANS,
  SEOMIN,
  futureIncomeRate,
  mortgageCap,
  regionInfo,
  stressRate,
  type PolicyLoan,
  type RateType,
  type Region,
} from './policy'
import { debtAnnualService, firstMonthPayment, principalFromAnnual, type Debt, type Method } from './loan'
import { purchaseCosts, type CostLine } from './costs'
import { availableCash } from './family'
import { netWorth, type Assets } from './assets'

export type Person = {
  age: number // 만 나이
  income: number // 연소득(세전)
  job: 'employee' | 'self' | 'none'
  tenure: number // 지금 직장 재직 연수
}

export type Profile = {
  me: Person
  spouse: Person | null // 배우자(또는 3개월 안에 결혼할 예비 배우자)
  married: 'single' | 'engaged' | 'married'
  marriageYears: number
  newborn: boolean // 2년 안에 출산(입양)
  kids: number
  homeless: boolean // 세대원 모두 무주택
  firstTime: boolean // 세대원 모두 집을 가진 적이 없음
  assets: Assets // 부부 합산 모은 돈과 재산(항목별)
  useSubscription: boolean // 청약통장도 해지해서 쓸지
  debts: Debt[]
  giftMe: number // 부모님께 증여받을 금액(나)
  giftSpouse: number // 배우자가 증여받을 금액
  priorGift: number // 나: 최근 10년 안에 이미 받은 증여
  familyLoan: number // 가족에게 빌릴 돈(차용증)
  familyRatePct: number
  familyYears: number
}

export type Scenario = {
  region: Region
  ratePct: number
  rateType: RateType
  years: number
  method: Method
  over85: boolean
  useFutureIncome: boolean
  spouseFuture: SpouseFuture // 배우자 장래소득을 표 비율의 절반만 볼지, 명의자와 같게 볼지(은행마다 다름)
  coBorrow: boolean // 배우자 소득을 합쳐 심사(배우자 대출도 같이 반영)
  lender: 'bank' | 'second'
  moving: number
}

export function householdIncome(p: Profile) {
  return p.me.income + (p.spouse?.income ?? 0)
}

// DSR 심사에 쓰는 소득. 장래소득은 만 20~34세 근로소득자에게만 붙는다.
export type SpouseFuture = 'half' | 'full'

export const SPOUSE_FUTURE: { id: SpouseFuture; label: string; share: number }[] = [
  { id: 'half', label: '절반만', share: 0.5 },
  { id: 'full', label: '명의자와 같게', share: 1 },
]

export function recognizedIncome(p: Profile, s: Scenario) {
  const people = [p.me, ...(s.coBorrow && p.spouse ? [p.spouse] : [])]
  return people.map((x, i) => {
    const share = i === 0 ? 1 : SPOUSE_FUTURE.find((o) => o.id === s.spouseFuture)!.share
    const rate = s.useFutureIncome && x.job === 'employee' ? futureIncomeRate(x.age, s.years) * share : 0
    return { person: x, base: x.income, rate, income: x.income * (1 + rate) }
  })
}

export function existingDebtService(p: Profile) {
  return p.debts.reduce((sum, d) => sum + debtAnnualService(d), 0)
}

export type BuyerType = 'firstTime' | 'seomin' | 'noHome'

export function buyerType(p: Profile, price: number, region: Region): BuyerType {
  if (!p.homeless) return 'noHome'
  if (p.firstTime) return 'firstTime'
  const r = regionInfo(region)
  const inc = householdIncome(p)
  if (r.regulated && inc <= SEOMIN.income && price <= SEOMIN.priceRegulated) return 'seomin'
  return 'noHome'
}

export function ltvRatio(p: Profile, price: number, region: Region) {
  const r = regionInfo(region)
  const table = r.regulated ? LTV.regulated : r.capital ? LTV.capital : LTV.local
  return table[buyerType(p, price, region)]
}

export type Limit = 'ltv' | 'cap' | 'dsr' | 'product' | 'price' | 'income'

export type LoanOption = {
  id: string
  name: string
  amount: number
  ratePct: number
  limitedBy: Limit
  policy?: PolicyLoan
  monthly: number
  dsrExempt: boolean
}

export type GeneralLoan = LoanOption & {
  ltv: number
  ltvAmount: number
  cap: number
  dsrAmount: number
  stress: number
  dsrRate: number
  incomes: ReturnType<typeof recognizedIncome>
  dsrBudget: number
}

// 은행 일반 주택담보대출
export function generalLoan(p: Profile, s: Scenario, price: number): GeneralLoan {
  const r = regionInfo(s.region)
  const ltv = ltvRatio(p, price, s.region)
  const ltvAmount = price * ltv
  const cap = mortgageCap(price, r.capital || r.regulated)
  const stress = stressRate(s.region, s.rateType, s.years)
  const dsrRate = s.ratePct + stress
  const incomes = recognizedIncome(p, s)
  const income = incomes.reduce((a, x) => a + x.income, 0)
  const debts = existingDebtService(p)
  const dsrBudget = income * DSR_LIMIT[s.lender] - debts
  const dsrAmount = principalFromAnnual(dsrBudget, dsrRate, s.years, s.method)
  const amount = Math.max(0, Math.min(ltvAmount, cap, dsrAmount))
  const limitedBy: Limit = amount === dsrAmount ? 'dsr' : amount === cap ? 'cap' : 'ltv'
  return {
    id: 'general',
    name: '은행 주택담보대출',
    amount,
    ratePct: s.ratePct,
    limitedBy,
    monthly: firstMonthPayment(amount, s.ratePct, s.years, s.method),
    dsrExempt: false,
    ltv,
    ltvAmount,
    cap,
    dsrAmount,
    stress,
    dsrRate,
    incomes,
    dsrBudget,
  }
}

export type Eligibility = { loan: PolicyLoan; ok: boolean; reasons: string[] }

export function policyEligibility(p: Profile, price: number, kind: 'buy' | 'rent'): Eligibility[] {
  const inc = householdIncome(p)
  const couple = p.married !== 'single'
  return POLICY_LOANS.filter((l) => l.kind === kind).map((loan) => {
    const reasons: string[] = []
    if (!p.homeless) reasons.push('세대원 모두 무주택이어야 해요')
    if (inc > loan.incomeMax) reasons.push(`소득 ${loan.incomeMax.toLocaleString()}만원 이하만 돼요`)
    if (loan.assetsMax && netWorth(p) > loan.assetsMax) reasons.push(`순자산 ${loan.assetsMax.toLocaleString()}만원 이하만 돼요`)
    if (kind === 'buy' && loan.priceMax && price > loan.priceMax) reasons.push(`${(loan.priceMax / 10000).toFixed(0)}억원 이하 주택만 돼요`)
    if (kind === 'rent' && loan.depositMax && price > loan.depositMax) reasons.push(`보증금 ${(loan.depositMax / 10000).toFixed(0)}억원 이하만 돼요`)
    if (loan.id === 'didimdolFirst' && !p.firstTime) reasons.push('생애최초 구입이어야 해요')
    if ((loan.id === 'didimdolNewlywed' || loan.id === 'newlywedRent') && !(couple && p.marriageYears <= 7))
      reasons.push('혼인 7년 이내(또는 결혼 예정)여야 해요')
    if (loan.id === 'newborn' && !p.newborn) reasons.push('2년 안에 아이를 낳은 가구여야 해요')
    if (loan.id === 'youth' && (p.me.age < 19 || p.me.age > 34)) reasons.push('만 19~34세여야 해요')
    return { loan, ok: reasons.length === 0, reasons }
  })
}

// 정책 대출은 DSR 대신 DTI 60%를 본다(주담대 원리금 + 다른 대출 이자 ≤ 소득의 60%)
export function policyLoanAmount(p: Profile, s: Scenario, price: number, loan: PolicyLoan): LoanOption {
  const r = regionInfo(s.region)
  const rate = (loan.rate[0] + loan.rate[1]) / 2
  const productLimit = r.capital && loan.limitCapital ? loan.limitCapital : loan.limit
  // 수도권·규제지역은 정책 대출도 LTV 70%까지(6·27 대책)
  const ltvAmount = price * Math.min(loan.ltv ?? 0.7, r.capital || r.regulated ? 0.7 : 1)
  const otherInterest = p.debts.reduce((a, d) => a + (d.kind === 'jeonse' ? 0 : (d.balance * d.ratePct) / 100), 0)
  const years = Math.max(s.years, 10)
  const dtiAmount = principalFromAnnual(householdIncome(p) * 0.6 - otherInterest, rate, years, 'equal')
  const amount = Math.max(0, Math.min(productLimit, ltvAmount, dtiAmount))
  const limitedBy: Limit = amount === productLimit ? 'product' : amount === ltvAmount ? 'ltv' : 'income'
  return {
    id: loan.id,
    name: loan.name,
    amount,
    ratePct: rate,
    limitedBy,
    policy: loan,
    monthly: firstMonthPayment(amount, rate, years, 'equal'),
    dsrExempt: true,
  }
}

export function loanOptions(p: Profile, s: Scenario, price: number) {
  const general = generalLoan(p, s, price)
  const policy = policyEligibility(p, price, 'buy')
    .filter((e) => e.ok)
    .map((e) => policyLoanAmount(p, s, price, e.loan))
  return { general, policy }
}

// 가장 많이 빌릴 수 있는 선택지. 금액이 같으면 금리가 낮은 쪽
export function bestLoan(p: Profile, s: Scenario, price: number): LoanOption {
  const { general, policy } = loanOptions(p, s, price)
  return [general, ...policy].reduce((a, b) => (b.amount > a.amount + 1 || (Math.abs(b.amount - a.amount) <= 1 && b.ratePct < a.ratePct) ? b : a))
}

export type Plan = {
  price: number
  loan: LoanOption
  costs: CostLine[]
  costTotal: number
  cashNeeded: number
  left: number
}

export function planFor(p: Profile, s: Scenario, price: number, best = bestLoan(p, s, price)): Plan {
  // 한도까지 다 빌리지 않고 모자란 만큼만 빌린다
  const first = purchaseCosts(price, { region: s.region, over85: s.over85, firstTime: p.firstTime, loan: best.amount, moving: s.moving })
  const short = price + first.reduce((a, c) => a + c.amount, 0) - availableCash(p)
  const amount = Math.min(best.amount, Math.max(0, Math.ceil(short)))
  const years = best.dsrExempt ? Math.max(s.years, 10) : s.years
  const loan = amount === best.amount ? best : { ...best, amount, monthly: firstMonthPayment(amount, best.ratePct, years, best.dsrExempt ? 'equal' : s.method) }
  const costs = purchaseCosts(price, { region: s.region, over85: s.over85, firstTime: p.firstTime, loan: loan.amount, moving: s.moving })
  const costTotal = costs.reduce((a, c) => a + c.amount, 0)
  const cashNeeded = price - loan.amount + costTotal
  return { price, loan, costs, costTotal, cashNeeded, left: availableCash(p) - cashNeeded }
}

// 내 현금으로 감당할 수 있는 가장 비싼 집. 15억·25억에서 대출 상한이 뚝 떨어져
// 이분 탐색을 쓸 수 없으니 1천만원 단위로 훑은 뒤 100만원 단위로 좁힌다.
export function maxAffordable(p: Profile, s: Scenario, maxPrice = 400000) {
  const ceiling = Math.min(maxPrice, Math.max(availableCash(p), 0) * 20 + 2000) // 현금의 20배를 넘는 집은 볼 필요가 없다
  let coarse = 0
  for (let price = 1000; price <= ceiling; price += 1000) if (planFor(p, s, price).left >= 0) coarse = price
  let best: Plan | null = null
  for (let price = Math.max(coarse, 100); price < coarse + 1000 && price <= ceiling; price += 100) {
    const plan = planFor(p, s, price)
    if (plan.left >= 0) best = plan
  }
  if (!best && coarse) best = planFor(p, s, coarse)
  return best
}
