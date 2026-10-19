// 분양(청약 당첨) 아파트의 계약금·중도금·잔금 자금 일정. 금액은 만원.

export type InterestMode = 'free' | 'deferred' | 'paid'

export const INTEREST_MODES: { id: InterestMode; label: string; hint: string }[] = [
  { id: 'deferred', label: '이자후불제', hint: '중도금 이자를 쌓아 두었다가 입주할 때 한 번에 내요. 가장 흔해요' },
  { id: 'free', label: '무이자', hint: '시행사가 이자를 대신 내요. 대신 분양가에 녹아 있어요' },
  { id: 'paid', label: '유이자(매달 납부)', hint: '대출을 받은 날부터 매달 이자를 내요' },
]

export type PresaleInput = {
  price: number // 분양가
  options: number // 발코니 확장·유상옵션
  depositPct: number // 계약금 비율
  middlePct: number // 중도금 비율
  middleCount: number // 중도금 회차
  months: number // 계약부터 입주까지 개월
  middleRatePct: number // 중도금 대출 금리
  mode: InterestMode
  middleLoanPct: number // 중도금 중 대출로 내는 비율(보통 100%)
}

export type PresaleStep = { month: number; label: string; cash: number; loan: number }

export function presaleSchedule(x: PresaleInput) {
  const deposit = (x.price * x.depositPct) / 100
  const middle = (x.price * x.middlePct) / 100
  const balance = x.price - deposit - middle
  const each = middle / x.middleCount
  // 중도금은 계약 후 몇 달 뒤부터 입주 몇 달 전까지 고르게 나눠 낸다
  const start = Math.max(3, Math.round(x.months * 0.15))
  const end = Math.max(start, x.months - 4)
  const gap = x.middleCount > 1 ? (end - start) / (x.middleCount - 1) : 0
  const steps: PresaleStep[] = [{ month: 0, label: '계약금', cash: deposit + x.options * 0.1, loan: 0 }]
  let interest = 0
  for (let i = 0; i < x.middleCount; i++) {
    const month = Math.round(start + gap * i)
    const loan = (each * x.middleLoanPct) / 100
    steps.push({ month, label: `중도금 ${i + 1}회`, cash: each - loan, loan })
    interest += (loan * x.middleRatePct) / 100 / 12 * (x.months - month)
  }
  const paidMonthly = x.mode === 'paid' ? interest : 0
  const deferred = x.mode === 'deferred' ? interest : 0
  const middleLoan = (middle * x.middleLoanPct) / 100
  return {
    deposit,
    middle,
    middleLoan,
    balance,
    interest,
    deferred,
    paidMonthly,
    steps,
    // 입주(잔금) 때 한 번에 필요한 돈: 잔금 + 중도금 대출 상환 + 쌓인 이자 + 옵션 잔액
    atMoveIn: balance + middleLoan + deferred + x.options * 0.9,
  }
}
