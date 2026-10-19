import { METHODS } from '../calc/loan'
import { RATE_TYPES, REGIONS, regionInfo } from '../calc/policy'
import { setScenario, useStore } from '../store'
import { MoneyField, NumberField, Panel, Segmented, Toggle } from './ui'

// 어디에, 어떤 조건으로 빌릴지
export default function LoanTerms({ showMoving = true }: { showMoving?: boolean }) {
  const { scenario: s, profile: p } = useStore()
  return (
    <Panel title="어디에, 어떤 대출로">
      <Segmented label="사려는 지역" value={s.region} options={REGIONS.map((r) => ({ id: r.id, label: r.label }))} onChange={(region) => setScenario({ region })} hint={regionInfo(s.region).hint} />
      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField label="대출 금리" suffix="%" step={0.05} value={s.ratePct} onChange={(ratePct) => setScenario({ ratePct })} hint="은행 앱이나 은행연합회 소비자포털(portal.kfb.or.kr)에서 본 주담대 금리" />
        <Segmented
          label="만기"
          value={s.years}
          options={[10, 15, 20, 30, 40].map((y) => ({ id: y, label: `${y}년` }))}
          onChange={(years) => setScenario({ years })}
        />
      </div>
      <Segmented label="금리 종류" value={s.rateType} options={RATE_TYPES.map((r) => ({ id: r.id, label: r.label }))} onChange={(rateType) => setScenario({ rateType })} hint={RATE_TYPES.find((r) => r.id === s.rateType)!.hint} />
      <Segmented label="갚는 방식" value={s.method} options={METHODS.map((m) => ({ id: m.id, label: m.label }))} onChange={(method) => setScenario({ method })} hint={METHODS.find((m) => m.id === s.method)!.hint} />
      <Segmented
        label="대출받을 곳"
        value={s.lender}
        options={[
          { id: 'bank', label: '은행(DSR 40%)' },
          { id: 'second', label: '보험·저축은행·상호금융(50%)' },
        ]}
        onChange={(lender) => setScenario({ lender })}
        hint={s.lender === 'second' ? '한도는 커지지만 금리가 높아요. 2금융 대출 기록이 신용점수에 남을 수 있어요' : undefined}
      />
      <Toggle label="장래소득 반영 요청" checked={s.useFutureIncome} onChange={(useFutureIncome) => setScenario({ useFutureIncome })} hint="만 20~34세 근로소득자, 만기 10년 이상일 때 미래 소득 증가분을 인정해 줘요" />
      {p.spouse && <Toggle label="배우자와 소득 합산" checked={s.coBorrow} onChange={(coBorrow) => setScenario({ coBorrow })} hint="배우자를 공동 차주로 넣어요" />}
      <Toggle label="전용면적 85㎡ 초과(34평형 넘음)" checked={s.over85} onChange={(over85) => setScenario({ over85 })} hint="농어촌특별세 0.2%가 더 붙어요" />
      {showMoving && <MoneyField label="이사·입주청소·가전 등" value={s.moving} onChange={(moving) => setScenario({ moving })} step={50} />}
    </Panel>
  )
}
