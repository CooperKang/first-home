import { useMemo, useState } from 'react'
import { projectFuture, reachYear, savingNeeded, type FutureInput, type FutureYear } from '../calc/future'
import { planFor } from '../calc/afford'
import { FamilyGuide } from '../components/Family'
import { familyRows } from '../calc/familyRows'
import Repayment from '../components/Repayment'
import LoanTerms from '../components/LoanTerms'
import Listings from '../components/Listings'
import ProfileForm from '../components/ProfileForm'
import { Ledger, MoneyField, Note, NumberField, PageHead, Panel, Segmented } from '../components/ui'
import { man, manShort } from '../format'
import { useLocal, useStore } from '../store'
import { ownCash } from '../calc/assets'

// 살 수 있는 집값(초록 실선)과 목표 집값(황토 점선)
const CAN = '#0f8b6d'
const TARGET = '#b9831a'

function Chart({ rows, reach }: { rows: FutureYear[]; reach: number | null }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = 280
  const pad = { l: 52, r: 16, t: 16, b: 30 }
  const top = Math.max(...rows.map((r) => Math.max(r.canBuy, r.target)), 1)
  // 눈금은 5천만·1억·2억·5억처럼 딱 떨어지는 간격으로 4~6개
  const step = [5000, 10000, 20000, 50000, 100000].find((v) => top / v <= 5) ?? 200000
  const max = Math.ceil((top * 1.04) / step) * step
  const x = (i: number) => pad.l + (i / (rows.length - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b)
  const line = (key: 'canBuy' | 'target') => rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[key]).toFixed(1)}`).join('')
  const ticks = Array.from({ length: max / step }, (_, i) => step * (i + 1))
  const h = hover === null ? null : rows[hover]
  const last = rows.at(-1)!
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label="해마다 살 수 있는 집값과 목표 집값"
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - box.left) / box.width) * W
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (rows.length - 1))
          setHover(Math.max(0, Math.min(rows.length - 1, i)))
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-rule)" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)">
              {manShort(t)}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="var(--color-muted)" strokeWidth={1} />
        {rows.map((r, i) =>
          i % (rows.length > 12 ? 2 : 1) === 0 ? (
            <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
              {i === 0 ? '지금' : `${r.year}년`}
            </text>
          ) : null,
        )}
        <path d={line('target')} fill="none" stroke={TARGET} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" />
        <path d={line('canBuy')} fill="none" stroke={CAN} strokeWidth={2} strokeLinecap="round" />
        {reach !== null && (
          <g>
            <circle cx={x(reach)} cy={y(rows[reach].canBuy)} r={6} fill={CAN} stroke="var(--color-sheet)" strokeWidth={2} />
            <text x={x(reach)} y={y(rows[reach].canBuy) - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-ink)">
              {reach === 0 ? '지금 가능' : `${reach}년 뒤`}
            </text>
          </g>
        )}
        <text x={W - pad.r} y={y(last.canBuy) + (last.canBuy > last.target ? -8 : 16)} textAnchor="end" fontSize={12} fill="var(--color-ink)">
          살 수 있는 집
        </text>
        <text x={W - pad.r} y={y(last.target) + (last.canBuy > last.target ? 16 : -8)} textAnchor="end" fontSize={12} fill="var(--color-ink)">
          목표 집값
        </text>
        {h && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="var(--color-muted)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(h.canBuy)} r={4} fill={CAN} stroke="var(--color-sheet)" strokeWidth={2} />
            <circle cx={x(hover)} cy={y(h.target)} r={4} fill={TARGET} stroke="var(--color-sheet)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-rule bg-white px-3 py-2 text-[13px] shadow-sm"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > rows.length / 2 ? '-105%' : '5%'})` }}
        >
          <p className="font-bold">{hover === 0 ? '지금' : `${h.year}년 뒤`}</p>
          <p className="num">
            <span className="mr-1.5 inline-block h-0.5 w-3 align-middle" style={{ background: CAN }} />
            살 수 있는 집 {man(h.canBuy)}
          </p>
          <p className="num">
            <span className="mr-1.5 inline-block h-0.5 w-3 align-middle" style={{ background: TARGET }} />
            목표 집값 {man(h.target)}
          </p>
          <p className="num text-muted">모은 돈 {man(h.cash)}</p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-muted">
        <span>
          <span className="mr-1.5 inline-block h-0.5 w-4 align-middle" style={{ background: CAN }} />
          살 수 있는 가장 비싼 집
        </span>
        <span>
          <span className="mr-1.5 inline-block w-4 border-t-2 border-dashed align-middle" style={{ borderColor: TARGET }} />
          목표 집값(집값 상승 반영)
        </span>
      </div>
    </div>
  )
}

