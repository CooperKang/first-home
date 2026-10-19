import { householdIncome, type Plan, type Profile, type Scenario } from '../calc/afford'
import { availableCash } from '../calc/family'
import { METHODS, firstMonthSplit, totalInterest } from '../calc/loan'
import { man, monthly, pct } from '../format'
import { familyMonthly } from '../calc/familyRows'

// 집값을 어떤 돈으로 채우는지와 매달 얼마씩 갚는지
export default function Repayment({ p, s, plan }: { p: Profile; s: Scenario; plan: Plan }) {
  const policy = plan.loan.dsrExempt
  const method = policy ? 'equal' : s.method
  const years = policy ? Math.max(s.years, 10) : s.years
  const split = firstMonthSplit(plan.loan.amount, plan.loan.ratePct, years, method)
  const fam = familyMonthly(p)
  const total = split.total + (fam?.total ?? 0)
  const own = availableCash(p) - Math.max(0, plan.left)
  const methodLabel = METHODS.find((m) => m.id === method)!.label

  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-rule/60" aria-hidden>
        <div className="bg-bank" style={{ width: `${(plan.loan.amount / (plan.price + plan.costTotal)) * 100}%` }} />
        <div className="ml-0.5 bg-mark" style={{ width: `${(own / (plan.price + plan.costTotal)) * 100}%` }} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-[14px]">
        <div>
          <dt className="flex items-center gap-1.5 text-muted">
            <span className="size-2.5 rounded-sm bg-bank" aria-hidden />
            대출({plan.loan.name})
          </dt>
          <dd className="num text-[18px] font-bold">{man(plan.loan.amount)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-muted">
            <span className="size-2.5 rounded-sm bg-mark" aria-hidden />
            내 돈(세금·비용 포함)
          </dt>
          <dd className="num text-[18px] font-bold">{man(own)}</dd>
        </div>
      </dl>

      <div className="rounded-xl bg-paper p-4">
        <p className="text-[13px] text-muted">
          매달 갚는 돈 · {methodLabel} {years}년, 연 {plan.loan.ratePct.toFixed(2)}%
        </p>
        <p className="num mt-0.5 text-[22px] font-bold">
          첫 달 약 <span className="marker">{monthly(total)}</span>
        </p>
        <ul className="num mt-2 space-y-1 text-[14px]">
          <li className="flex justify-between gap-3">
            <span>주택담보대출 원금</span>
            <span>{monthly(split.principal)}</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>주택담보대출 이자</span>
            <span>{monthly(split.interest)}</span>
          </li>
          {fam && (
            <li className="flex justify-between gap-3">
              <span>
                가족 차용 상환
                <span className="block text-[12px] text-muted">
                  원금 {monthly(fam.principal)} + 이자 {monthly(fam.interest)}
                </span>
              </span>
              <span className="whitespace-nowrap">{monthly(fam.total)}</span>
            </li>
          )}
          <li className="flex justify-between gap-3 border-t border-rule pt-1 text-muted">
            <span>세전 소득 대비</span>
            <span>{pct((total * 12) / Math.max(householdIncome(p), 1))}</span>
          </li>
        </ul>
        <p className="mt-2 text-[13px] leading-snug text-muted">
          {method === 'equal' && '원리금균등은 매달 내는 돈이 같고, 시간이 갈수록 이자는 줄고 원금이 늘어요.'}
          {method === 'principal' && '원금균등은 원금을 똑같이 나눠 내서 첫 달이 가장 많고 갈수록 줄어요.'}
          {method === 'bullet' && '만기일시는 이자만 내다가 만기에 원금 전체를 갚아야 해요.'} 만기까지 이자는 모두 약 {man(totalInterest(plan.loan.amount, plan.loan.ratePct, years, method))}이에요.
        </p>
      </div>
    </div>
  )
}
