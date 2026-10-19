import { describe, expect, test } from 'vitest'
import { formatInput, parseInput } from '../format'
import { futureIncomeRate, mortgageCap, stressRate } from './policy'
import { acquisitionTax, bondCost, brokerageFee, rentDealAmount } from './costs'
import { debtAnnualService, firstMonthPayment, principalFromAnnual, totalInterest, unitAnnualService } from './loan'
import { bestLoan, buyerType, generalLoan, ltvRatio, maxAffordable, planFor, policyEligibility, type Profile, type Scenario } from './afford'
import { projectFuture, reachYear, savingNeeded } from './future'
import { jeonseRisk, monthlyCost } from './rent'
import { presaleSchedule } from './presale'

const couple: Profile = {
  me: { age: 31, income: 5500, job: 'employee', tenure: 4 },
  spouse: { age: 29, income: 4500, job: 'employee', tenure: 3 },
  married: 'married',
  marriageYears: 1,
  newborn: false,
  kids: 0,
  homeless: true,
  firstTime: true,
  cash: 25000,
  netAssets: 25000,
  debts: [],
}

const seoul: Scenario = {
  region: 'seoul',
  ratePct: 4,
  rateType: 'mixed',
  years: 30,
  method: 'equal',
  over85: false,
  useFutureIncome: false,
  coBorrow: true,
  lender: 'bank',
  moving: 0,
}

describe('취득세', () => {
  test('6억 이하는 1%', () => {
    const t = acquisitionTax(60000, { over85: false, firstTime: false })
    expect(t.rate).toBe(1)
    expect(t.acq).toBe(600)
    expect(t.total).toBeCloseTo(660)
  })
  test('7억 5천은 (7.5 × 2/3 − 3) = 2%', () => {
    expect(acquisitionTax(75000, { over85: false, firstTime: false }).rate).toBe(2)
  })
  test('9억 초과는 3%, 85㎡ 초과면 농특세 0.2%', () => {
    const t = acquisitionTax(100000, { over85: true, firstTime: false })
    expect(t.acq).toBe(3000)
    expect(t.rural).toBe(200)
  })
  test('생애최초는 200만원까지 감면, 12억 초과는 감면 없음', () => {
    expect(acquisitionTax(50000, { over85: false, firstTime: true }).relief).toBe(200)
    expect(acquisitionTax(10000, { over85: false, firstTime: true }).relief).toBe(100)
    expect(acquisitionTax(130000, { over85: false, firstTime: true }).relief).toBe(0)
  })
})

describe('중개보수·채권', () => {
  test('5억 매매는 0.4%에 부가세', () => {
    expect(brokerageFee(50000, 'sale').fee).toBeCloseTo(220)
  })
  test('3천만원 매매는 0.6%지만 25만원 상한', () => {
    expect(brokerageFee(3000, 'sale', false).fee).toBeCloseTo(18)
    expect(brokerageFee(4900, 'sale', false).fee).toBe(25)
  })
  test('월세 거래금액은 보증금 + 월세 × 100, 5천 미만이면 × 70', () => {
    expect(rentDealAmount(500, 40)).toBe(500 + 40 * 70)
    expect(rentDealAmount(5000, 100)).toBe(15000)
  })
  test('서울은 광역시 매입 비율을 쓴다', () => {
    expect(bondCost(80000, 'seoul').buy).toBeGreaterThan(bondCost(80000, 'local').buy)
  })
})

describe('스트레스 금리', () => {
  test('서울 변동형·혼합형은 3.0%p 하한', () => {
    expect(stressRate('seoul', 'variable', 30)).toBe(3)
    expect(stressRate('seoul', 'mixed', 30)).toBe(3)
  })
  test('지방 변동형은 0.75%p, 순수 고정형은 0', () => {
    expect(stressRate('local', 'variable', 30)).toBe(0.75)
    expect(stressRate('local', 'fixed', 30)).toBe(0)
  })
  test('주기형 5년/30년은 30% 미만 구간', () => {
    expect(stressRate('seoul', 'periodic', 30)).toBe(0.6)
    expect(stressRate('local', 'periodic', 30)).toBe(0.23)
    expect(stressRate('local', 'periodic', 10)).toBe(0.08)
  })
})

