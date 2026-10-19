import type { Profile } from '../calc/afford'
import { BENEFIT_LIMIT, GIFT_BASE, GIFT_MARRIAGE, LEGAL_RATE, familyLoanRule, giftDeduction, householdGift, marriageGiftEligible } from '../calc/family'
import { firstMonthSplit } from '../calc/loan'
import { man, monthly } from '../format'
import { setProfile, useStore } from '../store'
import { Grid2, MoneyField, Note, NumberField, Panel } from './ui'

function why(p: Profile) {
  if (p.married === 'engaged') return '결혼 예정이라'
  if (p.newborn) return '2년 안에 아이를 낳아서'
  if (p.married === 'married' && p.marriageYears <= 2) return '혼인신고 2년 안이라'
  return null
}

// 가족 도움 입력: 증여받을 돈, 빌릴 돈
export function FamilyFields() {
  const { profile: p } = useStore()
  const set = (patch: Partial<Profile>) => setProfile((x) => ({ ...x, ...patch }))
  const dMe = giftDeduction(p, p.priorGift)
  const dSp = giftDeduction(p)
  const g = householdGift(p)
  const rule = familyLoanRule(p.familyLoan, p.familyRatePct)
  return (
    <Panel title="가족 도움(증여·차용)">
      <p className="text-[14px] leading-relaxed text-muted">
        부모님께 받거나 빌릴 돈이 있으면 넣어 주세요. 집 살 때 쓸 수 있는 돈에 더해서 계산해요.
      </p>
      <Grid2>
        <MoneyField label="내가 증여받을 돈" value={p.giftMe} onChange={(giftMe) => set({ giftMe })} step={500} hint={`세금 없이 ${man(dMe.total)}까지`} />
        <MoneyField label="최근 10년 안에 이미 받은 증여" value={p.priorGift} onChange={(priorGift) => set({ priorGift })} step={500} hint="기본 공제 5천만원에서 빠져요" />
        {p.spouse && <MoneyField label="배우자가 증여받을 돈" value={p.giftSpouse} onChange={(giftSpouse) => set({ giftSpouse })} step={500} hint={`세금 없이 ${man(dSp.total)}까지`} />}
      </Grid2>
      {g.tax > 0 && (
        <Note tone="seal" title={`공제를 넘어서 증여세 약 ${man(g.tax)}이 나와요`}>
          기한 안에 신고하면 3% 깎아 준 금액이에요. 공제 한도 안으로 줄이거나 넘는 금액은 빌리는 방법(차용)을 같이 생각해 보세요.
        </Note>
      )}
      <MoneyField label="가족에게 빌릴 돈(차용증)" value={p.familyLoan} onChange={(familyLoan) => set({ familyLoan })} step={500} />
      {p.familyLoan > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <NumberField label="이자율" suffix="%" step={0.1} value={p.familyRatePct} onChange={(familyRatePct) => set({ familyRatePct })} hint={rule.minRate ? `최소 ${rule.minRate.toFixed(2)}%` : '무이자도 돼요'} />
            <NumberField label="갚는 기간" suffix="년" value={p.familyYears} onChange={(familyYears) => set({ familyYears: Math.max(1, familyYears) })} />
          </div>
          {!rule.ok && (
            <Note tone="seal" title={`이자율을 ${rule.minRate.toFixed(2)}% 이상으로 정하세요`}>
              지금 이자율이면 덜 내는 이자가 1년에 {man(rule.benefit)}이라 1천만원을 넘어, 그 차이만큼 증여로 볼 수 있어요.
            </Note>
          )}
        </>
      )}
    </Panel>
  )
}

