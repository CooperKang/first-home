// 네이버 부동산 매물지도(fin.land.naver.com/map) 주소 만들기.
// 파라미터 이름과 코드, 좌표 인코딩은 네이버 부동산 화면 스크립트에서 확인했다(2026-10-19).
import type { Region } from './policy'

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

// 좌표 × 1e7 + 2e9 를 62진수로 쓴다(네이버의 decodeCoordBase62 반대)
export function encodeCoord(v: number) {
  let n = Math.round(v * 1e7 + 2e9)
  let s = ''
  while (n > 0) {
    s = BASE62[n % 62] + s
    n = Math.floor(n / 62)
  }
  return s
}

export const TRADE = { buy: 'A1', jeonse: 'B1', wolse: 'B2' } as const

export const HOUSE_TYPES = [
  { id: 'apt', label: '아파트', codes: ['A01'] },
  { id: 'presale', label: '분양권', codes: ['B01'] },
  { id: 'villa', label: '빌라·연립', codes: ['A05', 'A06', 'C02'] },
  { id: 'officetel', label: '오피스텔', codes: ['A02'] },
  { id: 'oneroom', label: '원룸', codes: ['C01'] },
] as const

export type HouseType = (typeof HOUSE_TYPES)[number]['id']

export type Area = { name: string; lng: number; lat: number }