describe('장래소득', () => {
  test('만 27세 30년 만기는 31.6%', () => {
    expect(futureIncomeRate(27, 30)).toBe(0.316)
  })
  test('만 35세 이상이나 만기 10년 미만이면 없음', () => {
    expect(futureIncomeRate(35, 30)).toBe(0)
    expect(futureIncomeRate(25, 5)).toBe(0)
  })
})

describe('상환액', () => {
  test('1억, 연 4%, 30년 원리금균등은 월 약 47.7만원', () => {
    expect(firstMonthPayment(10000, 4, 30, 'equal')).toBeCloseTo(47.74, 1)
  })
  test('연 상환 여력으로 원금을 역산하면 다시 같은 상환액이 나온다', () => {
    const p = principalFromAnnual(2000, 5, 30, 'equal')
    expect(p * unitAnnualService(5, 30, 'equal')).toBeCloseTo(2000)
  })
  test('원금균등의 총이자가 원리금균등보다 적다', () => {
    expect(totalInterest(10000, 4, 30, 'principal')).toBeLessThan(totalInterest(10000, 4, 30, 'equal'))
  })
  test('신용대출은 원금 5년 분할 + 이자', () => {
    expect(debtAnnualService({ id: 'a', kind: 'credit', balance: 3000, ratePct: 6, years: 1 })).toBeCloseTo(600 + 180)
  })
})

describe('LTV와 한도', () => {
  test('집값별 수도권 주담대 상한', () => {
    expect(mortgageCap(150000, true)).toBe(60000)
    expect(mortgageCap(200000, true)).toBe(40000)
    expect(mortgageCap(300000, true)).toBe(20000)
    expect(mortgageCap(300000, false)).toBe(Infinity)
  })
  test('생애최초는 서울 70%, 지방 80%', () => {
    expect(ltvRatio(couple, 80000, 'seoul')).toBe(0.7)
    expect(ltvRatio(couple, 80000, 'local')).toBe(0.8)
  })
  test('생애최초가 아닌 무주택자는 서울 40%', () => {
    const p = { ...couple, firstTime: false }
    expect(buyerType(p, 120000, 'seoul')).toBe('noHome')
    expect(ltvRatio(p, 120000, 'seoul')).toBe(0.4)
  })
  test('서울 10억 생애최초는 LTV 7억이지만 6억 상한에 걸린다', () => {
    const g = generalLoan(couple, { ...seoul, useFutureIncome: true }, 100000)
    expect(g.ltvAmount).toBe(70000)
    expect(g.cap).toBe(60000)
    expect(g.amount).toBeLessThanOrEqual(60000)
  })
  test('스트레스 금리를 더하면 DSR 한도가 줄어든다', () => {
    const local = generalLoan(couple, { ...seoul, region: 'local', rateType: 'variable' }, 100000)
    const capital = generalLoan(couple, { ...seoul, rateType: 'variable' }, 100000)
    expect(capital.dsrAmount).toBeLessThan(local.dsrAmount)
  })
  test('장래소득을 켜면 DSR 한도가 늘어난다', () => {
    const off = generalLoan(couple, seoul, 100000)
    const on = generalLoan(couple, { ...seoul, useFutureIncome: true }, 100000)
    expect(on.dsrAmount).toBeGreaterThan(off.dsrAmount)
  })
})

describe('정책 대출', () => {
  test('부부합산 1억이면 디딤돌 신혼(8,500만원)은 안 된다', () => {
    const e = policyEligibility(couple, 50000, 'buy').find((x) => x.loan.id === 'didimdolNewlywed')!
    expect(e.ok).toBe(false)
  })
  test('소득이 낮으면 디딤돌이 은행 대출보다 많이 나올 수 있다', () => {
    const p: Profile = { ...couple, spouse: null, married: 'single', me: { ...couple.me, income: 3500 } }
    const best = bestLoan(p, { ...seoul, region: 'local' }, 30000)
    expect(best.dsrExempt).toBe(true)
  })
})

describe('살 수 있는 집', () => {
  test('현금이 많을수록 더 비싼 집을 살 수 있다', () => {
    const a = maxAffordable(couple, seoul)!
    const b = maxAffordable({ ...couple, cash: 40000 }, seoul)!
    expect(b.price).toBeGreaterThan(a.price)
    expect(a.left).toBeGreaterThanOrEqual(0)
  })
  test('필요 현금 = 집값 − 대출 + 부대비용', () => {
    const plan = planFor(couple, seoul, 70000)
    expect(plan.cashNeeded).toBeCloseTo(70000 - plan.loan.amount + plan.costTotal)
  })
  test('현금이 없으면 살 수 있는 집이 없다', () => {
    expect(maxAffordable({ ...couple, cash: 0 }, seoul)).toBeNull()
  })
})

