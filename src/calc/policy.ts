// 계산에 쓰는 규제·세율 값. 금액 단위는 모두 만원이다.
// 정책이 바뀌면 이 파일만 고치면 되도록 숫자를 한곳에 모아 둔다.

export const POLICY_AS_OF = '2026년 10월 19일'

// 지역 구분. 10·15 대책(2025.10.16 시행)으로 서울 전역과 경기 12곳이
// 조정대상지역·투기과열지구·토지거래허가구역으로 묶였다.
export type Region = 'seoul' | 'gyeonggiReg' | 'capital' | 'metro' | 'local'

export const REGIONS: { id: Region; label: string; hint: string; regulated: boolean; capital: boolean }[] = [
  { id: 'seoul', label: '서울', hint: '25개 구 전체가 규제지역', regulated: true, capital: true },
  {
    id: 'gyeonggiReg',
    label: '경기 규제지역 12곳',
    hint: '과천, 광명, 성남(분당·수정·중원), 수원(영통·장안·팔달), 안양 동안, 용인 수지, 의왕, 하남',
    regulated: true,
    capital: true,
  },
  { id: 'capital', label: '그 밖의 수도권', hint: '경기의 나머지 지역, 인천', regulated: false, capital: true },
  { id: 'metro', label: '지방 광역시·세종', hint: '부산, 대구, 광주, 대전, 울산, 세종', regulated: false, capital: false },
  { id: 'local', label: '그 밖의 지방', hint: '도 지역', regulated: false, capital: false },
]

export function regionInfo(id: Region) {
  return REGIONS.find((r) => r.id === id)!
}

// LTV(담보인정비율). 규제지역은 10·15 대책, 수도권 생애최초 70%는 6·27 대책 기준.
export const LTV = {
  regulated: { noHome: 0.4, seomin: 0.7, firstTime: 0.7 },
  capital: { noHome: 0.7, seomin: 0.7, firstTime: 0.7 },
  local: { noHome: 0.7, seomin: 0.7, firstTime: 0.8 },
}

// 수도권·규제지역 주담대는 집값에 따라 총액 상한이 있다(10·15 대책)
export function mortgageCap(price: number, capitalOrRegulated: boolean) {
  if (!capitalOrRegulated) return Infinity
  if (price <= 150000) return 60000
  if (price <= 250000) return 40000
  return 20000
}

// 서민·실수요자 요건(규제지역 LTV 우대): 무주택 세대주, 부부합산 연소득 9천만원(생애최초 1억) 이하,
// 투기과열지구 9억·조정대상지역 8억 이하 주택. 서울·경기 12곳은 둘 다 지정되어 낮은 쪽인 8억을 쓴다.
export const SEOMIN = { income: 9000, incomeFirstTime: 10000, priceRegulated: 80000 }

// DSR 한도: 은행 40%, 2금융권 50%
export const DSR_LIMIT = { bank: 0.4, second: 0.5 }

// 스트레스 DSR 3단계(2025.7.1 시행). 기본 스트레스 금리 1.5%p.
// 수도권·규제지역 주담대는 10·15 대책으로 하한 3.0%p(변동형·혼합형).
// 지방 주담대는 2026.12.31까지 2단계(0.75%p)를 유지한다.
export const STRESS = {
  base: 1.5,
  capitalFloor: 3.0,
  local: 0.75,
  localUntil: '2026년 12월 31일',
}

export type RateType = 'variable' | 'mixed' | 'periodic' | 'fixed'

export const RATE_TYPES: { id: RateType; label: string; hint: string }[] = [
  { id: 'variable', label: '변동형', hint: '6개월마다 금리가 바뀌는 상품' },
  { id: 'mixed', label: '혼합형', hint: '처음 5년 고정 후 변동' },
  { id: 'periodic', label: '주기형', hint: '5년마다 금리가 다시 정해지는 상품' },
  { id: 'fixed', label: '순수 고정형', hint: '만기까지 금리가 같음(보금자리론 등)' },
]