// 증여·차용 실전 안내. 입력한 금액으로 숫자를 계산해서 보여 준다.
export function FamilyGuide() {
  const { profile: p } = useStore()
  const eligible = marriageGiftEligible(p)
  const reason = why(p)
  const amount = p.familyLoan || 30000
  const rule = familyLoanRule(amount, p.familyLoan ? p.familyRatePct : 0)
  const rate = p.familyLoan ? Math.max(p.familyRatePct, rule.minRate) : rule.minRate
  const split = firstMonthSplit(amount, rate, p.familyLoan ? p.familyYears : 10, 'equal')
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[16px] font-bold">증여: 세금 없이 받을 수 있는 돈</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-paper p-4">
            <p className="text-[13px] text-muted">성인 자녀 기본 공제</p>
            <p className="num text-[20px] font-bold">{man(GIFT_BASE)}</p>
            <p className="text-[13px] leading-snug text-muted">부모님·조부모님께 받은 돈을 10년 동안 합쳐서 봐요. 아버지·어머니 각각이 아니라 둘을 합친 한도예요.</p>
          </div>
          <div className={`rounded-xl p-4 ${eligible ? 'bg-bank-soft' : 'bg-paper'}`}>
            <p className="text-[13px] text-muted">혼인·출산 공제</p>
            <p className="num text-[20px] font-bold">+{man(GIFT_MARRIAGE)}</p>
            <p className="text-[13px] leading-snug text-muted">
              혼인신고일 전후 2년 안, 또는 아이가 태어나고 2년 안에 받은 돈. 둘을 합쳐 평생 1억원이에요.
              {eligible ? <b className="text-bank"> {reason} 지금 받을 수 있어요.</b> : ' 지금 입력한 상황으로는 해당하지 않아요.'}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed">
          {eligible ? (
            <>
              나 <b className="num marker">{man(GIFT_BASE + GIFT_MARRIAGE)}</b>
              {p.spouse && (
                <>
                  , 배우자도 배우자 부모님께 <b className="num">{man(GIFT_BASE + GIFT_MARRIAGE)}</b>, 부부 합쳐 최대 <b className="num">{man((GIFT_BASE + GIFT_MARRIAGE) * 2)}</b>
                </>
              )}
              까지 증여세 없이 받을 수 있어요.
            </>
          ) : (
            <>
              지금은 1인당 <b className="num marker">{man(GIFT_BASE)}</b>까지 증여세 없이 받을 수 있어요. 결혼을 앞두고 있다면 혼인신고 전후 2년 안에 받으면 1억원이 더 늘어요.
            </>
          )}
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed marker:text-bank">
          <li>공제 안의 금액이어도 증여세 신고를 해 두세요. 증여받은 달의 말일부터 3개월 안에 홈택스에서 해요. 신고해 둬야 자금 출처를 증명하기 쉬워요.</li>
          <li>현금 대신 부모님 계좌에서 내 계좌로 이체해 받아요. 이체 메모에 '증여'라고 남겨 두면 좋아요.</li>
          <li>자금조달계획서의 '증여·상속' 칸에 적고, 신고서를 증빙으로 내요.</li>
          <li>조부모님께 받으면 세금이 30% 더 붙어요(공제 한도는 부모님과 합산).</li>
          <li>공제를 넘는 금액에는 1억원까지 10%, 5억원까지 20% 세금이 붙어요.</li>
        </ul>
      </div>

      <div className="border-t border-rule pt-5">
        <h3 className="text-[16px] font-bold">차용: 가족에게 빌리기</h3>
        <p className="mt-2 text-[15px] leading-relaxed">
          세법이 보는 적정 이자율은 연 <b>{LEGAL_RATE}%</b>예요. 이보다 덜 낸 이자가 1년에 <b>{man(BENEFIT_LIMIT)}</b>을 넘지 않으면 증여로 보지 않아서,{' '}
          <b className="num">{man(rule.freeLimit)}</b>까지는 무이자로 빌려도 돼요.
        </p>
        <div className="mt-3 rounded-xl bg-paper p-4">
          <p className="text-[13px] text-muted">{p.familyLoan ? '입력한 금액' : '예를 들어 3억원'}을 빌린다면</p>
          <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[13px] text-muted">최소 이자율</p>
              <p className="num text-[18px] font-bold">{rule.minRate ? `${rule.minRate.toFixed(2)}%` : '무이자 가능'}</p>
            </div>
            <div>
              <p className="text-[13px] text-muted">통장에 찍혀야 할 월 이자</p>
              <p className="num text-[18px] font-bold">{rule.minMonthly ? `${monthly(rule.minMonthly)} 이상` : '없음'}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[13px] text-muted">{p.familyLoan ? `${p.familyYears}년` : '10년'} 원리금균등으로 갚으면</p>
              <p className="num text-[18px] font-bold">월 {monthly(split.total)}</p>
              <p className="num text-[12px] text-muted">
                원금 {monthly(split.principal)} + 이자 {monthly(split.interest)}
              </p>
            </div>
          </div>
        </div>
        <ol className="mt-3 space-y-1.5 text-[14px] leading-relaxed">
          {[
            '차용증에 빌려준 사람·빌린 사람, 금액, 이자율, 이자 내는 날, 갚는 기간과 방법을 적고 둘 다 서명해요.',
            '작성한 날짜를 증명하도록 공증을 받거나 등기소·우체국 내용증명으로 확정일자를 받아 둬요.',
            '이자와 원금은 매달 정한 날에 계좌이체로 보내요. 이체 메모에 "차용금 이자 ○월"처럼 남겨요. 현금으로 주고받으면 증명이 안 돼요.',
            '무이자로 빌려도 원금은 조금씩 실제로 갚아야 해요. 국세청은 나중에 갚았는지 확인해요.',
            '내 소득으로 갚을 수 있는 금액이어야 해요. 갚을 능력보다 너무 크면 증여로 볼 수 있어요.',
            '자금조달계획서의 \'그 밖의 차입금\' 칸에 적고 차용증을 같이 내요.',
            '부모님이 받는 이자는 이자소득이라 원칙적으로 27.5% 원천징수 대상이에요. 금액이 크면 세무서나 세무사와 상담하세요.',
          ].map((t, i) => (
            <li key={i} className="grid grid-cols-[1.5rem_1fr]">
              <span className="num font-bold text-bank">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] text-muted">가족에게 빌린 돈은 은행 DSR에는 들어가지 않지만, 매달 갚는 돈은 생활비에서 나가요.</p>
      </div>
    </div>
  )
}

