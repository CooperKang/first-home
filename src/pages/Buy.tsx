import { useEffect, useMemo, useState } from 'react'
import { ownCash } from '../calc/assets'
import { maxAffordable, planFor, type Plan } from '../calc/afford'
import { buyInsights } from '../calc/insights'
import { regionInfo } from '../calc/policy'
import LoanTerms from '../components/LoanTerms'
import Listings from '../components/Listings'
import { IncomeTable, LimitBars, OptionsTable, PolicyCheck } from '../components/LoanBreakdown'
import ProfileForm from '../components/ProfileForm'
import Repayment from '../components/Repayment'
import { FamilyGuide } from '../components/Family'
import { familyRows } from '../calc/familyRows'
import { Ledger, MoneyField, Note, PageHead, Panel, Segmented, Stamp, type LedgerRow } from '../components/ui'
import { man } from '../format'
import { useLocal, useStore } from '../store'
import { clearQuery, routeQuery } from '../router'
import AskBank, { FutureIncomeNote } from '../components/AskBank'
import DsrCheck from '../components/DsrCheck'
import { recognizedIncome } from '../calc/afford'

type Mode = 'max' | 'price' | 'dsr'

const HEADS: Record<Mode, { title: string; lead: string }> = {
  max: {
    title: '얼마짜리 집까지 살 수 있을까',
    lead: '소득, 모은 돈, 지금 있는 대출을 넣으면 LTV·DSR·스트레스 금리·집값별 상한·정책 대출을 모두 따져서 살 수 있는 가장 비싼 집과 필요한 돈을 통장처럼 보여 드려요.',
  },
  price: {
    title: '이 집, 살 수 있을까',
    lead: '보고 있는 집 가격을 넣으면 대출이 얼마나 나오고, 세금·비용까지 내 돈이 얼마나 드는지 통장처럼 보여 드려요.',
  },
  dsr: {
    title: 'DSR로 얼마까지 빌릴 수 있을까',
    lead: 'DSR은 1년에 갚는 모든 대출의 원금과 이자가 소득에서 차지하는 비율이에요. 은행은 40%를 넘으면 더 빌려주지 않아요. 스트레스 금리와 장래소득이 결과를 얼마나 바꾸는지 같이 보여 드려요.',
  },
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'max', label: '최대 얼마짜리 집' },
  { id: 'price', label: '이 집 살 수 있나' },
  { id: 'dsr', label: '대출 얼마까지(DSR)' },
]

function queryMode(): { mode: Mode } | undefined {
  const q = routeQuery()
  return MODES.some((m) => m.id === q) ? { mode: q as Mode } : undefined
}

function ledgerRows(plan: Plan): LedgerRow[] {
  return [
    { label: plan.loan.name, note: `연 ${plan.loan.ratePct.toFixed(2)}%`, amount: plan.loan.amount, kind: 'in' },
    { label: '집값', note: '계약금 + 중도금 + 잔금', amount: plan.price, kind: 'out' },
    ...plan.costs.map((c) => ({ label: c.label, note: c.note, amount: c.amount, kind: 'out' as const })),
  ]
}

