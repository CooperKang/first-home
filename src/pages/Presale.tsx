import { useMemo } from 'react'
import { ownCash } from '../calc/assets'
import { bestLoan } from '../calc/afford'
import { purchaseCosts } from '../calc/costs'
import { INTEREST_MODES, presaleSchedule, type PresaleInput } from '../calc/presale'
import { REGIONS } from '../calc/policy'
import { Ledger, MoneyField, Note, NumberField, PageHead, Panel, Segmented, Stamp } from '../components/ui'
import { man } from '../format'
import { setScenario, useLocal, useStore } from '../store'

export default function Presale() {
  const { profile: p, scenario: s } = useStore()
  const [x, setX] = useLocal<PresaleInput & { appraisal: number }>('presale', {
    price: 60000,
    options: 1500,
    depositPct: 10,
    middlePct: 60,
    middleCount: 6,
    months: 30,
    middleRatePct: 4.5,
    mode: 'deferred',
    middleLoanPct: 100,
    appraisal: 65000,
  })
  const sch = useMemo(() => presaleSchedule(x), [x])
  // 입주 때 잔금대출: 감정가(KB 시세)로 LTV를 보고 DSR도 다시 본다
  const final = useMemo(() => bestLoan(p, s, x.appraisal), [p, s, x.appraisal])
  const finalLoan = Math.min(final.amount, sch.atMoveIn)
  const costs = purchaseCosts(x.price + x.options, { region: s.region, over85: s.over85, firstTime: p.firstTime, loan: finalLoan, moving: s.moving }).filter((c) => c.key !== 'fee')
  const costTotal = costs.reduce((a, c) => a + c.amount, 0)
  const cashAtContract = sch.steps[0].cash
  const cashMiddle = sch.steps.slice(1).reduce((a, st) => a + st.cash, 0)
  const cashMoveIn = sch.atMoveIn - finalLoan + costTotal
  const totalCash = cashAtContract + cashMiddle + cashMoveIn
  const ok = ownCash(p) >= totalCash

  return (
    <>
      <PageHead
        title="분양에 당첨되면 언제 얼마가 필요할까"
        lead="분양 아파트는 한 번에 돈이 나가지 않아요. 계약금은 내 돈, 중도금은 집단대출, 입주 때 잔금대출로 갈아타요. 그 사이에 쌓이는 중도금 이자와 입주 때 한꺼번에 내는 세금까지 순서대로 보여 드려요."
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title="분양 조건">
            <Segmented label="지역" value={s.region} options={REGIONS.map((r) => ({ id: r.id, label: r.label }))} onChange={(region) => setScenario({ region })} />
            <MoneyField label="분양가" value={x.price} onChange={(price) => setX({ ...x, price })} step={1000} slider={{ min: 10000, max: 300000, step: 1000 }} />
            <MoneyField label="발코니 확장·유상 옵션" value={x.options} onChange={(options) => setX({ ...x, options })} step={100} hint="계약할 때 10%, 입주할 때 나머지를 낸다고 봤어요" />
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="계약금" suffix="%" value={x.depositPct} onChange={(depositPct) => setX({ ...x, depositPct })} />
              <NumberField label="중도금" suffix="%" value={x.middlePct} onChange={(middlePct) => setX({ ...x, middlePct })} />
              <NumberField label="중도금 횟수" suffix="회" value={x.middleCount} onChange={(middleCount) => setX({ ...x, middleCount: Math.max(1, middleCount) })} />
              <NumberField label="계약부터 입주까지" suffix="개월" value={x.months} onChange={(months) => setX({ ...x, months })} />
              <NumberField label="중도금 대출 금리" suffix="%" step={0.1} value={x.middleRatePct} onChange={(middleRatePct) => setX({ ...x, middleRatePct })} />
              <NumberField label="중도금 중 대출 비율" suffix="%" value={x.middleLoanPct} onChange={(middleLoanPct) => setX({ ...x, middleLoanPct: Math.min(100, middleLoanPct) })} hint="규제지역은 LTV 때문에 분양가의 40%(생애최초 70%)까지만 나올 수 있어요" />
            </div>
            <Segmented label="중도금 이자" value={x.mode} options={INTEREST_MODES.map((m) => ({ id: m.id, label: m.label }))} onChange={(mode) => setX({ ...x, mode })} hint={INTEREST_MODES.find((m) => m.id === x.mode)!.hint} />
            <MoneyField label="입주 때 예상 시세(감정가)" value={x.appraisal} onChange={(appraisal) => setX({ ...x, appraisal })} step={1000} hint="잔금대출 LTV는 분양가가 아니라 입주 시점 감정가·KB 시세로 봐요" />
          </Panel>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] text-muted">입주까지 필요한 내 돈</p>
                <p className="num font-book text-[34px] leading-tight font-extrabold">
                  <span className="marker">{man(totalCash)}</span>
                </p>
                <p className="num text-[14px] text-muted">
                  계약 때 {man(cashAtContract)}, 중도금 자납 {man(cashMiddle)}, 입주 때 {man(cashMoveIn)}
                </p>
              </div>
              <Stamp ok={ok}>{ok ? <>자금<br />충분</> : <>현금<br />부족</>}</Stamp>
            </div>
            <ol className="relative space-y-3 border-l-2 border-bank/40 pl-5">
              {sch.steps.map((st, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-sheet bg-bank" aria-hidden />
                  <p className="text-[14px] font-bold">
                    {st.month === 0 ? '계약일' : `${st.month}개월 뒤`} {st.label}
                  </p>
                  <p className="num text-[13px] text-muted">
                    {st.loan ? `중도금 대출 ${man(st.loan)}` : ''}
                    {st.loan && st.cash ? ', ' : ''}
                    {st.cash ? `내 돈 ${man(st.cash)}` : ''}
                  </p>
                </li>
              ))}
              <li className="relative">
                <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-sheet bg-seal" aria-hidden />
                <p className="text-[14px] font-bold">{x.months}개월 뒤 입주(잔금)</p>
                <p className="num text-[13px] text-muted">잔금대출로 중도금 대출을 갚고 남은 잔금을 내요</p>
              </li>
            </ol>
          </Panel>

          <Panel title="입주하는 날의 통장">
            <Ledger
              start={ownCash(p) - cashAtContract - cashMiddle}
              startLabel="계약금·중도금 내고 남은 돈"
              rows={[
                { label: `잔금대출(${final.name})`, note: `감정가 ${man(x.appraisal)} 기준으로 다시 심사`, amount: finalLoan, kind: 'in' },
                { label: '잔금', note: `분양가의 ${100 - x.depositPct - x.middlePct}%`, amount: sch.balance, kind: 'out' },
                { label: '중도금 대출 상환', amount: sch.middleLoan, kind: 'out' },
                ...(sch.deferred ? [{ label: '쌓인 중도금 이자', note: '이자후불제', amount: sch.deferred, kind: 'out' as const }] : []),
                ...(x.options ? [{ label: '옵션 잔금', amount: x.options * 0.9, kind: 'out' as const }] : []),
                ...costs.map((c) => ({ label: c.label, note: c.note, amount: c.amount, kind: 'out' as const })),
              ]}
            />
            {x.mode === 'paid' && <Note tone="plain" title={`중도금 이자 ${man(sch.paidMonthly)}은 입주 전까지 매달 나눠 내요`} />}
            {x.mode === 'free' && <Note tone="plain" title={`중도금 이자 ${man(sch.interest)}은 시행사가 내요`}>무이자라도 분양가에 이미 반영돼 있는 경우가 많아요.</Note>}
          </Panel>

          <Panel title="분양에서 놓치기 쉬운 것">
            <div className="space-y-2.5">
              <Note tone="seal" title="잔금대출은 입주 시점의 규제로 다시 심사해요">
                중도금 대출은 DSR을 보지 않지만, 잔금대출은 그때의 LTV·DSR·스트레스 금리가 적용돼요. 지금 계산으로는 {man(final.amount)}이 나와요. 규제가 바뀌거나 시세가 분양가보다 낮게 잡히면 줄어들 수 있어요.
              </Note>
              {finalLoan < sch.middleLoan && (
                <Note tone="seal" title="잔금대출로 중도금 대출을 다 못 갚아요">
                  중도금 대출 {man(sch.middleLoan)}보다 잔금대출 한도가 작아서 {man(sch.middleLoan - finalLoan)}을 내 돈으로 메워야 해요.
                </Note>
              )}
              <Note tone="plain" title="계약금은 당첨 후 1~2주 안에 내야 해요">
                청약 넣기 전에 계약금을 바로 낼 수 있는 현금이 있어야 해요. 부족하면 계약을 포기하게 되고 재당첨 제한이 생겨요.
              </Note>
              <Note tone="plain" title="취득세는 입주할 때 분양가 기준으로 내요">
                옵션 금액도 취득가액에 들어가요. 생애최초 감면도 이때 신청해요.
              </Note>
              <Note tone="bank" title="청약 자격은 청약홈에서 확인하세요">
                신혼부부·생애최초 특별공급은 소득·자산 기준이 따로 있어요. 혼인 전 배우자의 당첨 이력은 따지지 않아요.
              </Note>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
