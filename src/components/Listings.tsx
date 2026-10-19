import { AREAS, HOUSE_TYPES, naverMapUrl, type HouseType } from '../calc/naver'
import { regionInfo, type Region } from '../calc/policy'
import { man } from '../format'
import { useLocal } from '../store'

type Kind = 'buy' | 'jeonse' | 'wolse'

const OTHER = (kind: Kind) => [
  { name: '호갱노노', desc: '단지별 실거래가 그래프와 주민 이야기', url: 'https://hogangnono.com/' },
  { name: '국토교통부 실거래가', desc: '실제 계약된 가격(공식)', url: 'https://rt.molit.go.kr/' },
  ...(kind === 'buy'
    ? [
        { name: 'KB부동산', desc: '은행이 대출 한도를 정할 때 보는 KB 시세', url: 'https://kbland.kr/' },
        { name: '청약홈', desc: '분양 일정과 청약 자격', url: 'https://www.applyhome.co.kr/' },
      ]
    : [
        { name: '직방', desc: '원룸·오피스텔·빌라 전월세', url: 'https://www.zigbang.com/' },
        { name: '안심전세 앱(HUG)', desc: '시세·악성 임대인·보증 가입 여부', url: 'https://www.khug.or.kr/' },
      ]),
]

const DEFAULT_TYPES: Record<Kind, HouseType[]> = { buy: ['apt'], jeonse: ['apt', 'villa', 'officetel'], wolse: ['oneroom', 'villa', 'officetel'] }

// 네이버 부동산 매물지도를 지역·유형·가격 조건을 넣은 채로 연다
export default function Listings({ region, price, kind = 'buy', monthlyRent = 0 }: { region: Region; price: number; kind?: Kind; monthlyRent?: number }) {
  const areas = AREAS[region]
  const [sel, setSel] = useLocal(`listings-${kind}`, { area: {} as Partial<Record<Region, string>>, types: DEFAULT_TYPES[kind], near: true })
  const area = areas.find((a) => a.name === sel.area[region]) ?? areas[0]
  const types = sel.types.length ? sel.types : DEFAULT_TYPES[kind]
  const min = sel.near ? Math.floor((price * 0.7) / 1000) * 1000 : 0
  const url = naverMapUrl({ trade: kind, types, area, max: price, min, monthlyMax: monthlyRent || undefined })
  const toggle = (id: HouseType) => setSel({ ...sel, types: types.includes(id) ? types.filter((t) => t !== id) : [...types, id] })
  const what = kind === 'buy' ? '매매가' : '보증금'

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`area-${kind}`} className="block text-[14px] font-semibold">
          {regionInfo(region).label}에서 볼 동네
        </label>
        <select
          id={`area-${kind}`}
          className="mt-1.5 h-12 w-full rounded-xl border border-rule bg-white px-3.5 text-[16px] font-semibold outline-none focus:border-bank focus:ring-2 focus:ring-bank/20"
          value={area.name}
          onChange={(e) => setSel({ ...sel, area: { ...sel.area, [region]: e.target.value } })}
        >
          {areas.map((a) => (
            <option key={a.name}>{a.name}</option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="text-[14px] font-semibold">집 종류</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {HOUSE_TYPES.filter((t) => (kind === 'buy' ? t.id !== 'oneroom' : t.id !== 'presale')).map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={types.includes(t.id)}
              onClick={() => toggle(t.id)}
              className="min-h-10 rounded-full border border-rule bg-white px-3.5 text-[14px] font-semibold text-muted aria-pressed:border-bank aria-pressed:bg-bank-soft aria-pressed:text-bank-deep"
            >
              {types.includes(t.id) ? '✓ ' : ''}
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-[14px] font-semibold">{what} 범위</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {[
            { near: true, label: `예산 근처(${man(min)}~${man(price)})` },
            { near: false, label: `${man(price)} 이하 전체` },
          ].map((o) => (
            <button
              key={String(o.near)}
              type="button"
              aria-pressed={sel.near === o.near}
              onClick={() => setSel({ ...sel, near: o.near })}
              className="min-h-10 rounded-full border border-rule bg-white px-3.5 text-[14px] font-semibold text-muted aria-pressed:border-bank aria-pressed:bg-bank aria-pressed:text-white"
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <a href={url} target="_blank" rel="noreferrer" className="flex min-h-13 items-center justify-between gap-3 rounded-xl bg-bank px-5 py-3 text-white hover:bg-bank-deep">
        <span>
          <span className="block text-[16px] font-bold">네이버 부동산에서 매물 보기</span>
          <span className="block text-[13px] text-white/80">
            {area.name}, {types.map((t) => HOUSE_TYPES.find((x) => x.id === t)!.label).join('·')}, {what} {sel.near ? `${man(min)}~` : ''}
            {man(price)}
            {kind === 'wolse' && monthlyRent ? `, 월세 ${man(monthlyRent)} 이하` : ''}
          </span>
        </span>
        <span aria-hidden className="text-[20px]">
          ↗
        </span>
      </a>
      <ul className="grid gap-2 sm:grid-cols-2">
        {OTHER(kind).map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noreferrer" className="flex h-full items-center justify-between gap-3 rounded-xl border border-rule bg-white px-4 py-3 hover:border-bank">
              <span className="min-w-0">
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
