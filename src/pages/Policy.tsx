import { buyerType, generalLoan, householdIncome } from '../calc/afford'
import { LTV, POLICY_AS_OF, REGIONS, SEOMIN, SOURCES, STRESS, regionInfo, stressRate } from '../calc/policy'
import { Note, PageHead, Panel } from '../components/ui'
import { man, pct } from '../format'
import { useStore } from '../store'

const TIMELINE = [
  {
    date: '2025.6.27',
    name: '6·27 가계부채 관리 강화',
    points: ['수도권·규제지역 주담대 최대 6억원', '수도권 생애최초 LTV 80% → 70%', '주담대 받으면 6개월 안에 전입', '수도권 주담대 만기 30년까지', '디딤돌·버팀목 등 정책 대출 한도 축소'],
  },
  {
    date: '2025.7.1',
    name: '스트레스 DSR 3단계',
    points: ['은행·2금융권 거의 모든 가계대출에 스트레스 금리 1.5%p', '지방 주담대는 2단계(0.75%p) 유예', '신용대출은 잔액 1억원 넘을 때만 적용'],
  },
  {
    date: '2025.9.7',
    name: '9·7 주택 공급 확대 방안',
    points: ['규제지역 무주택자 LTV 50% → 40%', '수도권·규제지역 1주택자 전세대출 2억원 한도'],
  },
  {
    date: '2025.10.15',
    name: '10·15 주택시장 안정화 대책',
    points: [
      '서울 25개 구 전체와 경기 12곳을 조정대상지역·투기과열지구·토지거래허가구역으로 지정',
      '주담대 한도: 15억 이하 6억, 15~25억 4억, 25억 초과 2억',
      '수도권·규제지역 주담대 스트레스 금리 하한 3.0%p',
      '1주택자 수도권·규제지역 전세대출 이자 DSR 반영',
    ],
  },
  {
    date: '2026.4.1',
    name: '2026년 가계부채 관리방안',
    points: ['가계대출 증가율 목표 1.5%', '정책 대출 비중 단계적 축소', '다주택자 수도권·규제지역 아파트 주담대 만기연장 원칙적 불허(4.17)'],
  },
  {
    date: '2026.6.30',
    name: '지방 주담대 스트레스 DSR 유예 연장',
    points: [`지방 주담대 2단계(0.75%p) 적용을 ${STRESS.localUntil}까지 유지`],
  },
  {
    date: '2026.8.13',
    name: '8·13 부동산 시장 안정 금융 종합대책',
    points: ['가계대출 증가율 목표 1.5% → 3.0% 수준', '이주비·중도금·잔금대출은 총량과 별도 관리', '실거주하지 않는 1주택자 전세대출 보증 제한', 'LTV·DSR·수도권 주담대 한도는 그대로'],
  },
  {
    date: '2026.9',
    name: '토지거래허가구역 실거주 유예 연장',
    points: ['세입자가 있는 집을 산 경우 실거주 의무 유예를 2027년 12월 31일까지 연장·확대'],
  },
]

// 타임라인은 항상 최신순으로 보여 준다. '2026.9'처럼 날짜가 없으면 그달 1일로 본다.
function dateKey(d: string) {
  const [y, m, day = 1] = d.split('.').map(Number)
  return y * 10000 + m * 100 + day
}
const LATEST_FIRST = [...TIMELINE].sort((a, b) => dateKey(b.date) - dateKey(a.date))

const WORDS = [
  ['LTV(담보인정비율)', '집값의 몇 %까지 빌려주는지. 10억 집에 LTV 40%면 4억원까지.'],
  ['DSR(총부채원리금상환비율)', '1년에 갚는 모든 대출의 원금 + 이자 ÷ 연소득. 은행은 40%까지.'],
  ['DTI(총부채상환비율)', '주담대 원리금 + 다른 대출 이자 ÷ 연소득. 정책 대출이 이 기준(60%)을 써요.'],
  ['스트레스 DSR', '앞으로 금리가 오를 수 있다고 보고, 실제 금리에 가산 금리를 더해 DSR을 계산하는 방식.'],
  ['장래소득', '만 20~34세 근로소득자의 앞으로 오를 소득을 미리 인정해 DSR 한도를 늘려 주는 제도.'],
  ['생애최초', '세대원 모두 지금까지 한 번도 집을 가진 적이 없는 경우. LTV·취득세·청약에서 혜택.'],
  ['서민·실수요자', `무주택 세대주, 부부합산 연소득 ${SEOMIN.income / 1000}천만원 이하, 규제지역 8억원 이하 주택이면 LTV 70%.`],
  ['토지거래허가구역', '집을 사기 전에 구청 허가를 받아야 하는 곳. 2년 실거주 의무가 있어 전세 끼고 사기가 막혀요.'],
  ['조정대상지역·투기과열지구', '대출·세금·청약 규제가 강한 지역. 지금은 서울 전역과 경기 12곳.'],
  ['잔금대출', '분양 아파트 입주 때 중도금 대출을 갚고 잔금을 내기 위해 받는 주담대.'],
  ['전세가율', '전세 보증금 ÷ 매매 시세. 80%를 넘으면 깡통전세 위험이 커요.'],
  ['대항력·확정일자', '전입신고 다음 날 0시부터 생기는 세입자 권리와 보증금 우선순위를 정하는 날짜 도장.'],
]

