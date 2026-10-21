import { recognizedIncome, type Profile, type Scenario } from '../calc/afford'
import { regionInfo } from '../calc/policy'
import { pct } from '../format'
import { useStore } from '../store'
import { Note } from './ui'

// 장래소득은 모범규준일 뿐이라 은행·상품마다 적용이 다르다
export function FutureIncomeNote() {
  return (
    <Note tone="bank" title="장래소득은 은행마다 달라요">
      은행연합회 모범규준을 따르지만, 적용할지와 얼마나 인정할지는 은행과 상품마다 달라요. 이 계산기는 표의 비율을 그대로 넣었어요. 은행 상담 때 "장래소득
      인정되나요?"라고 꼭 물어보세요.
    </Note>
  )
}

type Ask = { q: string; why: string }

// 내 상황에 맞춰 은행 상담 때 물어볼 것
function asks(p: Profile, s: Scenario): Ask[] {
  const list: Ask[] = []
  const fi = recognizedIncome(p, s).filter((x) => x.rate > 0)
  if (fi.length)
    list.push({
      q: '장래소득을 인정해 주나요? 몇 %까지요?',
      why: `이 계산은 ${fi.map((x) => `+${pct(x.rate)}`).join(', ')}를 다 받는다고 봤어요. 안 해 주는 은행이면 한도가 그만큼 줄어요.`,
    })
  else if (p.me.job === 'employee' && p.me.age <= 34)
    list.push({ q: '장래소득을 인정해 주나요?', why: "지금은 '장래소득 반영 요청'을 껐거나 만기가 10년 미만이에요. 켜면 한도가 늘 수 있어요." })
  if (s.rateType === 'variable' || s.rateType === 'mixed')
    list.push({ q: '주기형(5년 이상 고정) 상품이 있나요?', why: '스트레스 금리가 낮게 붙어서 같은 소득으로도 한도가 늘어요.' })
  if (p.spouse && !s.coBorrow) list.push({ q: '배우자 소득을 합쳐서 심사할 수 있나요?', why: '합치면 배우자 대출도 같이 DSR에 들어가요.' })
  const r = regionInfo(s.region)
  if (p.firstTime && p.homeless && (r.regulated || !r.capital))
    list.push({
      q: '생애최초 LTV를 적용해 주나요?',
      why: `${r.regulated ? '규제지역은 40%가 70%로' : '지방은 70%가 80%로'} 올라가요. 대신 전입·실거주 조건이 붙으니 같이 확인하세요.`,
    })
  if (p.debts.some((d) => d.kind === 'credit' || d.kind === 'card'))
    list.push({ q: '신용대출을 갚으면 한도가 얼마나 늘어나요?', why: '신용대출은 5년, 카드론은 3년에 나눠 갚는다고 보고 DSR에 넣어요.' })
  list.push(
    { q: '우대금리를 받으려면 무엇을 해야 하나요?', why: '급여이체, 카드 사용, 청약통장 같은 조건으로 금리가 내려가요.' },
    { q: '중도상환수수료는 언제까지, 얼마인가요?', why: '보통 3년 안에 갚으면 붙어요. 일찍 갚을 계획이면 꼭 확인하세요.' },
    { q: '집값은 KB시세로 보나요, 감정가로 보나요?', why: 'LTV는 은행이 보는 집값으로 계산해서, 실제 매매가보다 낮으면 한도가 줄어요.' },
  )
  return list
}

export default function AskBank() {
  const { profile: p, scenario: s } = useStore()
  return (
    <div className="space-y-3">
      <p className="text-[14px] leading-relaxed text-muted">
        같은 소득이라도 은행과 상품마다 한도와 금리가 달라요. 두세 곳에서 상담받으면서 아래를 물어보세요.
      </p>
      <ul className="divide-y divide-rule/70 border-y border-rule">
        {asks(p, s).map((a) => (
          <li key={a.q} className="py-3">
            <p className="text-[15px] font-bold">“{a.q}”</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{a.why}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
