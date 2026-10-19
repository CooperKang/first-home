import type { Person, Profile } from '../calc/afford'
import { DEBT_KINDS, type Debt, type DebtKind } from '../calc/loan'
import { setProfile, useStore } from '../store'
import { Grid2, MoneyField, NumberField, Panel, Segmented, Toggle } from './ui'

const JOBS: { id: Person['job']; label: string }[] = [
  { id: 'employee', label: '직장인(근로소득)' },
  { id: 'self', label: '사업·프리랜서' },
  { id: 'none', label: '소득 없음' },
]

function PersonFields({ who, person, onChange }: { who: string; person: Person; onChange: (p: Person) => void }) {
  return (
    <div className="space-y-4">
      <Grid2>
        <NumberField label={`${who} 만 나이`} suffix="세" value={person.age} onChange={(age) => onChange({ ...person, age })} max={99} />
        <MoneyField
          label={`${who} 연소득(세전)`}
          value={person.income}
          onChange={(income) => onChange({ ...person, income })}
          hint="원천징수영수증의 총급여. 성과급도 들어가요"
        />
      </Grid2>
      <Segmented label={`${who} 소득 형태`} value={person.job} options={JOBS} onChange={(job) => onChange({ ...person, job })} />
      {person.job === 'employee' && (
        <NumberField
          label={`${who} 지금 회사 다닌 기간`}
          suffix="년"
          step={0.5}
          value={person.tenure}
          onChange={(tenure) => onChange({ ...person, tenure })}
          hint={person.tenure < 1 ? '1년이 안 되면 은행이 소득을 연으로 환산해 보거나 서류를 더 요구할 수 있어요' : undefined}
        />
      )}
    </div>
  )
}

function DebtList({ debts, onChange }: { debts: Debt[]; onChange: (d: Debt[]) => void }) {
  const add = (kind: DebtKind) =>
    onChange([...debts, { id: crypto.randomUUID(), kind, balance: 1000, ratePct: kind === 'student' ? 1.7 : 6, years: kind === 'installment' ? 4 : 5 }])
  return (
    <div className="space-y-3">
      {debts.map((d) => {
        const meta = DEBT_KINDS.find((k) => k.id === d.kind)!
        const set = (patch: Partial<Debt>) => onChange(debts.map((x) => (x.id === d.id ? { ...x, ...patch } : x)))
        return (
          <div key={d.id} className="rounded-xl border border-rule bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold">{meta.label}</p>
                <p className="text-[13px] text-muted">{meta.rule}</p>
              </div>
              <button type="button" className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold text-seal hover:bg-seal-soft" onClick={() => onChange(debts.filter((x) => x.id !== d.id))}>
                삭제
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <MoneyField label="남은 금액" value={d.balance} onChange={(balance) => set({ balance })} />
              <NumberField label="금리" suffix="%" step={0.1} value={d.ratePct} onChange={(ratePct) => set({ ratePct })} />
              {(d.kind === 'installment' || d.kind === 'student' || d.kind === 'mortgage') && (
                <NumberField label="남은 기간" suffix="년" value={d.years} onChange={(years) => set({ years })} />
              )}
            </div>
          </div>
        )
      })}
      <div className="flex flex-wrap gap-1.5">
        {DEBT_KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => add(k.id)} className="min-h-10 rounded-full border border-dashed border-bank/50 px-3.5 text-[14px] font-semibold text-bank hover:bg-bank-soft">
            + {k.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// 모든 계산기가 같이 쓰는 '내 상황' 입력
export default function ProfileForm({ compact = false }: { compact?: boolean }) {
  const { profile: p } = useStore()
  const set = (patch: Partial<Profile>) => setProfile((x) => ({ ...x, ...patch }))
  return (
    <div className="space-y-4">
      <Panel title="나">
        <PersonFields who="내" person={p.me} onChange={(me) => set({ me })} />
      </Panel>

      <Panel title="결혼과 가족">
        <Segmented
          label="결혼"
          value={p.married}
          options={[
            { id: 'single', label: '미혼' },
            { id: 'engaged', label: '3개월 안에 결혼 예정' },
            { id: 'married', label: '기혼' },
          ]}
          onChange={(married) =>
            set({ married, spouse: married === 'single' ? null : (p.spouse ?? { age: p.me.age, income: 3500, job: 'employee', tenure: 2 }) })
          }
          hint="결혼 예정이어도 신혼부부 정책 대출은 신청할 수 있어요(예식장 계약서 등)"
        />
        {p.married === 'married' && (
          <NumberField label="혼인신고한 지" suffix="년" value={p.marriageYears} onChange={(marriageYears) => set({ marriageYears })} hint="7년 이내면 신혼부부 혜택 대상이에요" />
        )}
        {p.spouse && <PersonFields who="배우자" person={p.spouse} onChange={(spouse) => set({ spouse })} />}
        {!compact && (
          <Grid2>
            <Toggle label="2년 안에 아이를 낳았어요" checked={p.newborn} onChange={(newborn) => set({ newborn })} hint="신생아 특례 대출, 출산 가구 취득세 감면 대상" />
            <NumberField label="자녀 수" suffix="명" value={p.kids} onChange={(kids) => set({ kids })} max={10} />
          </Grid2>
        )}
      </Panel>

      <Panel title="집과 돈">
        <Toggle
          label="세대원 모두 지금 집이 없어요"
          checked={p.homeless}
          onChange={(homeless) => set({ homeless, firstTime: homeless ? p.firstTime : false })}
          hint="분양권·입주권, 공시가격 낮은 지방 소형 주택도 주택 수에 들어갈 수 있어요"
        />
        {p.homeless && (
          <Toggle
            label="세대원 모두 집을 가져 본 적이 없어요(생애최초)"
            checked={p.firstTime}
            onChange={(firstTime) => set({ firstTime })}
            hint="배우자가 결혼 전에 집을 가졌던 적이 있으면 생애최초가 아니에요"
          />
        )}
        <Grid2>
          <MoneyField
            label="집 사는 데 쓸 수 있는 현금"
            value={p.cash}
            onChange={(cash) => set({ cash })}
            hint="예적금, 전세보증금 돌려받을 돈, 부모님 지원(증여세 확인)"
          />
          <MoneyField label="순자산" value={p.netAssets} onChange={(netAssets) => set({ netAssets })} hint="부부 합산 재산 − 부채. 정책 대출 심사에 써요" />
        </Grid2>
      </Panel>

      <Panel title="지금 갚고 있는 대출">
        <DebtList debts={p.debts} onChange={(debts) => set({ debts })} />
      </Panel>
    </div>
  )
}
