// 대출 상환액과 DSR 산정. 금액은 만원, 금리는 연 %.

export type Method = 'equal' | 'principal' | 'bullet'

export const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: 'equal', label: '원리금균등', hint: '매달 같은 금액을 갚아요. 가장 흔한 방식' },
  { id: 'principal', label: '원금균등', hint: '처음엔 많이, 갈수록 적게 갚아요. 총이자가 적어요' },
  { id: 'bullet', label: '만기일시', hint: '이자만 내다가 만기에 원금을 한 번에 갚아요' },
]

// 첫 달 상환액
export function firstMonthPayment(principal: number, ratePct: number, years: number, method: Method) {
  const r = ratePct / 100 / 12
  const n = Math.round(years * 12)
  if (principal <= 0 || n <= 0) return 0
  if (method === 'bullet') return principal * r
  if (method === 'principal') return principal / n + principal * r
  if (r === 0) return principal / n
  return (principal * r) / (1 - (1 + r) ** -n)
}

// 첫 달 상환액을 원금과 이자로 나눈다
export function firstMonthSplit(principal: number, ratePct: number, years: number, method: Method) {
  const total = firstMonthPayment(principal, ratePct, years, method)
  const interest = (principal * ratePct) / 100 / 12
  return { total, interest, principal: Math.max(0, total - interest) }
}

// 만기까지 내는 이자 합계
export function totalInterest(principal: number, ratePct: number, years: number, method: Method) {
  const r = ratePct / 100 / 12
  const n = Math.round(years * 12)
  if (principal <= 0 || n <= 0) return 0
  if (method === 'bullet') return principal * r * n
  if (method === 'principal') return principal * r * ((n + 1) / 2)
  return firstMonthPayment(principal, ratePct, years, 'equal') * n - principal
}

// 첫 1년 동안 실제로 나가는 원금과 이자
export function firstYearPayment(principal: number, ratePct: number, years: number, method: Method) {
  const r = ratePct / 100 / 12
  const n = Math.round(years * 12)
  if (principal <= 0 || n <= 0) return 0
  const months = Math.min(12, n)
  if (method === 'bullet') return principal * r * months
  if (method === 'principal') {
    let sum = 0
    for (let k = 0; k < months; k++) sum += principal / n + (principal - (principal / n) * k) * r
    return sum
  }
  return firstMonthPayment(principal, ratePct, years, 'equal') * months
}

// 기존 대출의 종류. DSR에 반영하는 방식이 종류마다 다르다(금융위원회 DSR 부채 산정 기준).
export type DebtKind = 'credit' | 'mortgage' | 'jeonse' | 'card' | 'installment' | 'student'

export const DEBT_KINDS: { id: DebtKind; label: string; rule: string }[] = [
  { id: 'credit', label: '신용대출·마이너스통장', rule: '원금을 5년에 나눠 갚는다고 보고 이자를 더해요' },
  { id: 'card', label: '카드론(장기카드대출)', rule: '원금을 3년에 나눠 갚는다고 보고 이자를 더해요' },
  { id: 'installment', label: '자동차 할부·리스', rule: '앞으로 1년간 실제로 내는 금액이 들어가요' },
  { id: 'student', label: '학자금 대출', rule: '앞으로 1년간 실제로 내는 금액이 들어가요' },
  { id: 'jeonse', label: '전세자금대출', rule: '무주택자는 DSR에 안 들어가요. 집을 사면 보통 갚아야 해요' },
  { id: 'mortgage', label: '다른 주택담보대출', rule: '실제 원리금 상환액이 들어가요' },
]

export type Debt = { id: string; kind: DebtKind; balance: number; ratePct: number; years: number }

// DSR 계산에 들어가는 기존 대출 1건의 연간 원리금
export function debtAnnualService(d: Debt) {
  const interest = (d.balance * d.ratePct) / 100
  switch (d.kind) {
    case 'credit':
      return d.balance / 5 + interest
    case 'card':
      return d.balance / 3 + interest
    case 'installment':
    case 'student':
      return firstYearPayment(d.balance, d.ratePct, Math.max(d.years, 1), 'equal')
    case 'jeonse':
      return 0
    case 'mortgage':
      return firstYearPayment(d.balance, d.ratePct, Math.max(d.years, 1), 'equal')
  }
}

// 본건 대출 1만원이 DSR에 더하는 연간 원리금. 만기일시는 원금을 최대 10년에 나눠 반영한다.
export function unitAnnualService(ratePct: number, years: number, method: Method) {
  if (method === 'bullet') return 1 / Math.min(years, 10) + ratePct / 100
  return firstYearPayment(1, ratePct, years, method)
}

// 연간 상환 여력(만원)으로 받을 수 있는 최대 원금
export function principalFromAnnual(budget: number, ratePct: number, years: number, method: Method) {
  if (budget <= 0) return 0
  return budget / unitAnnualService(ratePct, years, method)
}
