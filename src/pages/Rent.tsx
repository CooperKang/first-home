import { useState } from 'react'
import { ownCash } from '../calc/assets'
import { jeonseRisk, monthlyCost, rentFee, rentLoans, toMonthly, type RentInput } from '../calc/rent'
import { REGIONS, regionInfo } from '../calc/policy'
import Listings from '../components/Listings'
import { PolicyCheck } from '../components/LoanBreakdown'
import ProfileForm from '../components/ProfileForm'
import { Ledger, MoneyField, Note, NumberField, PageHead, Panel, Segmented, Stamp } from '../components/ui'
import { man, monthly, pct } from '../format'
import { setScenario, useLocal, useStore } from '../store'

const CHECKLIST = [
  ['계약 전', '등기부등본(인터넷등기소, 700원)에서 집주인 이름과 근저당·압류가 있는지 확인해요. 잔금 날 한 번 더 떼어 봐요.'],
  ['계약 전', '집주인의 국세·지방세 체납은 집주인 동의 없이도 세무서에서 열람할 수 있어요(미납국세 열람).'],
  ['계약 전', '안심전세 앱에서 시세와 악성 임대인 명단, 전세보증보험 가입 가능 여부를 먼저 봐요.'],
  ['계약할 때', '계약서는 등기부상 집주인 본인과 써요. 대리인이면 위임장과 인감증명서를 받아요.'],
  ['계약할 때', "특약에 '잔금 다음 날까지 근저당 설정 금지', '보증보험 가입이 안 되면 계약 무효'를 넣어요."],
  ['이사 날', '전입신고와 확정일자를 같은 날 받아요(정부24·주민센터). 다음 날 0시부터 대항력이 생겨요.'],
  ['이사 후', '전세보증보험(HUG·HF·SGI)에 가입해요. 청년·신혼은 보증료 지원이 있는 지자체가 많아요.'],
]