export default function Policy() {
  const { profile: p, scenario: s } = useStore()
  const r = regionInfo(s.region)
  const price = 70000
  const g = generalLoan(p, s, price)
  const type = buyerType(p, price, s.region)
  const typeLabel = { firstTime: '생애최초', seomin: '서민·실수요자', noHome: p.homeless ? '무주택자' : '유주택자' }[type]

  return (
    <>
      <PageHead
        title="지금 대출 규제, 나한테는 어떻게 적용될까"
        lead={`${POLICY_AS_OF} 기준으로 정리했어요. 정책은 자주 바뀌니, 계약 전에는 꼭 은행과 아래 공식 사이트에서 다시 확인하세요.`}
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel title="내 상황에 적용되는 규제">
            <p className="text-[14px] text-muted">
              {r.label}, {typeLabel}, 부부합산 소득 {man(householdIncome(p))} 기준. 7억원 집을 예로 들었어요.
            </p>
            <dl className="divide-y divide-rule/70 text-[15px]">
              {[
                ['지역 규제', r.regulated ? '조정대상지역·투기과열지구·토지거래허가구역' : r.capital ? '비규제 수도권' : '비규제 지방'],
                ['LTV', `${pct(g.ltv, 0)} (${typeLabel})`],
                ['주담대 총액 상한', Number.isFinite(g.cap) ? man(g.cap) : '없음'],
                ['스트레스 금리', `${stressRate(s.region, s.rateType, s.years)}%p (${s.rateType === 'fixed' ? '순수 고정형' : s.rateType === 'periodic' ? '주기형' : s.rateType === 'mixed' ? '혼합형' : '변동형'}, ${s.years}년)`],
                ['DSR 한도', s.lender === 'bank' ? '40%(은행)' : '50%(2금융권)'],
                ['장래소득', g.incomes.some((x) => x.rate > 0) ? `적용 가능(+${pct(Math.max(...g.incomes.map((x) => x.rate)))})` : '해당 없음'],
                ['전입 의무', r.capital || r.regulated ? '주담대 실행 후 6개월 안' : '없음(생애최초 취득세 감면은 3개월 안)'],
                ['실거주 의무', r.regulated ? '토지거래허가 후 2년' : '없음'],
                ['자금조달계획서', r.regulated ? '모든 거래' : '6억원 이상 거래'],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="지역별 LTV">
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="num w-full min-w-[400px] text-[14px]">
                <thead>
                  <tr className="border-b border-rule text-[12px] text-muted">
                    <th className="py-1.5 text-left font-semibold">구분</th>
                    <th className="py-1.5 text-right font-semibold">규제지역</th>
                    <th className="py-1.5 text-right font-semibold">비규제 수도권</th>
                    <th className="py-1.5 text-right font-semibold">비규제 지방</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['생애최초', 'firstTime'],
                      ['서민·실수요자', 'seomin'],
                      ['무주택자', 'noHome'],
                    ] as const
                  ).map(([label, k]) => (
                    <tr key={k} className={`border-b border-rule/60 ${k === type ? 'bg-mark/30 font-bold' : ''}`}>
                      <td className="py-2">{label}</td>
                      <td className="py-2 text-right">{pct(LTV.regulated[k], 0)}</td>
                      <td className="py-2 text-right">{pct(LTV.capital[k], 0)}</td>
                      <td className="py-2 text-right">{pct(LTV.local[k], 0)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-rule/60 text-muted">
                    <td className="py-2">다주택자</td>
                    <td className="py-2 text-right">0%</td>
                    <td className="py-2 text-right">0%</td>
                    <td className="py-2 text-right">60%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-muted">규제지역: {REGIONS.filter((x) => x.regulated).map((x) => x.label).join(', ')}</p>
          </Panel>

          <Panel title="단어 뜻">
            <dl className="space-y-3 text-[14px] leading-relaxed">
              {WORDS.map(([w, d]) => (
                <div key={w}>
                  <dt className="font-bold">{w}</dt>
                  <dd className="text-ink/80">{d}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="대출 규제가 바뀐 순서(최신순)">
            <ol className="relative space-y-5 border-l-2 border-bank/40 pl-5">
              {LATEST_FIRST.map((t, i) => (
                <li key={t.date} className="relative">
                  <span className={`absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-sheet bg-bank ${i === 0 ? 'pulse' : ''}`} aria-hidden />
                  <p className="num text-[13px] font-bold text-bank">
                    {t.date}
                    {i === 0 && <span className="ml-2 rounded bg-bank px-1.5 py-0.5 text-[11px] text-white">가장 최근</span>}
                  </p>
                  <p className="text-[16px] font-bold">{t.name}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[14px] leading-relaxed text-ink/80">
                    {t.points.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </Panel>
          <Note tone="seal" title="2026년 세제 개편안은 아직 국회 심의 중이에요">
            8월 3일 발표되고 9월 2일 정부안이 확정됐어요. 취득세·양도세 등이 바뀔 수 있으니, 잔금이 내년이라면 확정 내용을 다시 확인하세요.
          </Note>
          <Panel title="공식 출처">
            <ul className="grid gap-2 sm:grid-cols-2">
              {SOURCES.map((x) => (
                <li key={x.url}>
                  <a className="block rounded-xl border border-rule bg-white px-4 py-3 text-[14px] font-semibold hover:border-bank" href={x.url} target="_blank" rel="noreferrer">
                    {x.name}
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