// 지역별로 고를 수 있는 동네(지도 중심 좌표)
export const AREAS: Record<Region, Area[]> = {
  seoul: [
    { name: '강남구', lng: 127.0473, lat: 37.5172 },
    { name: '강동구', lng: 127.1238, lat: 37.5301 },
    { name: '강북구', lng: 127.0255, lat: 37.6396 },
    { name: '강서구', lng: 126.8495, lat: 37.5509 },
    { name: '관악구', lng: 126.9516, lat: 37.4784 },
    { name: '광진구', lng: 127.0823, lat: 37.5385 },
    { name: '구로구', lng: 126.8874, lat: 37.4955 },
    { name: '금천구', lng: 126.8956, lat: 37.4569 },
    { name: '노원구', lng: 127.0568, lat: 37.6542 },
    { name: '도봉구', lng: 127.0471, lat: 37.6688 },
    { name: '동대문구', lng: 127.0398, lat: 37.5744 },
    { name: '동작구', lng: 126.9393, lat: 37.5124 },
    { name: '마포구', lng: 126.9015, lat: 37.5663 },
    { name: '서대문구', lng: 126.9368, lat: 37.5791 },
    { name: '서초구', lng: 127.0327, lat: 37.4837 },
    { name: '성동구', lng: 127.0369, lat: 37.5633 },
    { name: '성북구', lng: 127.0167, lat: 37.5894 },
    { name: '송파구', lng: 127.1059, lat: 37.5145 },
    { name: '양천구', lng: 126.8665, lat: 37.517 },
    { name: '영등포구', lng: 126.8962, lat: 37.5264 },
    { name: '용산구', lng: 126.9905, lat: 37.5326 },
    { name: '은평구', lng: 126.9291, lat: 37.6027 },
    { name: '종로구', lng: 126.9792, lat: 37.5735 },
    { name: '중구', lng: 126.9977, lat: 37.5641 },
    { name: '중랑구', lng: 127.0928, lat: 37.6066 },
  ],
  gyeonggiReg: [
    { name: '과천시', lng: 126.9876, lat: 37.4292 },
    { name: '광명시', lng: 126.8644, lat: 37.4786 },
    { name: '성남 분당구', lng: 127.1189, lat: 37.3827 },
    { name: '성남 수정구', lng: 127.1374, lat: 37.4504 },
    { name: '성남 중원구', lng: 127.1628, lat: 37.4307 },
    { name: '수원 영통구', lng: 127.0566, lat: 37.2596 },
    { name: '수원 장안구', lng: 127.0105, lat: 37.3036 },
    { name: '수원 팔달구', lng: 127.0197, lat: 37.2828 },
    { name: '안양 동안구', lng: 126.9516, lat: 37.3925 },
    { name: '용인 수지구', lng: 127.0977, lat: 37.3221 },
    { name: '의왕시', lng: 126.9683, lat: 37.3448 },
    { name: '하남시', lng: 127.2148, lat: 37.5393 },
  ],
  capital: [
    { name: '인천 송도', lng: 126.6788, lat: 37.41 },
    { name: '인천 부평', lng: 126.7219, lat: 37.507 },
    { name: '인천 청라', lng: 126.6436, lat: 37.5361 },
    { name: '고양 일산', lng: 126.77, lat: 37.6584 },
    { name: '부천시', lng: 126.766, lat: 37.5035 },
    { name: '김포시', lng: 126.7156, lat: 37.6153 },
    { name: '화성 동탄', lng: 127.0739, lat: 37.2006 },
    { name: '용인 기흥구', lng: 127.115, lat: 37.2804 },
    { name: '평택시', lng: 127.1128, lat: 36.9921 },
    { name: '남양주시', lng: 127.2165, lat: 37.636 },
    { name: '의정부시', lng: 127.0337, lat: 37.7381 },
    { name: '시흥시', lng: 126.8031, lat: 37.38 },
    { name: '파주 운정', lng: 126.7464, lat: 37.7155 },
  ],
  metro: [
    { name: '부산 해운대구', lng: 129.1636, lat: 35.1631 },
    { name: '부산 동래구', lng: 129.0837, lat: 35.205 },
    { name: '대구 수성구', lng: 128.6306, lat: 35.8581 },
    { name: '대구 달서구', lng: 128.5327, lat: 35.8299 },
    { name: '대전 유성구', lng: 127.3563, lat: 36.3624 },
    { name: '대전 서구', lng: 127.3836, lat: 36.3554 },
    { name: '광주 광산구', lng: 126.7934, lat: 35.1395 },
    { name: '광주 서구', lng: 126.8899, lat: 35.152 },
    { name: '울산 남구', lng: 129.3301, lat: 35.5439 },
    { name: '세종시', lng: 127.289, lat: 36.48 },
  ],
  local: [
    { name: '청주시', lng: 127.489, lat: 36.6424 },
    { name: '천안시', lng: 127.1522, lat: 36.8151 },
    { name: '창원시', lng: 128.6811, lat: 35.2279 },
    { name: '전주시', lng: 127.148, lat: 35.8242 },
    { name: '포항시', lng: 129.3435, lat: 36.019 },
    { name: '원주시', lng: 127.9203, lat: 37.3422 },
    { name: '제주시', lng: 126.5312, lat: 33.4996 },
  ],
}

export type NaverQuery = {
  trade: keyof typeof TRADE
  types: HouseType[]
  area: Area
  max: number // 만원: 매매가 또는 보증금 상한
  min?: number // 만원
  monthlyMax?: number // 만원: 월세 상한
}

export function naverMapUrl(q: NaverQuery) {
  const won = (v: number) => Math.round(v * 10000)
  const range = `${won(q.min ?? 0)}-${won(q.max)}`
  const codes = HOUSE_TYPES.filter((t) => q.types.includes(t.id)).flatMap((t) => t.codes)
  const params = new URLSearchParams({ tradeTypes: TRADE[q.trade] })
  if (codes.length) params.set('realEstateTypes', codes.join('-'))
  params.set(q.trade === 'buy' ? 'dealPrice' : 'warrantyPrice', range)
  if (q.trade === 'wolse' && q.monthlyMax) params.set('rentPrice', `0-${won(q.monthlyMax)}`)
  params.set('center', `${encodeCoord(q.area.lng)}-${encodeCoord(q.area.lat)}`)
  params.set('zoom', '14')
  return `https://fin.land.naver.com/map?${params.toString()}`
}