export default function Rent() {
  const { profile: p, scenario: s } = useStore()
  const [r, setR] = useLocal<RentInput & { kind: 'jeonse' | 'wolse'; conversionPct: number; loanId: string }>('rent', {
    kind: 'jeonse',
    deposit: 20000,
    monthlyRent: 0,
    salePrice: 28000,
    publicPrice: 19000,
    bankRatePct: 4,
    cashYieldPct: 3,
    conversionPct: 5.5,
    loanId: 'bank',
  })
  const [tab, setTab] = useState<'house' | 'me'>('house')
  const input: RentInput = { ...r, monthlyRent: r.kind === 'wolse' ? r.monthlyRent : 0 }

  const { loans } = rentLoans(p, s, input)
  const loan = loans.find((l) => l.id === r.loanId) ?? loans[0]
  const cost = monthlyCost(input, r.kind === 'jeonse' ? loan : null)
  const risk = jeonseRisk(input)
  const fee = rentFee(input)
  const needCash = cost.own + fee.fee
  const ok = ownCash(p) >= needCash
  const capital = regionInfo(s.region).capital
  const best = loans.reduce((a, b) => (b.monthlyInterest / Math.max(b.amount, 1) < a.monthlyInterest / Math.max(a.amount, 1) ? b : a))

  return (
    <>
      <PageHead
        title="전세·월세, 내 돈은 얼마나 들까"
        lead="보증금 중 얼마를 대출받을 수 있는지, 한 달에 실제로 나가는 돈이 얼마인지, 깡통전세 위험은 없는지 같이 확인해요."
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Segmented
            label="입력"
            value={tab}
            options={[
              { id: 'house', label: '보고 있는 집' },
              { id: 'me', label: '내 상황' },
            ]}
            onChange={setTab}
          />
          {tab === 'house' ? (
            <Panel title="보고 있는 집">
              <Segmented
                label="계약 형태"
                value={r.kind}
                options={[
                  { id: 'jeonse', label: '전세' },
                  { id: 'wolse', label: '월세(반전세)' },
                ]}
                onChange={(kind) => setR({ ...r, kind })}
              />
              <Segmented label="지역" value={s.region} options={REGIONS.map((x) => ({ id: x.id, label: x.label }))} onChange={(region) => setScenario({ region })} />
              <MoneyField label="보증금" value={r.deposit} onChange={(deposit) => setR({ ...r, deposit })} step={500} />
              {r.kind === 'wolse' && <MoneyField label="월세" value={r.monthlyRent} onChange={(monthlyRent) => setR({ ...r, monthlyRent })} step={5} />}
              <MoneyField label="같은 집 매매 시세" value={r.salePrice} onChange={(salePrice) => setR({ ...r, salePrice })} step={500} hint="호갱노노·KB부동산에서 같은 동·평형의 최근 거래가. 빌라는 시세가 부풀려진 경우가 많아요" />
              <MoneyField label="공시가격" value={r.publicPrice} onChange={(publicPrice) => setR({ ...r, publicPrice })} step={500} hint="부동산공시가격알리미(realtyprice.kr)에서 주소로 찾아요. 보증보험 기준이에요" />
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="은행 전세대출 금리" suffix="%" step={0.05} value={r.bankRatePct} onChange={(bankRatePct) => setR({ ...r, bankRatePct })} />
                <NumberField label="내 돈 예금 금리" suffix="%" step={0.1} value={r.cashYieldPct} onChange={(cashYieldPct) => setR({ ...r, cashYieldPct })} hint="보증금으로 묶이는 돈의 기회비용" />
              </div>
              <NumberField label="전월세 전환율" suffix="%" step={0.1} value={r.conversionPct} onChange={(conversionPct) => setR({ ...r, conversionPct })} hint="보증금 1억원을 월세로 바꿀 때 1년치 월세 비율. 동네 시세는 한국부동산원 통계에서 볼 수 있어요" />
            </Panel>
          ) : (
            <ProfileForm />
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel>
            {r.kind === 'jeonse' && (
              <Segmented label="전세대출" value={loan.id} options={loans.map((l) => ({ id: l.id, label: l.name }))} onChange={(loanId) => setR({ ...r, loanId })} hint={loan.note} />
            )}
            <div className="flex items-center justify-between gap-4 border-t border-rule pt-5">
              <div>
                <p className="text-[14px] text-muted">한 달에 실제로 나가는 돈</p>
                <p className="num font-book text-[34px] leading-tight font-extrabold">
                  <span className="marker">{monthly(cost.total)}</span>
                </p>
                <p className="num text-[14px] text-muted">
                  {r.kind === 'jeonse' ? `대출이자 ${monthly(cost.interest)}` : `월세 ${monthly(cost.rent)}`}, 묶인 내 돈의 이자 {monthly(cost.opportunity)}
                </p>
              </div>
              <Stamp ok={ok}>{ok ? <>입주<br />가능</> : <>현금<br />부족</>}</Stamp>
            </div>
            <Ledger
              start={ownCash(p)}
              rows={[
                ...(r.kind === 'jeonse' && cost.borrowed ? [{ label: loan.name, note: `연 ${loan.ratePct.toFixed(2)}%`, amount: cost.borrowed, kind: 'in' as const }] : []),
                { label: '보증금', amount: r.deposit, kind: 'out' },
                { label: '중개보수', note: `상한 ${(fee.rate * 100).toFixed(1)}%, 부가세 포함`, amount: fee.fee, kind: 'out' },
              ]}
            />
            {r.kind === 'jeonse' && (
              <p className="text-[14px] leading-relaxed">
                같은 집을 보증금 {man(Math.min(5000, r.deposit))} 월세로 바꾸면 전환율 {r.conversionPct}% 기준 월세는{' '}
                <b className="num">{monthly(toMonthly(r.deposit - Math.min(5000, r.deposit), r.conversionPct))}</b>쯤이에요. 지금 전세의 월 비용({monthly(cost.total)})과 비교해 보세요.
              </p>
            )}
            {best.id !== loan.id && r.kind === 'jeonse' && (
              <Note tone="bank" title={`${best.name}을 쓰면 이자가 더 적어요`}>
                연 {best.ratePct.toFixed(2)}%, 최대 {man(best.amount)}. 자격 조건을 아래에서 확인하세요.
              </Note>
            )}
          </Panel>

          <Panel title="깡통전세 점검">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-xl p-4 ${risk.level === 'danger' ? 'bg-seal-soft' : risk.level === 'caution' ? 'bg-mark/30' : 'bg-bank-soft'}`}>
                <p className="text-[13px] text-muted">전세가율(보증금 ÷ 매매 시세)</p>
                <p className="num text-[22px] font-bold">{risk.ratio === null ? '시세를 넣어 주세요' : pct(risk.ratio)}</p>
                <p className="text-[13px]">
                  {risk.level === 'danger' && '80% 이상이면 집값이 조금만 내려도 보증금을 못 돌려받을 수 있어요'}
                  {risk.level === 'caution' && '70~80%는 주의 구간이에요. 보증보험을 꼭 들어요'}
                  {risk.level === 'safe' && '70% 아래로 비교적 안전한 편이에요'}
                </p>
              </div>
              <div className={`rounded-xl p-4 ${risk.hugOk === false ? 'bg-seal-soft' : 'bg-bank-soft'}`}>
                <p className="text-[13px] text-muted">전세보증보험(HUG) 가입</p>
                <p className="num text-[22px] font-bold">{risk.hugOk === null ? '공시가격을 넣어 주세요' : risk.hugOk ? '가입 가능' : '가입 어려움'}</p>
                {risk.hugLimit !== null && <p className="num text-[13px]">보증금 {man(risk.hugLimit)}까지(공시가격 × 126%)</p>}
              </div>
            </div>
            {risk.hugOk === false && (
              <Note tone="seal" title="보증보험에 못 드는 집은 피하는 게 좋아요">
                공시가격의 126%를 넘는 보증금은 HUG 보증이 안 돼요. 은행 전세대출도 막힐 수 있어요.
              </Note>
            )}
          </Panel>

          <Panel title="계약 순서대로 챙길 것">
            <ol className="space-y-2.5">
              {CHECKLIST.map(([when, what], i) => (
                <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-3 text-[14px] leading-relaxed">
                  <span className="font-bold text-bank">{when}</span>
                  <span>{what}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="전세 정책 대출 자격">
            <PolicyCheck p={p} price={r.deposit} kind="rent" />
            {capital && <p className="text-[13px] text-muted">수도권은 6·27 대책 이후 보증 비율과 한도가 줄었어요. 실제 한도는 기금e든든 모의 계산으로 확인하세요.</p>}
            <Note tone="plain" title="집을 한 채 가지고 있으면 전세대출이 까다로워요">
              10·15 대책으로 수도권·규제지역 1주택자의 전세대출 이자는 DSR에 들어가고, 8·13 대책으로 실거주하지 않는 1주택자의 전세대출 보증도 막혔어요.
            </Note>
          </Panel>

          <Panel title="이 가격대 전월세 보기">
            <Listings region={s.region} price={r.deposit} kind={r.kind} monthlyRent={r.kind === 'wolse' ? r.monthlyRent : 0} />
          </Panel>
        </div>
      </div>
    </>
  )
}
