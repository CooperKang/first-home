// 입력한 상황을 보고 처음 집을 사는 사람이 놓치기 쉬운 것을 골라 준다
import { generalLoan, householdIncome, type Plan, type Profile, type Scenario } from './afford'
import { debtAnnualService, firstMonthPayment, firstMonthSplit, unitAnnualService } from './loan'
import { familyLoanRule, householdGift } from './family'
import { STRESS, futureIncomeRate, regionInfo } from './policy'
import { man, monthly, pct } from '../format'

export type Insight = { tone: 'seal' | 'bank' | 'plain'; title: string; body: string }

export function buyInsights(p: Profile, s: Scenario, plan: Plan | null): Insight[] {
  const out: Insight[] = []
  const r = regionInfo(s.region)
  const price = plan?.price ?? 0
  const g = generalLoan(p, s, price || 50000)

  // 스트레스 DSR
  if (g.stress > 0) {
    const noStress = generalLoan(p, { ...s, rateType: 'fixed' }, price || 50000)
    out.push({
      tone: 'seal',
      title: `은행은 금리 ${s.ratePct}%가 아니라 ${g.dsrRate.toFixed(2)}%로 한도를 계산해요`,
      body: `스트레스 DSR 3단계 때문에 ${r.capital || r.regulated ? '수도권·규제지역은 10·15 대책으로 최소 3.0%p' : `지방은 ${STRESS.localUntil}까지 ${STRESS.local}%p`}를 더한 금리로 상환액을 봐요. 이 때문에 DSR로 빌릴 수 있는 돈이 ${man(Math.max(0, noStress.dsrAmount - g.dsrAmount))} 줄었어요. 실제로 내는 이자는 원래 금리 기준이에요.`,
    })
  }
  if (s.rateType === 'mixed' || s.rateType === 'variable') {
    const periodic = generalLoan(p, { ...s, rateType: 'periodic' }, price || 50000)
    if (periodic.dsrAmount > g.dsrAmount + 100)
      out.push({
        tone: 'bank',
        title: `주기형(5년마다 금리 재산정)으로 고르면 DSR 한도가 ${man(periodic.dsrAmount - g.dsrAmount)} 늘어요`,
        body: `주기형은 10·15 대책의 3.0%p 하한을 받지 않아 스트레스 금리가 ${periodic.stress}%p만 붙어요. 은행별 주기형 금리를 같이 비교해 보세요.`,
      })
  }

  // 장래소득
  const people = [p.me, ...(s.coBorrow && p.spouse ? [p.spouse] : [])]
  const canFuture = people.filter((x) => x.job === 'employee' && futureIncomeRate(x.age, s.years) > 0)
  if (canFuture.length && !s.useFutureIncome) {
    out.push({
      tone: 'bank',
      title: '장래소득을 인정받으면 한도가 더 나와요',
      body: `만 20~34세 근로소득자는 앞으로 오를 소득을 미리 반영해 줘요(만 ${canFuture[0].age}세·만기 ${s.years}년이면 ${pct(futureIncomeRate(canFuture[0].age, s.years))}). 은행에 '장래소득 반영'을 꼭 요청하세요.`,
    })
  } else if (canFuture.length && s.useFutureIncome) {
    out.push({
      tone: 'plain',
      title: '장래소득은 은행이 선택해서 적용해요',
      body: '모든 은행·상품이 장래소득을 반영하지는 않아요. 상담할 때 반영 여부를 먼저 묻고, 반영 안 해 주면 다른 은행도 알아보세요.',
    })
  }
  if (p.me.age >= 35 && p.me.job === 'employee')
    out.push({ tone: 'plain', title: '만 35세부터는 장래소득 반영이 없어요', body: '지금 소득 그대로 DSR을 계산해요.' })

  // 배우자 소득
  if (p.spouse && !s.coBorrow)
    out.push({
      tone: 'bank',
      title: `배우자 소득 ${man(p.spouse.income)}을 합치면 한도가 커져요`,
      body: '부부가 함께 대출(공동 차주)을 받거나 배우자 소득을 합산하면 DSR 소득이 늘어요. 대신 배우자 대출도 같이 계산돼요.',
    })
  if (p.spouse && s.coBorrow)
    out.push({
      tone: 'plain',
      title: '부부 소득을 합치면 부부의 대출도 모두 들어가요',
      body: '배우자 명의 신용대출, 자동차 할부도 위 대출 목록에 넣어야 실제와 비슷해요.',
    })

  // 기존 대출
  const credit = p.debts.filter((d) => d.kind === 'credit' || d.kind === 'card')
  if (credit.length) {
    const annual = credit.reduce((a, d) => a + debtAnnualService(d), 0)
    const freed = annual / unitAnnualService(g.dsrRate, s.years, s.method)
    out.push({
      tone: 'seal',
      title: `신용대출·카드론을 갚으면 주담대를 ${man(freed)} 더 빌릴 수 있어요`,
      body: `신용대출은 잔액을 5년(카드론은 3년)에 나눠 갚는다고 보고 DSR에 넣어서, 잔액이 적어도 한도를 크게 깎아요. 대출 실행 전에 갚거나 줄이면 좋아요.`,
    })
  }
  if (p.debts.some((d) => d.kind === 'jeonse'))
    out.push({
      tone: 'seal',
      title: '집을 사면 지금 전세대출을 정리해야 할 수 있어요',
      body: '전세대출을 쓰는 중에 규제지역의 3억원 넘는 아파트를 사면 전세대출을 회수해요. 잔금일과 전세 만기를 맞춰 보세요.',
    })

  // 지역 규제
  if (r.regulated) {
    out.push({
      tone: 'seal',
      title: '토지거래허가구역이라 2년 동안 직접 살아야 해요',
      body: '서울 전역과 경기 12곳은 집을 사려면 구청 허가를 먼저 받아야 하고, 허가 후 2년 실거주 의무가 있어요. 세입자가 있는 집을 사서 나중에 들어가는 방식은 막혀 있고, 세입자 있는 집의 실거주 유예는 2027년 12월 31일까지 예외로만 인정돼요.',
    })
    out.push({
      tone: 'plain',
      title: '자금조달계획서와 증빙을 내야 해요',
      body: '규제지역에서는 집값과 상관없이 계약 후 30일 안에 자금조달계획서와 예금 잔고·증여 등 증빙을 내요. 부모님께 받은 돈은 증여세 신고까지 맞춰 두세요.',
    })
  }
  if (r.capital || r.regulated) {
    out.push({
      tone: 'seal',
      title: '수도권·규제지역 주담대는 6개월 안에 전입해야 해요',
      body: '6·27 대책 이후 수도권 주담대는 6개월 안에 이사해 들어가야 하고, 어기면 대출을 회수당해요. 만기도 최대 30년이에요.',
    })
    if (s.years > 30) out.push({ tone: 'seal', title: '수도권 주담대 만기는 30년까지만 돼요', body: '40년 만기로 계산하면 실제보다 한도가 크게 나와요.' })
  }
  if (price > 150000)
    out.push({
      tone: 'seal',
      title: '15억원을 넘으면 대출 상한이 4억원으로 떨어져요',
      body: '수도권·규제지역은 15억 이하 6억, 25억 이하 4억, 그 위는 2억까지만 빌려줘요.',
    })

  // 생애최초·무주택은 등본의 세대원 전원을 본다
  if (p.homeless) {
    out.push({
      tone: p.sharedHousehold ? 'seal' : 'plain',
      title: `${p.firstTime ? '생애최초·무주택' : '무주택'}은 주민등록등본의 세대원 전원으로 판단해요`,
      body: [
        '대출 신청일에 등본을 떼서 함께 올라 있는 세대원이 모두 무주택인지 봐요.',
        p.sharedHousehold ? '부모님 등 집이 있는 가족과 같은 등본이면 대출이 제한되니, 신청 전에 세대분리부터 하세요.' : '',
        '혼인신고한 배우자는 세대를 나눠도 포함돼서 배우자의 결혼 전 주택 이력도 봐요.',
        p.married === 'engaged' ? '혼인신고 전이라도 디딤돌처럼 결혼 예정자로 신청하는 대출은 예비 배우자 이력도 봐요.' : '',
        '세대분리 시점을 신청일로 보는지 실행일로 보는지는 은행마다 다르니 미리 물어보세요.',
      ]
        .filter(Boolean)
        .join(' '),
    })
  }

  // 생애최초·신혼·출산
  if (p.firstTime) {
    out.push({
      tone: 'bank',
      title: '생애최초는 취득세를 200만원까지 깎아 줘요',
      body: '12억원 이하 주택이면 받아요. 대신 3개월 안에 전입하고, 3년 안에 팔거나 세를 주면 감면받은 세금을 다시 내요.',
    })
  }
  if (p.married !== 'single' && p.marriageYears <= 7)
    out.push({
      tone: 'bank',
      title: '결혼 전후 부모님께 받는 돈은 1인당 1억 5천만원까지 증여세가 없어요',
      body: '혼인신고 전후 2년 안에 받으면 기본 공제 5천만원(10년 합산)에 혼인·출산 공제 1억원이 더해져요. 부부가 각자 받으면 최대 3억원이에요. 신고는 꼭 하세요.',
    })
  if (p.married === 'engaged')
    out.push({
      tone: 'plain',
      title: '혼인신고 시기에 따라 받을 수 있는 대출이 달라요',
      body: '혼인신고를 하면 배우자의 주택 보유 이력과 소득이 합쳐져요. 각자 생애최초·소득 기준을 먼저 따져 보고 시기를 정하세요.',
    })
  if (p.newborn)
    out.push({
      tone: 'bank',
      title: '출산 가구는 신생아 특례 대출과 취득세 감면을 확인하세요',
      body: '신생아 특례 디딤돌은 9억원 이하 주택, 연 1%대 금리부터 시작해요. 출산·양육 가구 취득세 감면(최대 500만원)도 같이 확인해 보세요.',
    })

  // 소득 형태
  if (p.me.job === 'self')
    out.push({
      tone: 'plain',
      title: '사업·프리랜서 소득은 종합소득세 신고 금액으로 봐요',
      body: '경비를 많이 넣어 신고 소득이 작으면 한도도 작아요. 신고 소득이 없으면 카드 사용액·건강보험료로 추정한 소득을 쓰는데 한도가 낮게 잡혀요.',
    })
  if (p.me.job === 'employee' && p.me.tenure < 1)
    out.push({
      tone: 'plain',
      title: '입사 1년이 안 됐으면 소득 증빙을 미리 챙기세요',
      body: '재직증명서와 급여 명세서로 연 소득을 환산해 주는 은행이 많지만, 장래소득 반영이나 우대금리는 제한될 수 있어요.',
    })

  // 금리 상승
  if (plan && !plan.loan.dsrExempt && plan.loan.amount > 0) {
    const now = firstMonthPayment(plan.loan.amount, s.ratePct, s.years, s.method)
    const up = firstMonthPayment(plan.loan.amount, s.ratePct + 2, s.years, s.method)
    const share = (up * 12) / householdIncome(p)
    out.push({
      tone: share > 0.4 ? 'seal' : 'plain',
      title: `금리가 2%p 오르면 매달 ${monthly(up - now)} 더 내요`,
      body: `월 ${monthly(now)} → ${monthly(up)}. 세전 소득의 ${pct(share)}가 원리금으로 나가요. 생활비와 저축을 빼고도 감당할 수 있는지 따져 보세요.`,
    })
  }

  // 가족 도움
  if (p.familyLoan) {
    const rule = familyLoanRule(p.familyLoan, p.familyRatePct)
    const fam = firstMonthSplit(p.familyLoan, p.familyRatePct, p.familyYears, 'equal')
    if (!rule.ok)
      out.push({
        tone: 'seal',
        title: `가족에게 빌린 ${man(p.familyLoan)}은 이자율을 ${rule.minRate.toFixed(2)}% 이상으로 정해야 해요`,
        body: `지금 이자율(${p.familyRatePct}%)이면 덜 내는 이자가 1년에 ${man(rule.benefit)}이라 증여로 볼 수 있어요. 매달 ${monthly(rule.minMonthly)} 이상 이자가 통장에서 나가야 해요.`,
      })
    const bank = plan && !plan.loan.dsrExempt ? firstMonthPayment(plan.loan.amount, s.ratePct, s.years, s.method) : (plan?.loan.monthly ?? 0)
    const share = ((bank + fam.total) * 12) / householdIncome(p)
    out.push({
      tone: share > 0.5 ? 'seal' : 'plain',
      title: `가족 차용까지 합치면 매달 ${monthly(bank + fam.total)}, 소득의 ${pct(share)}가 나가요`,
      body: '가족에게 빌린 돈은 은행 DSR에는 안 들어가서 한도는 그대로 나오지만, 실제로 갚는 돈은 늘어요. 갚는 기간을 늘리거나 빌리는 금액을 줄여 생활비가 남는지 확인하세요.',
    })
  }
  const gift = householdGift(p)
  if (gift.tax > 0)
    out.push({
      tone: 'seal',
      title: `증여세 약 ${man(gift.tax)}이 나와요`,
      body: '공제 한도를 넘었어요. 넘는 금액은 차용증을 쓰고 빌리는 방식이 세금 면에서 나을 수 있어요.',
    })

  out.push({
    tone: 'plain',
    title: '계약금은 대출이 안 나와요',
    body: '대출은 잔금일에 나와요. 계약할 때 집값의 10% 안팎을 현금으로 먼저 내고, 중도금이 있으면 그 돈도 따로 있어야 해요.',
  })
  out.push({
    tone: 'plain',
    title: '6월 1일에 집을 가진 사람이 그해 재산세를 내요',
    body: '잔금일을 6월 1일 뒤로 잡으면 그해 재산세는 파는 사람이 내요. 잔금일 협상 때 같이 이야기해 보세요.',
  })
  return out
}
