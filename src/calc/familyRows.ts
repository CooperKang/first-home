import type { Profile } from './afford'
import { householdGift } from './family'
import { firstMonthSplit } from './loan'
import { man } from '../format'
import type { LedgerRow } from '../components/ui'

// 통장에 들어오는 가족 도움(증여, 증여세, 빌린 돈)
export function familyRows(p: Profile): LedgerRow[] {
  const g = householdGift(p)
  const rows: LedgerRow[] = []
  if (g.amount) rows.push({ label: '부모님 증여', note: p.spouse && p.giftSpouse ? `나 ${man(p.giftMe)}, 배우자 ${man(p.giftSpouse)}` : undefined, amount: g.amount, kind: 'in' })
  if (g.tax) rows.push({ label: '증여세', note: '공제를 넘은 금액, 신고세액공제 3% 반영', amount: g.tax, kind: 'out' })
  if (p.familyLoan) rows.push({ label: '가족에게 빌린 돈', note: `차용증, 연 ${p.familyRatePct}%, ${p.familyYears}년`, amount: p.familyLoan, kind: 'in' })
  return rows
}

// 가족에게 빌린 돈을 매달 갚는 금액(원리금균등)
export function familyMonthly(p: Profile) {
  return p.familyLoan ? firstMonthSplit(p.familyLoan, p.familyRatePct, p.familyYears, 'equal') : null
}
