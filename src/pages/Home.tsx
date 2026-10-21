import { useMemo } from 'react'
import { maxAffordable, type Profile } from '../calc/afford'
import { NO_ASSETS, ownCash } from '../calc/assets'
import { POLICY_AS_OF, regionInfo } from '../calc/policy'
import { Stamp } from '../components/ui'
import { man } from '../format'
import { href, type Route } from '../router'
import { DEFAULT_PROFILE, setProfile, setScenario, useStore } from '../store'

const PERSONAS: { id: string; name: string; desc: string; go: Route; profile: Profile }[] = [
  {
    id: 'rookie',
    name: '사회초년생',
    desc: '입사 1~2년, 지금은 전월세. 몇 년 모으면 될지 궁금해요',
    go: 'future',
    profile: { ...DEFAULT_PROFILE, me: { age: 26, income: 3600, job: 'employee', tenure: 1.5 }, assets: { ...NO_ASSETS, savings: 3000 } },
  },
  {
    id: 'first',
    name: '생애최초 1인 가구',
    desc: '혼자 첫 집을 사려고 해요',
    go: 'buy',
    profile: { ...DEFAULT_PROFILE, me: { age: 32, income: 5500, job: 'employee', tenure: 5 }, assets: { ...NO_ASSETS, savings: 15000 } },
  },
  {
    id: 'newlywed',
    name: '맞벌이 신혼부부',
    desc: '둘이 합친 소득과 돈으로 어디까지 될까요',
    go: 'buy',
    profile: {
      ...DEFAULT_PROFILE,
      me: { age: 31, income: 5200, job: 'employee', tenure: 4 },
      spouse: { age: 30, income: 4300, job: 'employee', tenure: 3 },
      married: 'married',
      marriageYears: 1,
      assets: { ...NO_ASSETS, savings: 25000 },
    },
  },
  {
    id: 'baby',
    name: '아기가 생긴 부부',
    desc: '신생아 특례 대출을 받을 수 있을까요',
    go: 'buy',
    profile: {
      ...DEFAULT_PROFILE,
      me: { age: 33, income: 6000, job: 'employee', tenure: 6 },
      spouse: { age: 32, income: 3000, job: 'employee', tenure: 5 },
      married: 'married',
      marriageYears: 3,
      newborn: true,
      kids: 1,
      assets: { ...NO_ASSETS, savings: 20000, other: 2000 },
    },
  },
]

const TOOLS: { id: Route; q?: string; title: string; desc: string }[] = [
  { id: 'buy', title: '얼마짜리 집까지 살 수 있을까', desc: 'LTV, 스트레스 DSR, 장래소득, 집값별 상한, 정책 대출, 취득세·중개보수·법무사비까지 한 번에' },
  { id: 'future', title: '몇 년 뒤면 그 집을 살 수 있을까', desc: '매달 모으는 돈, 연봉 인상, 집값 상승을 넣고 원하는 집에 닿는 해를 찾아요' },
  { id: 'buy', q: 'dsr', title: 'DSR로 얼마까지 빌릴 수 있을까', desc: '신용대출·할부가 한도를 얼마나 깎는지, 장래소득을 받으면 얼마나 느는지' },
  { id: 'rent', title: '전세·월세, 내 돈은 얼마나 들까', desc: '버팀목·청년 전세대출, 한 달 실제 비용, 깡통전세와 보증보험 점검' },
  { id: 'presale', title: '분양에 당첨되면 언제 얼마가 필요할까', desc: '계약금, 중도금 대출과 이자후불제 이자, 입주 때 잔금대출과 세금' },
  { id: 'policy', title: '지금 대출 규제, 나한테는 어떻게 적용될까', desc: '6·27부터 10·15, 8·13까지 바뀐 규제와 내 상황에 맞는 기준' },
]

const MISSED = [
  '은행은 실제 금리보다 최대 3%p 높은 금리로 한도를 계산해요(스트레스 DSR)',
  '만 34세까지는 장래소득을 인정받으면 한도가 늘어요',
  '신용대출 1천만원이 주담대 한도를 수천만원 깎을 수 있어요',
  '계약금은 대출이 안 돼요. 집값의 10%는 먼저 현금으로',
  '취득세·중개보수·법무사비·채권으로 집값의 2~4%가 더 들어요',
  '서울은 2년 실거주 의무가 있어 전세 끼고 사기가 막혔어요',
  '결혼 전후 부모님 지원은 1인당 1억 5천만원까지 증여세가 없어요',
]