export default function Buy() {
  const { profile: p, scenario: s } = useStore()
  const [mode, setMode] = useLocal('buy-mode', { mode: 'max' as Mode, price: 60000 }, queryMode())
  const [tab, setTab] = useState<'me' | 'loan'>('me')
  useEffect(clearQuery, [])

  const plan = useMemo(() => (mode.mode === 'price' ? planFor(p, s, mode.price) : maxAffordable(p, s)), [p, s, mode])
  const futureIncome = recognizedIncome(p, s).some((x) => x.rate > 0)
  const insights = useMemo(() => buyInsights(p, s, plan), [p, s, plan])
  const ok = !!plan && plan.left >= 0
  const question = <Segmented label="무엇이 궁금하세요?" value={mode.mode} options={MODES} onChange={(m) => setMode({ ...mode, mode: m })} />

  return (
    <>
      <PageHead title={HEADS[mode.mode].title} lead={HEADS[mode.mode].lead} />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Segmented
            label="입력"
            value={tab}
            options={[
              { id: 'me', label: '내 상황' },
              { id: 'loan', label: '지역·대출 조건' },
            ]}
            onChange={setTab}
          />
          {tab === 'me' ? <ProfileForm /> : <LoanTerms />}
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {mode.mode === 'dsr' ? (
            <>
              <DsrCheck>{question}</DsrCheck>
              <Panel title="은행 상담 때 꼭 물어보세요">
                <AskBank />
              </Panel>
            </>
          ) : (
            <>
              <Panel>
                {question}
                {mode.mode === 'price' && (
                  <MoneyField label="보고 있는 집 가격" value={mode.price} onChange={(price) => setMode({ ...mode, price })} step={1000} />
                )}

                {plan ? (
                  <>
                    <div className="flex items-center justify-between gap-4 border-t border-rule pt-5">
                      <div className="min-w-0">
                        <p className="text-[14px] text-muted">
                          {regionInfo(s.region).label}에서 {mode.mode === 'max' ? '살 수 있는 가장 비싼 집' : '이 집을 사면'}
                        </p>
                        <p className="num mt-1 font-book text-[28px] leading-tight font-extrabold sm:text-[34px] md:text-[42px]">
                          <span className="marker">{man(plan.price)}</span>
                        </p>
                        <p className="num mt-1 text-[14px] text-muted">
                          대출 {man(plan.loan.amount)}, 내 돈 {man(plan.price - plan.loan.amount)}, 세금·비용 {man(plan.costTotal)}
                        </p>
                      </div>
                      <Stamp ok={ok}>
                        {ok ? (
                          <>
                            살 수<br />
                            있어요
                          </>
                        ) : (
                          <>
                            현금
                            <br />
                            부족
                          </>
                        )}
                      </Stamp>
                    </div>
                    <Ledger rows={[...familyRows(p), ...ledgerRows(plan)]} start={ownCash(p)} startLabel="모은 돈" />
                    {!ok && (
                      <Note tone="seal" title={`${man(-plan.left)}이 모자라요`}>
                        현금을 더 모으거나, 집값을 낮추거나, 아래 대출 조건(주기형, 장래소득, 배우자 합산)을 바꿔 보세요. 미래 계산기에서 몇 년 뒤면 되는지 볼
                        수 있어요.
                      </Note>
                    )}
                    <Repayment p={p} s={s} plan={plan} />
                  </>
                ) : (
                  <Note tone="seal" title="지금 현금으로는 부대비용을 내기도 어려워요">
                    집 사는 데 쓸 수 있는 현금을 넣어 주세요. 현금이 없다면 '몇 년 뒤 내 집' 계산기로 모으는 계획부터 세워 보세요.
                  </Note>
                )}
              </Panel>

              {plan && (
                <>
                  <Panel title="은행 주담대 한도는 셋 중 가장 작은 값">
                    {plan.loan.dsrExempt && (
                      <p className="text-[14px] leading-relaxed text-bank">
                        지금은 {plan.loan.name}이 은행 대출보다 더 많이 나와서 그쪽으로 계산했어요. 정책 대출은 DSR 대신 DTI 60%와 상품 한도를 봐요.
                      </p>
                    )}
                    <LimitBars p={p} s={s} price={plan.price} />
                    <IncomeTable p={p} s={s} price={plan.price} />
                    {futureIncome && <FutureIncomeNote />}
                  </Panel>
                  <Panel title="받을 수 있는 대출 비교">
                    <OptionsTable p={p} s={s} price={plan.price} chosen={plan.loan.id} />
                  </Panel>
                  <Panel title="은행 상담 때 꼭 물어보세요">
                    <AskBank />
                  </Panel>
                </>
              )}

              <Panel title="놓치기 쉬운 것">
                <div className="space-y-2.5">
                  {insights.map((x, i) => (
                    <Note key={i} tone={x.tone} title={x.title}>
                      {x.body}
                    </Note>
                  ))}
                </div>
              </Panel>

              <Panel title="부모님 도움을 받는다면(증여·차용)">
                <FamilyGuide />
              </Panel>

              <Panel title="정책 대출 자격">
                <PolicyCheck p={p} price={plan?.price ?? mode.price} />
              </Panel>

              {plan && (
                <Panel title="이 가격대 매물 보기">
                  <Listings region={s.region} price={plan.price} />
                </Panel>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
