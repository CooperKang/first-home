import { useMemo } from 'react'
import { existingDebtService, generalLoan, recognizedIncome } from '../calc/afford'
import { DEBT_KINDS, debtAnnualService, unitAnnualService } from '../calc/loan'
import { DSR_LIMIT, FUTURE_INCOME, futureIncomeRate, stressRate } from '../calc/policy'
import LoanTerms from '../components/LoanTerms'
import ProfileForm from '../components/ProfileForm'
import { MoneyField, Note, NumberField, PageHead, Panel, Stat } from '../components/ui'
import { man, monthly, pct } from '../format'
import { useLocal, useStore } from '../store'

function Gauge({ value, limit }: { value: number; limit: number }) {
  const w = Math.min(value / 0.7, 1) * 100
  return (
    <div>
      <div className="relative h-4 rounded-full bg-rule/60">
        <div className={`h-full rounded-full ${value > limit ? 'bg-seal' : 'bg-bank'}`} style={{ width: `${w}%` }} />
        <span className="absolute -top-1 h-6 w-0.5 bg-ink" style={{ left: `${(limit / 0.7) * 100}%` }} aria-hidden />
      </div>
      <div className="mt-1 flex justify-between text-[12px] text-muted">
        <span>0%</span>
        <span>한도 {pct(limit, 0)}</span>
        <span>70%</span>
      </div>
    </div>
  )
}