export default function Home() {
  const { profile: p, scenario: s } = useStore()
  const plan = useMemo(() => maxAffordable(p, s), [p, s])

  const pick = (x: (typeof PERSONAS)[number]) => {
    setProfile(x.profile)
    setScenario({ useFutureIncome: true, coBorrow: true })
    window.location.assign(href(x.go))
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="grid grid-cols-1 items-center gap-10 pt-10 pb-12 md:grid-cols-[1.1fr_1fr] md:pt-16">
        <div>
          <h1 className="font-book text-[36px] leading-[1.18] font-extrabold tracking-[-0.015em] md:text-[54px]">
            첫 집,
            <br />
            내 통장으로
            <br />
            어디까지 될까
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-muted">
            소득과 모은 돈을 넣으면 대출 규제, 정책 대출, 세금과 수수료까지 따져서 살 수 있는 집값과 필요한 현금을 알려 드려요. 사회초년생, 생애최초, 신혼부부가 처음이라 놓치기 쉬운 것까지 같이 짚어 드려요.
          </p>
          <p className="mt-6 text-[14px] font-semibold">나와 비슷한 상황을 골라 시작해 보세요</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {PERSONAS.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => pick(x)} className="h-full w-full rounded-xl border border-rule bg-sheet px-4 py-3 text-left transition hover:border-bank hover:bg-white">
                  <span className="block text-[15px] font-bold">{x.name}</span>
                  <span className="block text-[13px] leading-snug text-muted">{x.desc}</span>
                </button>
              </li>
            ))}
          </ul>
          <a href={href('buy')} className="mt-3 inline-block text-[14px] font-semibold text-bank underline underline-offset-4">
            직접 입력할게요
          </a>
        </div>

        {/* 통장 표지와 첫 장 */}
        <a href={href('buy')} className="group relative mx-auto block w-full max-w-[420px]" aria-label="내 첫 집 통장 열기">
          <div className="stitch relative rounded-t-2xl bg-bank px-6 pt-8 pb-5 text-white">
            <p className="font-book text-[22px] font-extrabold">첫 집 통장</p>
            <p className="mt-0.5 text-[13px] text-white/75">{regionInfo(s.region).label} · {POLICY_AS_OF} 규제 기준</p>
          </div>
          <div className="ledger-lines relative rounded-b-2xl border border-t-0 border-rule px-6 pt-4 pb-28 shadow-[0_18px_40px_-24px_rgb(19_74_61/0.45)] transition group-hover:-translate-y-0.5">
            <div className="num grid grid-cols-[1fr_auto] gap-y-[18px] pt-[6px] text-[15px] leading-[26px]">
              <span className="text-muted">모은 돈</span>
              <span className="text-right font-semibold">{man(ownCash(p))}</span>
              <span className="text-muted">대출</span>
              <span className="text-right font-semibold text-bank">+{man(plan?.loan.amount ?? 0)}</span>
              <span className="text-muted">세금·수수료</span>
              <span className="text-right font-semibold">−{man(plan?.costTotal ?? 0)}</span>
              <span className="font-bold">살 수 있는 집</span>
              <span className="text-right font-book text-[22px] font-extrabold">
                <span className="marker">{plan ? man(plan.price) : '없음'}</span>
              </span>
            </div>
          </div>
          <div className="absolute right-5 bottom-4">
            <Stamp ok={!!plan}>{plan ? <>계산<br />완료</> : <>현금<br />필요</>}</Stamp>
          </div>
        </a>
      </section>

      <section className="grid grid-cols-1 gap-10 border-t border-rule py-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-[20px] font-bold">계산기</h2>
          <ul className="mt-4 divide-y divide-rule">
            {TOOLS.map((t) => (
              <li key={t.title}>
                <a href={t.q ? `${href(t.id)}?q=${t.q}` : href(t.id)} className="group flex items-start justify-between gap-4 py-4">
                  <span>
                    <span className="block text-[17px] font-bold group-hover:text-bank">{t.title}</span>
                    <span className="mt-0.5 block text-[14px] leading-snug text-muted">{t.desc}</span>
                  </span>
                  <span className="mt-1 text-bank" aria-hidden>
                    ›
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[20px] font-bold">처음이라 놓치기 쉬운 것</h2>
          <ul className="mt-4 space-y-3">
            {MISSED.map((m) => (
              <li key={m} className="flex gap-2.5 text-[15px] leading-relaxed">
                <span className="mt-[9px] size-2 shrink-0 rounded-full bg-seal" aria-hidden />
                {m}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13px] leading-relaxed text-muted">
            입력한 내용은 이 기기 브라우저에만 저장되고 어디로도 보내지 않아요. 결과는 참고용이며 실제 한도와 금리는 은행 심사로 정해져요.
          </p>
        </div>
      </section>
    </div>
  )
}