describe('미래 계산기', () => {
  const single: Profile = { ...couple, spouse: null, married: 'single', cash: 3000, me: { age: 26, income: 3800, job: 'employee', tenure: 1 } }
  const f = { monthlySaving: 150, savingYieldPct: 3, incomeGrowthPct: 3, priceGrowthPct: 2, target: 50000, horizon: 15 }
  test('해마다 모은 돈이 늘어난다', () => {
    const rows = projectFuture(single, { ...seoul, region: 'capital' }, f)
    expect(rows).toHaveLength(16)
    expect(rows[10].cash).toBeGreaterThan(rows[5].cash)
    expect(rows[10].canBuy).toBeGreaterThan(rows[0].canBuy)
  })
  test('더 많이 모으면 더 빨리 닿는다', () => {
    const s = { ...seoul, region: 'capital' as const }
    const slow = reachYear(projectFuture(single, s, f)) ?? 99
    const fast = reachYear(projectFuture(single, s, { ...f, monthlySaving: 300 })) ?? 99
    expect(fast).toBeLessThanOrEqual(slow)
  })
  test('목표에 필요한 월 저축액을 찾는다', () => {
    const m = savingNeeded(single, { ...seoul, region: 'capital' }, f, 7)
    expect(m).not.toBeNull()
    const rows = projectFuture(single, { ...seoul, region: 'capital' }, { ...f, monthlySaving: m!, horizon: 7 })
    expect(rows[7].canBuy).toBeGreaterThanOrEqual(rows[7].target)
  })
})

describe('전월세', () => {
  test('전세가율 80% 이상은 위험', () => {
    const r = { deposit: 27000, monthlyRent: 0, salePrice: 30000, publicPrice: 20000, bankRatePct: 4, cashYieldPct: 3 }
    expect(jeonseRisk(r).level).toBe('danger')
    expect(jeonseRisk(r).hugOk).toBe(false) // 2억 × 1.4 × 0.9 = 2억 5,200만원 → 2억 7천은 초과
  })
  test('월 비용 = 대출이자 + 내 돈의 기회비용 + 월세', () => {
    const r = { deposit: 20000, monthlyRent: 0, salePrice: 0, publicPrice: 0, bankRatePct: 4.2, cashYieldPct: 3 }
    const c = monthlyCost(r, { id: 'x', name: 'x', amount: 16000, ratePct: 4.2, monthlyInterest: 0, note: '' })
    expect(c.interest).toBeCloseTo(56)
    expect(c.opportunity).toBeCloseTo(10)
  })
})

describe('분양 자금', () => {
  test('계약금 + 중도금 + 잔금 = 분양가, 이자후불제는 입주 때 이자를 낸다', () => {
    const x = presaleSchedule({ price: 60000, options: 0, depositPct: 10, middlePct: 60, middleCount: 6, months: 30, middleRatePct: 4.5, mode: 'deferred', middleLoanPct: 100 })
    expect(x.deposit + x.middle + x.balance).toBe(60000)
    expect(x.deferred).toBeGreaterThan(0)
    expect(x.atMoveIn).toBeCloseTo(x.balance + x.middleLoan + x.deferred)
  })
})

describe('입력칸 숫자', () => {
  test('세 자리마다 쉼표, 앞자리 0은 지운다', () => {
    expect(formatInput('012999', false)).toBe('12,999')
    expect(formatInput('1234567', false)).toBe('1,234,567')
    expect(formatInput('0', false)).toBe('0')
    expect(formatInput('', false)).toBe('')
  })
  test('금리처럼 소수가 필요한 칸은 소수점을 하나만 남긴다', () => {
    expect(formatInput('4.1.5', true)).toBe('4.15')
    expect(formatInput('.5', true)).toBe('0.5')
    expect(formatInput('4.', true)).toBe('4.')
    expect(formatInput('4.5', false)).toBe('45')
  })
  test('쉼표를 빼고 숫자로 읽는다', () => {
    expect(parseInput('12,999')).toBe(12999)
    expect(parseInput('')).toBe(0)
    expect(parseInput('4.')).toBe(4)
  })
})
