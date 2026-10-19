import { loanOptions, policyEligibility, type Profile, type Scenario } from '../calc/afford'
import { man, monthly, pct } from '../format'

// LTV·총액 상한·DSR 세 가지 한도 중 가장 작은 것이 실제 한도가 된다
export function LimitBars({ p, s, price }: { p: Profile; s: Scenario; price: number }) {
  const { general: g } = loanOptions(p, s, price)
  const bars = [
    { key: 'ltv', label: `LTV ${pct(g.ltv, 0)}`, note: `집값 ${man(price)}의 ${pct(g.ltv, 0)}`, value: g.ltvAmount },
    ...(Number.isFinite(g.cap) ? [{ key: 'cap', label: '집값별 상한', note: '수도권·규제지역 10·15 대책', value: g.cap }] : []),
    {
      key: 'dsr',
      label: `DSR ${s.lender === 'bank' ? '40%' : '50%'}`,
      note: `소득 ${man(g.incomes.reduce((a, x) => a + x.income, 0))} 기준, 금리 ${g.dsrRate.toFixed(2)}%로 계산`,
      value: Math.max(0, g.dsrAmount),
    },
  ]
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="space-y-3">
      {bars.map((b) => {
        const binding = b.key === g.limitedBy
        return (
          <div key={b.key}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className={binding ? 'font-bold' : 'text-muted'}>
                {b.label}
                {binding && <span className="ml-1.5 rounded bg-seal px-1.5 py-0.5 text-[11px] font-bold text-white">여기에 걸려요</span>}
              </span>
              <span className={`num ${binding ? 'font-bold' : 'text-muted'}`}>{man(b.value)}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-rule/60">
              <div className={`h-full rounded-full ${binding ? 'bg-seal' : 'bg-bank/45'}`} style={{ width: `${(b.value / max) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-[12px] text-muted">{b.note}</p>
          </div>
        )
      })}
    </div>
  )
}

export function IncomeTable({ p, s, price }: { p: Profile; s: Scenario; price: number }) {
  const { general: g } = loanOptions(p, s, price)
  return (
    <table className="w-full text-[14px]">
      <thead>
        <tr className="border-b border-rule text-left text-[12px] text-muted">
          <th className="py-1.5 font-semibold">누구</th>
          <th className="py-1.5 text-right font-semibold">지금 소득</th>
          <th className="py-1.5 text-right font-semibold">장래소득</th>
          <th className="py-1.5 text-right font-semibold">심사 소득</th>
        </tr>
      </thead>
      <tbody className="num">
        {g.incomes.map((x, i) => (
          <tr key={i} className="border-b border-rule/60">
            <td className="py-2">
              {i === 0 ? '나' : '배우자'} <span className="text-muted">만 {x.person.age}세</span>
            </td>
            <td className="py-2 text-right">{man(x.base)}</td>
            <td className="py-2 text-right">{x.rate ? `+${pct(x.rate)}` : '–'}</td>
            <td className="py-2 text-right font-semibold">{man(x.income)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function OptionsTable({ p, s, price, chosen }: { p: Profile; s: Scenario; price: number; chosen: string }) {
  const { general, policy } = loanOptions(p, s, price)
  const all = [general, ...policy]
  const years = (dsrExempt: boolean) => (dsrExempt ? Math.max(s.years, 10) : s.years)
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[460px] text-[14px]">
        <thead>
          <tr className="border-b border-rule text-left text-[12px] text-muted">
            <th className="py-1.5 font-semibold">대출</th>
            <th className="py-1.5 text-right font-semibold">한도</th>
            <th className="py-1.5 text-right font-semibold">금리</th>
            <th className="py-1.5 text-right font-semibold">첫 달 상환</th>
          </tr>
        </thead>
        <tbody className="num">
          {all.map((o) => (
            <tr key={o.id} className={`border-b border-rule/60 ${o.id === chosen ? 'bg-mark/25' : ''}`}>
              <td className="py-2">
                <span className="font-semibold">{o.name}</span>
                {o.dsrExempt && <span className="ml-1 text-[12px] text-bank">DSR 미적용</span>}
              </td>
              <td className="py-2 text-right">{man(o.amount)}</td>
              <td className="py-2 text-right">{o.ratePct.toFixed(2)}%</td>
              <td className="py-2 text-right">
                {monthly(o.monthly)}
                <span className="block text-[11px] text-muted">{years(o.dsrExempt)}년</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] leading-snug text-muted">정책 대출 금리는 소득·만기·우대 조건에 따라 범위 안에서 정해져요. 표에는 범위의 가운데 값을 썼어요.</p>
    </div>
  )
}

export function PolicyCheck({ p, price, kind = 'buy' }: { p: Profile; price: number; kind?: 'buy' | 'rent' }) {
  const list = policyEligibility(p, price, kind)
  return (
    <ul className="space-y-2">
      {list.map((e) => (
        <li key={e.loan.id} className="rounded-xl border border-rule bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-bold">{e.loan.name}</p>
              <p className="text-[13px] leading-snug text-muted">{e.loan.who}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${e.ok ? 'bg-bank text-white' : 'bg-rule/70 text-muted'}`}>{e.ok ? '대상' : '대상 아님'}</span>
          </div>
          {!e.ok && <p className="mt-1.5 text-[13px] text-seal">{e.reasons.join(' / ')}</p>}
          <p className="num mt-1.5 text-[13px] text-muted">
            연 {e.loan.rate[0]}~{e.loan.rate[1]}% · 최대 {man(e.loan.limit)}
            {e.loan.limitCapital && e.loan.limitCapital !== e.loan.limit ? ` (수도권 ${man(e.loan.limitCapital)})` : ''}
          </p>
        </li>
      ))}
    </ul>
  )
}
