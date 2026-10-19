// 집을 살 때 집값 말고 더 드는 돈. 금액은 만원.
import { regionInfo, type Region } from './policy'

// 무주택자가 1주택을 사는 경우의 취득세(지방세법 제11조 1항 8호)
export function acquisitionTax(price: number, opts: { over85: boolean; firstTime: boolean }) {
  let rate: number
  if (price <= 60000) rate = 1
  else if (price <= 90000) rate = Math.round(((price / 10000) * (2 / 3) - 3) * 100) / 100
  else rate = 3
  const acq = (price * rate) / 100
  // 생애최초 구입 감면: 12억원 이하 주택, 취득세 200만원 한도
  const relief = opts.firstTime && price <= 120000 ? Math.min(acq, 200) : 0
  const edu = acq * 0.1
  const rural = opts.over85 ? price * 0.002 : 0
  return { rate, acq, relief, edu, rural, total: acq - relief + edu + rural }
}

// 중개보수 상한(공인중개사법 시행규칙 별표, 주택). VAT 별도.
const SALE_FEE: [number, number, number][] = [
  [5000, 0.006, 25],
  [20000, 0.005, 80],
  [90000, 0.004, Infinity],
  [120000, 0.005, Infinity],
  [150000, 0.006, Infinity],
  [Infinity, 0.007, Infinity],
]
const RENT_FEE: [number, number, number][] = [
  [5000, 0.005, 20],
  [10000, 0.004, 30],
  [60000, 0.003, Infinity],
  [120000, 0.004, Infinity],
  [150000, 0.005, Infinity],
  [Infinity, 0.006, Infinity],
]

export function brokerageFee(amount: number, kind: 'sale' | 'rent', vat = true) {
  const table = kind === 'sale' ? SALE_FEE : RENT_FEE
  const [, rate, cap] = table.find(([upto]) => amount < upto)!
  const fee = Math.min(amount * rate, cap)
  return { rate, fee: vat ? fee * 1.1 : fee }
}

// 월세의 거래금액 = 보증금 + 월세 × 100 (거래금액이 5천만원 미만이면 × 70)
export function rentDealAmount(deposit: number, monthly: number) {
  const a = deposit + monthly * 100
  return a < 5000 ? deposit + monthly * 70 : a
}

// 국민주택채권 매입 비율(주택, 시가표준액 기준). 서울·광역시와 그 밖의 지역이 다르다.
const BOND_TABLE: [number, number, number][] = [
  [5000, 0.013, 0.013],
  [10000, 0.019, 0.014],
  [16000, 0.021, 0.016],
  [26000, 0.023, 0.018],
  [60000, 0.026, 0.021],
  [Infinity, 0.031, 0.026],
]

// 공시가격은 시세의 약 69%(공동주택 현실화율), 채권은 사자마자 할인해 팔면 매입액의 약 6%를 부담한다고 가정
export const BOND_ASSUME = { publicPriceRatio: 0.69, discount: 0.06 }

export function bondCost(price: number, region: Region) {
  const std = price * BOND_ASSUME.publicPriceRatio
  if (std < 2000) return { buy: 0, cost: 0 }
  const big = region === 'seoul' || region === 'metro'
  const row = BOND_TABLE.find(([upto]) => std < upto)!
  const buy = std * (big ? row[1] : row[2])
  return { buy, cost: buy * BOND_ASSUME.discount }
}

// 인지세: 매매계약서(매수인 몫 절반)와 대출 약정서(고객 몫 절반)
function stamp(amount: number) {
  if (amount <= 1000) return 0
  if (amount <= 3000) return 2
  if (amount <= 5000) return 4
  if (amount <= 10000) return 7
  if (amount <= 100000) return 15
  return 35
}

export function stampDuty(price: number, loan: number) {
  return stamp(price) / 2 + stamp(loan) / 2
}

// 법무사 보수는 사무소마다 달라 평균적인 견적 수준으로 잡는다(부가세 포함)
export function legalFee(price: number) {
  return Math.min(30 + price * 0.0005, 120) * 1.1 + 1.5 // 등기신청 수수료 1.5만원
}

export type CostOptions = {
  region: Region
  over85: boolean
  firstTime: boolean
  loan: number
  moving: number // 이사·입주청소 등 직접 입력
}

export type CostLine = { key: string; label: string; amount: number; note: string }

export function purchaseCosts(price: number, o: CostOptions): CostLine[] {
  const tax = acquisitionTax(price, { over85: o.over85, firstTime: o.firstTime })
  const bond = bondCost(price, o.region)
  const fee = brokerageFee(price, 'sale')
  const lines: CostLine[] = [
    {
      key: 'acq',
      label: '취득세',
      amount: tax.acq - tax.relief,
      note: `세율 ${tax.rate}%${tax.relief ? `, 생애최초 감면 ${Math.round(tax.relief)}만원 반영` : ''}. 잔금일부터 60일 안에 내요`,
    },
    { key: 'edu', label: '지방교육세', amount: tax.edu, note: '취득세의 10%' },
  ]
  if (tax.rural) lines.push({ key: 'rural', label: '농어촌특별세', amount: tax.rural, note: '전용 85㎡ 초과라서 0.2%' })
  lines.push(
    { key: 'fee', label: '중개보수', amount: fee.fee, note: `상한 ${(fee.rate * 100).toFixed(1)}%, 부가세 포함. 협의해서 낮출 수 있어요` },
    { key: 'legal', label: '법무사 보수·등기 수수료', amount: legalFee(price), note: '사무소 견적에 따라 달라요' },
    { key: 'bond', label: '국민주택채권 할인 비용', amount: bond.cost, note: `채권 ${Math.round(bond.buy)}만원어치를 사서 바로 팔 때 손해 보는 금액(가정 ${BOND_ASSUME.discount * 100}%)` },
    { key: 'stamp', label: '인지세', amount: stampDuty(price, o.loan), note: '매매계약서와 대출 약정서에 붙는 세금' },
  )
  if (o.moving) lines.push({ key: 'moving', label: '이사·입주 비용', amount: o.moving, note: '직접 입력한 금액' })
  return lines
}

export function regionLabel(r: Region) {
  return regionInfo(r).label
}