export default function Future() {
  const { profile: p, scenario: s } = useStore()
  const [f, setF] = useLocal<FutureInput>('future', {
    monthlySaving: 150,
    savingYieldPct: 3,
    incomeGrowthPct: 3,
    priceGrowthPct: 2,
    target: 50000,
    horizon: 15,
  })
  const [goalYears, setGoalYears] = useLocal('future-goal', { years: 5 })
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [tab, setTab] = useState<'plan' | 'me' | 'loan'>('plan')

  const rows = useMemo(() => projectFuture(p, s, f), [p, s, f])
  const reach = reachYear(rows)
  // 목표에 닿는 해에 목표 집을 실제로 살 때의 대출·비용
  const goal = useMemo(() => (reach === null ? null : planFor(rows[reach].at, s, rows[reach].target)), [rows, reach, s])
  const need = useMemo(() => savingNeeded(p, s, f, goalYears.years), [p, s, f, goalYears.years])

  return (
    <>
      <PageHead
        title="몇 년 뒤면 그 집을 살 수 있을까"
        lead="지금은 집이 없어도 괜찮아요. 매달 모으는 돈과 연봉 인상, 집값 상승을 넣으면 해마다 살 수 있는 집값이 얼마나 커지는지, 원하는 집에 언제 닿는지 보여 드려요. 대출 규제는 지금 기준으로 계산해요."
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Segmented
            label="입력"
            value={tab}
            options={[
              { id: 'plan', label: '저축 계획' },
              { id: 'me', label: '내 상황' },
              { id: 'loan', label: '지역·대출' },
            ]}
            onChange={setTab}
          />
          {tab === 'plan' && (
            <Panel title="저축 계획">
              <MoneyField label="원하는 집 가격(지금 시세)" value={f.target} onChange={(target) => setF({ ...f, target })} step={1000} />
              <div className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">지금 모아 둔 돈</span>
                  <span className="block text-[12px] text-muted">'내 상황'의 예적금·보증금 등을 합친 금액</span>
                </span>
                <span className="num shrink-0 text-right">
                  <span className="block text-[18px] font-bold">{man(ownCash(p))}</span>
                  <button type="button" onClick={() => setTab('me')} className="text-[13px] font-semibold text-bank underline underline-offset-4">
                    항목별로 고치기
                  </button>
                </span>
              </div>
              <MoneyField label="매달 모으는 돈" value={f.monthlySaving} onChange={(monthlySaving) => setF({ ...f, monthlySaving })} step={10} />
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="저축·투자 수익률" suffix="%/년" step={0.5} value={f.savingYieldPct} onChange={(savingYieldPct) => setF({ ...f, savingYieldPct })} />
                <NumberField label="연봉 인상률" suffix="%/년" step={0.5} value={f.incomeGrowthPct} onChange={(incomeGrowthPct) => setF({ ...f, incomeGrowthPct })} hint="저축액도 같이 늘려요" />
                <NumberField label="집값 상승률" suffix="%/년" step={0.5} value={f.priceGrowthPct} onChange={(priceGrowthPct) => setF({ ...f, priceGrowthPct })} hint="0이면 집값 그대로" />
                <NumberField label="몇 년까지 볼까" suffix="년" value={f.horizon} onChange={(horizon) => setF({ ...f, horizon: Math.max(1, Math.min(30, horizon)) })} max={30} />
              </div>
            </Panel>
          )}
          {tab === 'me' && <ProfileForm />}
          {tab === 'loan' && <LoanTerms />}
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel>
            <p className="text-[14px] text-muted">지금 시세 {man(f.target)}짜리 집은</p>
            <p className="font-book text-[30px] leading-tight font-extrabold md:text-[38px]">
              {reach === null ? (
                <>{f.horizon}년 안에는 어려워요</>
              ) : reach === 0 ? (
                <span className="marker">지금 바로 살 수 있어요</span>
              ) : (
                <>
                  <span className="marker num">{reach}년 뒤</span>에 살 수 있어요
                </>
              )}
            </p>
            {goal && reach !== null && (
              <div className="space-y-4 border-t border-rule pt-4">
                <p className="text-[15px] leading-relaxed">
                  {reach > 0 ? `${reach}년 뒤` : '지금'} 집값은 <b className="num">{man(goal.price)}</b>, 모은 돈은 <b className="num">{man(rows[reach].cash)}</b>
                  {familyRows(p).length > 0 && <>에 가족 도움을 더하고</>}
                  {goal.loan.amount > 0 && (
                    <>
                      , <b className="num">{goal.loan.name} {man(goal.loan.amount)}</b>을 받아
                    </>
                  )}{' '}
                  이렇게 살 수 있어요.
                </p>
                <Repayment p={rows[reach].at} s={s} plan={goal} />
                <details className="group">
                  <summary className="cursor-pointer text-[14px] font-semibold text-bank">그때 통장 내역 보기</summary>
                  <div className="mt-3">
                    <Ledger rows={[...familyRows(p), { label: goal.loan.name, note: `연 ${goal.loan.ratePct.toFixed(2)}%`, amount: goal.loan.amount, kind: 'in' }, { label: '집값', amount: goal.price, kind: 'out' }, ...goal.costs.map((c) => ({ label: c.label, note: c.note, amount: c.amount, kind: 'out' as const }))]} start={rows[reach].cash} startLabel="그때까지 모은 돈" />
                  </div>
                </details>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-rule pt-4">
              <Segmented
                label="보기"
                value={view}
                options={[
                  { id: 'chart', label: '그래프' },
                  { id: 'table', label: '표' },
                ]}
                onChange={setView}
              />
            </div>
            {view === 'chart' ? (
              <Chart rows={rows} reach={reach} />
            ) : (
              <div className="max-h-[360px] overflow-auto">
                <table className="num w-full text-[14px]">
                  <thead className="sticky top-0 bg-sheet">
                    <tr className="border-b border-rule text-[12px] text-muted">
                      <th className="py-1.5 text-left font-semibold">시점</th>
                      <th className="py-1.5 text-right font-semibold">모은 돈</th>
                      <th className="py-1.5 text-right font-semibold">살 수 있는 집</th>
                      <th className="py-1.5 text-right font-semibold">목표 집값</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.year} className={`border-b border-rule/60 ${r.year === reach ? 'bg-mark/30 font-bold' : ''}`}>
                        <td className="py-1.5">{r.year === 0 ? '지금' : `${r.year}년 뒤`}</td>
                        <td className="py-1.5 text-right">{man(r.cash)}</td>
                        <td className="py-1.5 text-right">{man(r.canBuy)}</td>
                        <td className="py-1.5 text-right">{man(r.target)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="이때까지 사려면 매달 얼마씩">
            <Segmented label="목표 시점" value={goalYears.years} options={[3, 5, 7, 10].map((y) => ({ id: y, label: `${y}년 뒤` }))} onChange={(years) => setGoalYears({ years })} />
            {need === null ? (
              <Note tone="seal" title={`${goalYears.years}년 안에는 한 달 2천만원을 모아도 어려워요`}>
                목표 집값을 낮추거나, 지역을 바꾸거나, 기간을 늘려 보세요.
              </Note>
            ) : need === 0 ? (
              <Note tone="bank" title="지금 모아 둔 돈으로 이미 충분해요" />
            ) : (
              <p className="text-[16px]">
                매달 <b className="num marker">{man(need)}</b>씩 모으면 {goalYears.years}년 뒤 목표에 닿아요.{' '}
                {need > f.monthlySaving ? <span className="text-seal">지금보다 {man(need - f.monthlySaving)} 더 필요해요.</span> : <span className="text-bank">지금 계획으로 충분해요.</span>}
              </p>
            )}
          </Panel>

          <Panel title="해마다 볼 수 있는 집값">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[0, 3, 5, 10].filter((y) => y <= f.horizon).map((y) => (
                <li key={y} className="rounded-xl bg-paper p-3">
                  <p className="text-[13px] text-muted">{y === 0 ? '지금' : `${y}년 뒤`}</p>
                  <p className="num text-[18px] font-bold">{manShort(rows[y].canBuy)}</p>
                </li>
              ))}
            </ul>
            <Note tone="plain" title="부모님 도움도 계산에 넣을 수 있어요">
              '내 상황'의 가족 도움에 증여받을 돈이나 빌릴 돈을 넣으면, 집 살 때 쓸 돈에 더해 목표에 닿는 해가 당겨지는지 보여 드려요.
            </Note>
            <Note tone="plain" title="지금은 전세·월세로 살고 있다면">
              보증금도 모은 돈에 들어가요. 전세 만기에 돌려받을 보증금을 '지금 모아 둔 돈'에 더하고, 전세대출이 있다면 빼 주세요. 청약통장은 따로 꾸준히 넣어 두는 게 유리해요(월 25만원까지 인정).
            </Note>
          </Panel>

          <Panel title="부모님 도움을 받는다면(증여·차용)">
            <FamilyGuide />
          </Panel>

          <Panel title="지금 볼 수 있는 매물">
            <Listings region={s.region} price={rows[0].canBuy || f.target} />
          </Panel>
        </div>
      </div>
    </>
  )
}
