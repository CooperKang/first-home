import { ROUTES, href, useRoute, type Route } from './router'
import { RouteIcon } from './components/Icon'
import { POLICY_AS_OF } from './calc/policy'
import { resetAll } from './store'
import Home from './pages/Home'
import Buy from './pages/Buy'
import Future from './pages/Future'
import Rent from './pages/Rent'
import Presale from './pages/Presale'
import Policy from './pages/Policy'

const PAGES: Record<Route, () => React.JSX.Element> = {
  home: Home,
  buy: Buy,
  future: Future,
  rent: Rent,
  presale: Presale,
  policy: Policy,
}

export default function App() {
  const route = useRoute()
  const Page = PAGES[route]
  return (
    <div className="min-h-dvh pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-rule/80 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 md:h-16">
          <a href={href('home')} className="flex shrink-0 items-center gap-2.5" aria-label="첫 집 계산기 처음 화면">
            <Logo />
            <span className="font-book text-[17px] font-extrabold">첫 집 계산기</span>
          </a>
          <nav className="ml-auto hidden lg:block" aria-label="주 메뉴">
            <ul className="flex items-center gap-1">
              {ROUTES.slice(1).map((r) => (
                <li key={r.id}>
                  <a
                    href={href(r.id)}
                    aria-current={route === r.id ? 'page' : undefined}
                    className="rounded-full px-3 py-2 text-[14px] font-semibold text-muted transition hover:text-ink aria-[current=page]:bg-bank aria-[current=page]:text-white"
                  >
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a href="https://cooperkang.github.io/" className="ml-auto text-[13px] font-medium text-muted underline-offset-4 hover:underline lg:ml-2">
            서비스 허브
          </a>
        </div>
      </header>

      <main>
        <Page key={route} />
      </main>

      <footer className="mx-auto mt-16 flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 pb-10 text-[13px] text-muted">
        <span>
          만든 사람 <a className="underline underline-offset-4" href="https://github.com/CooperKang">JaeHa Kang</a>
        </span>
        <a className="underline underline-offset-4" href="https://github.com/CooperKang/first-home">소스 코드</a>
        <span>{POLICY_AS_OF} 규제 기준. 결과는 참고용이며 실제 대출은 금융회사 심사로 정해져요.</span>
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => {
            if (confirm('입력한 내용을 모두 지우고 처음 값으로 돌릴까요?')) resetAll()
          }}
        >
          입력 초기화
        </button>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-sheet/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="주 메뉴">
        <ul className="grid grid-cols-5">
          {ROUTES.slice(1).map((r) => (
            <li key={r.id}>
              <a
                href={href(r.id)}
                aria-current={route === r.id ? 'page' : undefined}
                className="flex h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted aria-[current=page]:text-bank"
              >
                <RouteIcon id={r.id} className="size-[22px]" />
                {r.short}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1F6F5C" />
      <path d="M7 15.5 16 8l9 7.5V25H7z" fill="#EEF3F1" />
      <circle cx="21.5" cy="21.5" r="5" fill="#D23B2F" />
      <path d="M19.4 21.6l1.5 1.5 2.8-3" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