// 고정(또는 변동주기) 기간이 만기에서 차지하는 비율 구간별 스트레스 금리(%p).
// 부동산계산기.com DSR 계산기의 표(2025.12.31 공시)를 그대로 옮겼다. 70% 이상은 미적용.
const MIXED_LOCAL = [0.45, 0.3, 0.15]
const PERIODIC_TABLE = { capital: [0.6, 0.45, 0.3], local: [0.23, 0.15, 0.08] }

function band(ratio: number) {
  if (ratio < 0.3) return 0
  if (ratio < 0.5) return 1
  if (ratio < 0.7) return 2
  return 3
}

// 본건 주담대에 붙는 스트레스 금리(%p)
export function stressRate(region: Region, rateType: RateType, years: number, fixedYears = 5) {
  const capital = regionInfo(region).capital || regionInfo(region).regulated
  if (rateType === 'fixed') return 0
  const b = band(fixedYears / years)
  if (rateType === 'variable') return capital ? STRESS.capitalFloor : STRESS.local
  if (rateType === 'mixed') {
    if (capital) return b === 3 ? 0 : STRESS.capitalFloor
    return b === 3 ? 0 : MIXED_LOCAL[b]
  }
  // 주기형은 10·15 하한 대상이 아니다
  if (b === 3) return 0
  return PERIODIC_TABLE[capital ? 'capital' : 'local'][b]
}

// 장래소득 인정 비율. 은행연합회 모범규준, 만 20~34세 근로소득자.
// 부동산계산기.com 장래소득 계산기 표(2024년 고용노동통계 기준)
export const FUTURE_INCOME: { ages: [number, number]; rates: Record<10 | 15 | 20 | 30, number> }[] = [
  { ages: [20, 24], rates: { 10: 0.206, 15: 0.311, 20: 0.397, 30: 0.507 } },
  { ages: [25, 29], rates: { 10: 0.168, 15: 0.235, 20: 0.284, 30: 0.316 } },
  { ages: [30, 34], rates: { 10: 0.13, 15: 0.166, 20: 0.184, 30: 0.135 } },
]

export function futureIncomeRate(age: number, years: number) {
  const row = FUTURE_INCOME.find((r) => age >= r.ages[0] && age <= r.ages[1])
  if (!row || years < 10) return 0
  const key = years >= 30 ? 30 : years >= 20 ? 20 : years >= 15 ? 15 : 10
  return row.rates[key]
}

// 정책 대출. 금리·한도는 자주 바뀌므로 화면에 '확인 필요'를 같이 띄운다.
export type PolicyLoan = {
  id: string
  name: string
  kind: 'buy' | 'rent'
  rate: [number, number]
  limit: number // 만원
  limitCapital?: number // 수도권 한도(6·27 대책으로 축소)
  priceMax?: number // 주택가격 상한
  depositMax?: number // 전세 보증금 상한
  incomeMax: number
  assetsMax?: number
  ltv?: number
  who: string
  dsrExempt?: boolean
  link: string
}