export default function Dsr() {
  const { profile: p, scenario: s } = useStore()
  const [x, setX] = useLocal('dsr', { loan: 40000, age: 28, income: 4000, years: 30 })

  const r = useMemo(() => {
    const incomes = recognizedIncome(p, s)
    const income = incomes.reduce((a, i) => a + i.income, 0)
    const base = incomes.reduce((a, i) => a + i.base, 0)
    const other = existingDebtService(p)
    const stress = stressRate(s.region, s.rateType, s.years)
    const withStress = x.loan * unitAnnualService(s.ratePct + stress, s.years, s.method)
    const actual = x.loan * unitAnnualService(s.ratePct, s.years, s.method)
    const g = generalLoan(p, s, Infinity)
    return {
      income,
      base,
      other,
      stress,
      dsr: (withStress + other) / Math.max(income, 1),
      dsrNoStress: (actual + other) / Math.max(income, 1),
      max: Math.max(0, g.dsrAmount),
      limit: DSR_LIMIT[s.lender],
      monthlyActual: actual / 12,
    }
  }, [p, s, x.loan])

  const fi = futureIncomeRate(x.age, x.years)

  return (
    <>
      <PageHead
        title="DSR로 얼마까지 빌릴 수 있을까"
        lead="DSR은 1년에 갚는 모든 대출의 원금과 이자가 소득에서 차지하는 비율이에요. 은행은 40%를 넘으면 더 빌려주지 않아요. 스트레스 금리와 장래소득이 결과를 얼마나 바꾸는지 같이 보여 드려요."
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <ProfileForm compact />
          <LoanTerms showMoving={false} />
        </div>
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel title="이번에 받을 대출">
            <MoneyField label="주택담보대출 금액" value={x.loan} onChange={(loan) => setX({ ...x, loan })} step={1000} />
            <Gauge value={r.dsr} limit={r.limit} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="내 DSR" value={<span className={r.dsr > r.limit ? 'text-seal' : ''}>{pct(r.dsr)}</span>} sub="스트레스 금리 포함" />
              <Stat label="스트레스 빼면" value={pct(r.dsrNoStress)} sub={`+${r.stress}%p 차이`} />
              <Stat label="DSR 최대 한도" value={man(r.max)} sub={`${pct(r.limit, 0)} 기준`} />
              <Stat label="실제 첫 달 상환" value={monthly(r.monthlyActual)} sub={`연 ${s.ratePct}%`} />
            </div>
            {r.dsr > r.limit ? (
              <Note tone="seal" title={`DSR ${pct(r.limit, 0)}를 넘어 이 금액은 안 나와요`}>
                {man(r.max)}까지 줄이거나, 기존 대출을 갚거나, 만기를 늘리거나, 주기형·고정형 금리를 골라 보세요.
              </Note>
            ) : (
              <Note tone="bank" title={`${man(Math.max(0, r.max - x.loan))} 더 빌릴 여유가 있어요`}>
                DSR 기준이에요. LTV와 집값별 상한은 '살 수 있는 집'에서 같이 확인하세요.
              </Note>
            )}
          </Panel>

          <Panel title="DSR 계산식">
            <div className="num space-y-1.5 rounded-xl bg-paper p-4 text-[14px]">
              <p>
                심사 소득 <b>{man(r.income)}</b>
                {r.income !== r.base && <span className="text-bank"> (장래소득 +{man(r.income - r.base)})</span>}
              </p>
              <p>
                이번 대출 연 원리금 <b>{man(x.loan * unitAnnualService(s.ratePct + r.stress, s.years, s.method))}</b>
                <span className="text-muted">
                  {' '}
                  (금리 {s.ratePct}% + 스트레스 {r.stress}%p)
                </span>
              </p>
              <p>
                기존 대출 연 원리금 <b>{man(r.other)}</b>
              </p>
              <p className="border-t border-rule pt-1.5">
                DSR = ({man(x.loan * unitAnnualService(s.ratePct + r.stress, s.years, s.method))} + {man(r.other)}) ÷ {man(r.income)} = <b>{pct(r.dsr)}</b>
              </p>
            </div>
            {p.debts.length > 0 && (
              <ul className="space-y-1 text-[14px]">
                {p.debts.map((d) => (
                  <li key={d.id} className="flex justify-between gap-3">
                    <span>{DEBT_KINDS.find((k) => k.id === d.kind)!.label}</span>
                    <span className="num">연 {man(debtAnnualService(d))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="장래소득 계산기">
            <p className="text-[14px] leading-relaxed text-muted">
              대출은 20~30년인데 지금 소득만 보면 젊은 사람이 불리하니, 만 20~34세 근로소득자는 연령대별 평균 소득이 오르는 만큼을 미리 인정해 줘요(은행연합회 모범규준).
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField label="만 나이" suffix="세" value={x.age} onChange={(age) => setX({ ...x, age })} />
              <MoneyField label="연소득" value={x.income} onChange={(income) => setX({ ...x, income })} />
              <NumberField label="대출 만기" suffix="년" value={x.years} onChange={(years) => setX({ ...x, years })} />
            </div>
            <p className="text-[16px]">
              {fi ? (
                <>
                  장래소득 <b className="num marker">{man(x.income * (1 + fi))}</b>으로 인정돼요 (+{pct(fi)})
                </>
              ) : (
                <>만 20~34세가 아니거나 만기가 10년 미만이면 장래소득을 인정받지 못해요.</>
              )}
            </p>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="num w-full min-w-[420px] text-[14px]">
                <thead>
                  <tr className="border-b border-rule text-[12px] text-muted">
                    <th className="py-1.5 text-left font-semibold">나이</th>
                    {[10, 15, 20, 30].map((y) => (
                      <th key={y} className="py-1.5 text-right font-semibold">
                        만기 {y}년
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FUTURE_INCOME.map((row) => (
                    <tr key={row.ages[0]} className="border-b border-rule/60">
                      <td className="py-2">
                        만 {row.ages[0]}~{row.ages[1]}세
                      </td>
                      {([10, 15, 20, 30] as const).map((y) => (
                        <td key={y} className={`py-2 text-right ${x.age >= row.ages[0] && x.age <= row.ages[1] && y === (x.years >= 30 ? 30 : x.years >= 20 ? 20 : x.years >= 15 ? 15 : 10) ? 'bg-mark/40 font-bold' : ''}`}>
                          {pct(row.rates[y])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-muted">2024년 고용노동통계 연령대별 임금으로 계산한 비율이에요(부동산계산기.com 기준표). 은행마다 반영 여부와 방식이 다를 수 있어요.</p>
          </Panel>

          <Panel title="DSR에 들어가는 대출, 안 들어가는 대출">
            <ul className="space-y-2 text-[14px]">
              {DEBT_KINDS.map((k) => (
                <li key={k.id}>
                  <b>{k.label}</b> <span className="text-muted">{k.rule}</span>
                </li>
              ))}
              <li>
                <b>중도금·이주비 대출</b> <span className="text-muted">DSR 적용 대상이 아니에요. 대신 입주할 때 받는 잔금대출은 DSR을 봐요</span>
              </li>
              <li>
                <b>디딤돌·보금자리론 같은 정책 대출</b> <span className="text-muted">DSR 대신 DTI 60%를 봐요</span>
              </li>
              <li>
                <b>예적금·보험계약 대출</b> <span className="text-muted">DSR에 안 들어가요</span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
