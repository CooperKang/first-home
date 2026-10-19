// 전세·월세 계산. 금액은 만원.
import { policyEligibility, type Profile, type Scenario } from './afford'
import { brokerageFee, rentDealAmount } from './costs'
import { regionInfo } from './policy'

export type RentInput = {
  deposit: number // 전세 보증금(월세라면 월세 보증금)
  monthlyRent: number // 월세(전세면 0)
  salePrice: number // 같은 집 매매 시세(모르면 0)
  publicPrice: number // 공시가격(모르면 0)
  bankRatePct: number // 은행 전세대출 금리
  cashYieldPct: number // 내 돈을 예금에 두면 받는 금리
}

export type RentLoan = { id: string; name: string; amount: number; ratePct: number; monthlyInterest: number; note: string }

// 은행 전세대출(보증기관 보증): 보증금의 80%까지, 수도권 상한 2억원 가정
export function bankJeonseLoan(r: RentInput, capital: boolean): RentLoan {
  const amount = Math.min(r.deposit * 0.8, capital ? 20000 : 22200)
  return {
    id: 'bank',
    name: '은행 전세대출',
    amount,
    ratePct: r.bankRatePct,
    monthlyInterest: (amount * r.bankRatePct) / 100 / 12,
    note: '보증기관(HUG·HF·SGI)마다 한도가 달라요. 소득·신용으로 더 줄 수 있어요',
  }
}

export function rentLoans(p: Profile, s: Scenario, r: RentInput) {
  const capital = regionInfo(s.region).capital
  const loans: RentLoan[] = [bankJeonseLoan(r, capital)]
  const eligible = policyEligibility(p, r.deposit, 'rent')
  for (const e of eligible.filter((x) => x.ok)) {
    const rate = (e.loan.rate[0] + e.loan.rate[1]) / 2
    const limit = capital && e.loan.limitCapital ? e.loan.limitCapital : e.loan.limit
    const amount = Math.min(r.deposit * 0.8, limit)
    loans.push({ id: e.loan.id, name: e.loan.name, amount, ratePct: rate, monthlyInterest: (amount * rate) / 100 / 12, note: e.loan.who })
  }
  return { loans, eligible }
}

// 한 달에 실제로 나가는 돈(대출이자 + 월세 + 내 돈을 묶어 둔 기회비용)
export function monthlyCost(r: RentInput, loan: RentLoan | null) {
  const borrowed = Math.min(loan?.amount ?? 0, r.deposit)
  const own = r.deposit - borrowed
  const interest = loan ? (borrowed * loan.ratePct) / 100 / 12 : 0
  const opportunity = (own * r.cashYieldPct) / 100 / 12
  return { own, borrowed, interest, opportunity, rent: r.monthlyRent, total: interest + opportunity + r.monthlyRent }
}

// 전세를 월세로 바꾸면 매달 얼마인지(전월세 전환율)
export function toMonthly(depositGap: number, conversionPct: number) {
  return (depositGap * conversionPct) / 100 / 12
}

export type RiskLevel = 'safe' | 'caution' | 'danger' | 'unknown'

// 깡통전세 점검: 전세가율과 전세보증보험(HUG) 가입 가능 여부
export function jeonseRisk(r: RentInput, seniorDebt = 0) {
  const ratio = r.salePrice ? (r.deposit + seniorDebt) / r.salePrice : null
  const level: RiskLevel = ratio === null ? 'unknown' : ratio >= 0.8 ? 'danger' : ratio >= 0.7 ? 'caution' : 'safe'
  // HUG 보증: (보증금 + 선순위채권) ≤ 주택가격 × 90%, 주택가격은 공시가격 × 140%
  const hugLimit = r.publicPrice ? r.publicPrice * 1.4 * 0.9 - seniorDebt : null
  return { ratio, level, hugLimit, hugOk: hugLimit === null ? null : r.deposit <= hugLimit }
}

export function rentFee(r: RentInput) {
  return brokerageFee(r.monthlyRent ? rentDealAmount(r.deposit, r.monthlyRent) : r.deposit, 'rent')
}
