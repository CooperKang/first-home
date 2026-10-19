import { regionInfo, type Region } from '../calc/policy'
import { man } from '../format'

// 지역별로 네이버 부동산에서 바로 검색할 동네 이름
const SEARCH: Record<Region, string> = {
  seoul: '서울',
  gyeonggiReg: '성남시 분당구',
  capital: '경기도',
  metro: '부산',
  local: '청주',
}

const SITES = (q: string, rent: boolean) => [
  { name: '네이버 부동산', desc: `'${q}' 매물 검색`, url: `https://m.land.naver.com/search/result/${encodeURIComponent(q)}` },
  { name: '호갱노노', desc: '단지별 실거래가 그래프와 주민 이야기', url: 'https://hogangnono.com/' },
  { name: '국토교통부 실거래가', desc: '실제 계약된 가격(공식)', url: 'https://rt.molit.go.kr/' },
  ...(rent
    ? [
        { name: '직방', desc: '원룸·오피스텔·빌라 전월세', url: 'https://www.zigbang.com/' },
        { name: '안심전세 앱(HUG)', desc: '시세·악성 임대인·보증 가입 여부 확인', url: 'https://www.khug.or.kr/' },
      ]
    : [
        { name: 'KB부동산', desc: '은행이 대출 한도를 정할 때 보는 KB 시세', url: 'https://kbland.kr/' },
        { name: '청약홈', desc: '분양 일정과 청약 자격', url: 'https://www.applyhome.co.kr/' },
      ]),
]

export default function Listings({ region, price, rent = false }: { region: Region; price: number; rent?: boolean }) {
  const q = SEARCH[region]
  return (
    <div>
      <p className="text-[15px] leading-relaxed">
        <b>{regionInfo(region).label}</b>에서 <b className="num">{man(price)}</b> 안팎의 {rent ? '전월세' : '매물'}을 찾아보세요. 네이버 부동산에서는 가격 필터를{' '}
        <b className="num">{man(price)}</b> 이하로 맞추면 돼요.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {SITES(q, rent).map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noreferrer" className="flex h-full items-center justify-between gap-3 rounded-xl border border-rule bg-white px-4 py-3 hover:border-bank">
              <span>
                <span className="block text-[15px] font-bold">{s.name}</span>
                <span className="block text-[13px] text-muted">{s.desc}</span>
              </span>
              <span aria-hidden className="text-bank">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