export const POLICY_LOANS: PolicyLoan[] = [
  {
    id: 'didimdol',
    name: '내집마련 디딤돌',
    kind: 'buy',
    rate: [2.85, 4.15],
    limit: 25000,
    priceMax: 50000,
    incomeMax: 6000,
    assetsMax: 51100,
    ltv: 0.7,
    who: '무주택 세대주, 부부합산 연소득 6천만원 이하, 5억원 이하 주택',
    dsrExempt: true,
    link: 'https://nhuf.molit.go.kr/',
  },
  {
    id: 'didimdolFirst',
    name: '디딤돌 생애최초',
    kind: 'buy',
    rate: [2.85, 4.15],
    limit: 30000,
    limitCapital: 24000,
    priceMax: 50000,
    incomeMax: 7000,
    assetsMax: 51100,
    ltv: 0.8,
    who: '생애최초 구입, 부부합산 연소득 7천만원 이하',
    dsrExempt: true,
    link: 'https://nhuf.molit.go.kr/',
  },
  {
    id: 'didimdolNewlywed',
    name: '디딤돌 신혼가구',
    kind: 'buy',
    rate: [2.55, 3.85],
    limit: 40000,
    limitCapital: 32000,
    priceMax: 60000,
    incomeMax: 8500,
    assetsMax: 51100,
    ltv: 0.8,
    who: '혼인 7년 이내(또는 3개월 안에 결혼 예정), 부부합산 8,500만원 이하, 6억원 이하 주택',
    dsrExempt: true,
    link: 'https://nhuf.molit.go.kr/',
  },
  {
    id: 'newborn',
    name: '신생아 특례 디딤돌',
    kind: 'buy',
    rate: [1.8, 4.5],
    limit: 50000,
    limitCapital: 40000,
    priceMax: 90000,
    incomeMax: 13000,
    assetsMax: 51100,
    ltv: 0.8,
    who: '대출 신청일 기준 2년 안에 아이를 낳은 무주택 가구, 9억원 이하 주택(맞벌이는 소득 기준 2억원까지 완화 발표)',
    dsrExempt: true,
    link: 'https://nhuf.molit.go.kr/',
  },
  {
    id: 'bogeumjari',
    name: '보금자리론',
    kind: 'buy',
    rate: [3.65, 3.95],
    limit: 36000,
    priceMax: 60000,
    incomeMax: 7000,
    ltv: 0.7,
    who: '부부합산 연소득 7천만원 이하(신혼 8,500만원), 6억원 이하 주택. 만기까지 고정금리',
    dsrExempt: true,
    link: 'https://www.hf.go.kr/',
  },
  {
    id: 'beotimmok',
    name: '버팀목 전세자금',
    kind: 'rent',
    rate: [2.5, 3.5],
    limit: 12000,
    depositMax: 30000,
    incomeMax: 5000,
    assetsMax: 33700,
    who: '무주택 세대주, 부부합산 연소득 5천만원 이하, 수도권 보증금 3억원 이하(지방 2억원)',
    link: 'https://nhuf.molit.go.kr/',
  },
  {
    id: 'youth',
    name: '청년전용 버팀목',
    kind: 'rent',
    rate: [2.2, 3.3],
    limit: 20000,
    depositMax: 30000,
    incomeMax: 5000,
    assetsMax: 33700,
    who: '만 19~34세 무주택 세대주(예비 세대주), 연소득 5천만원 이하',
    link: 'https://nhuf.molit.go.kr/',
  },
  {
    id: 'newlywedRent',
    name: '신혼부부 전용 전세자금',
    kind: 'rent',
    rate: [1.9, 3.3],
    limit: 25000,
    limitCapital: 25000,
    depositMax: 40000,
    incomeMax: 7500,
    assetsMax: 33700,
    who: '혼인 7년 이내, 부부합산 연소득 7,500만원 이하, 수도권 보증금 4억원 이하',
    link: 'https://nhuf.molit.go.kr/',
  },
]

// 공식 출처
export const SOURCES = [
  { name: '금융위원회 보도자료', url: 'https://www.fsc.go.kr/no010101' },
  { name: '주택도시기금(디딤돌·버팀목)', url: 'https://nhuf.molit.go.kr/' },
  { name: '한국주택금융공사(보금자리론)', url: 'https://www.hf.go.kr/' },
  { name: '청약홈', url: 'https://www.applyhome.co.kr/' },
  { name: '국토교통부 실거래가', url: 'https://rt.molit.go.kr/' },
  { name: '위택스(취득세)', url: 'https://www.wetax.go.kr/' },
  { name: '부동산계산기.com', url: 'https://xn--989a00af8jnslv3dba.com/' },
]
