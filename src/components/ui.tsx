import { useId, useState, type ReactNode } from 'react'
import { formatInput, man, parseInput } from '../format'

export function PageHead({ title, lead }: { title: string; lead: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-6 md:pt-12">
      <h1 className="font-book text-[30px] leading-tight font-extrabold tracking-[-0.01em] md:text-[40px]">{title}</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-muted">{lead}</p>
    </div>
  )
}

export function Panel({ title, children, aside }: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-rule bg-sheet p-5 md:p-6">
      {title && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-bold">{title}</h2>
          {aside}
        </div>
      )}
      <div className="space-y-5">{children}</div>
    </section>
  )
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[14px] font-semibold">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-[13px] leading-snug text-muted">{hint}</p>}
    </div>
  )
}

type NumProps = {
  label: string
  value: number
  onChange: (v: number) => void
  suffix: string
  hint?: ReactNode
  step?: number
  max?: number
  readout?: (v: number) => string
  slider?: Slider
}

// 금액이 큰 입력은 끌어서 맞출 수 있게 한다. marks는 눈금(예: DSR 한도) 위치.
export type Slider = { min: number; max: number; step: number; marks?: { value: number; label: string }[] }

// 입력 중인 글자를 그대로 들고 있다가 숫자로 바꿔 올려 보낸다.
// type="number"는 쉼표를 못 쓰고 '012999'처럼 앞자리 0이 남아서 글자 입력칸을 쓴다.
function toText(v: number, decimal: boolean) {
  return v ? formatInput(String(v), decimal) : ''
}

export function NumberField({ label, value, onChange, suffix, hint, step = 1, max, readout, slider }: NumProps) {
  const id = useId()
  const decimal = step < 1
  const [text, setText] = useState(() => toText(value, decimal))
  const [last, setLast] = useState(value)
  // 다른 곳(초기화, 예시 상황 고르기)에서 값이 바뀌면 입력칸도 맞춘다
  if (value !== last) {
    setLast(value)
    if (parseInput(text) !== value) setText(toText(value, decimal))
  }

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const raw = el.value
    const caret = el.selectionStart ?? raw.length
    const next = formatInput(raw, decimal)
    // 쉼표가 늘거나 줄어도 커서가 같은 숫자 뒤에 머물게 한다
    const keep = formatInput(raw.slice(0, caret), decimal).replace(/,/g, '').length
    setText(next)
    const v = parseInput(next)
    setLast(v)
    onChange(v)
    requestAnimationFrame(() => {
      let pos = 0
      for (let seen = 0; pos < next.length && seen < keep; pos++) if (next[pos] !== ',') seen++
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <Field
      label={label}
      htmlFor={id}
      hint={
        readout || hint ? (
          <>
            {readout && <span className="num font-semibold text-bank">{readout(value)}</span>}
            {readout && hint && ' · '}
            {hint}
          </>
        ) : undefined
      }
    >
      <div className="flex h-12 items-center rounded-xl border border-rule bg-white px-3.5 focus-within:border-bank focus-within:ring-2 focus-within:ring-bank/20">
        <input
          id={id}
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          placeholder="0"
          className="num w-full min-w-0 bg-transparent text-[17px] font-semibold outline-none placeholder:text-muted/50"
          value={text}
          onChange={change}
          onBlur={() => {
            if (max !== undefined && value > max) onChange(max)
            else setText(toText(value, decimal))
          }}
        />
        <span className="ml-2 shrink-0 text-[14px] text-muted">{suffix}</span>
      </div>
      {slider && <RangeSlider label={label} value={value} onChange={onChange} {...slider} />}
    </Field>
  )
}

function RangeSlider({ label, value, onChange, min, max, step, marks = [] }: Slider & { label: string; value: number; onChange: (v: number) => void }) {
  const at = (v: number) => `${((Math.min(Math.max(v, min), max) - min) / (max - min)) * 100}%`
  return (
    <div className="mt-3 px-1">
      <div className="relative">
        <input
          type="range"
          aria-label={`${label} 조절`}
          className="slider w-full"
          min={min}
          max={max}
          step={step}
          value={Math.min(Math.max(value, min), max)}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ '--fill': at(value) } as React.CSSProperties}
        />
        {marks
          .filter((m) => m.value >= min && m.value <= max)
          .map((m) => (
            <span
              key={m.label}
              className="pointer-events-none absolute top-[3px] h-[18px] w-0.5 -translate-x-1/2 bg-seal"
              style={{ left: at(m.value) }}
              aria-hidden
            />
          ))}
      </div>
      <div className="relative mt-1 h-4 text-[12px] text-muted">
        <span className="num absolute left-0">{man(min)}</span>
        {marks
          .filter((m) => m.value >= min && m.value <= max)
          .map((m) => (
            <span
              key={m.label}
              className="num absolute -translate-x-1/2 font-semibold whitespace-nowrap text-seal"
              style={{ left: `clamp(3rem, ${at(m.value)}, calc(100% - 3rem))` }}
            >
              {m.label}
            </span>
          ))}
        <span className="num absolute right-0">{man(max)}</span>
      </div>
    </div>
  )
}

export function MoneyField(props: Omit<NumProps, 'suffix' | 'readout'>) {
  return <NumberField {...props} suffix="만원" step={props.step ?? 100} readout={(v) => (v ? man(v) : '')} />
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
  hint?: ReactNode
}) {
  return (
    <fieldset>
      <legend className="text-[14px] font-semibold">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.id)}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className="min-h-10 rounded-full border border-rule bg-white px-3.5 text-[14px] font-semibold text-muted transition hover:border-bank/60 hover:text-ink aria-pressed:border-bank aria-pressed:bg-bank aria-pressed:text-white"
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-[13px] leading-snug text-muted">{hint}</p>}
    </fieldset>
  )
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-rule transition aria-checked:bg-bank"
      >
        <span className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{hint}</span>}
      </label>
    </div>
  )
}

// 놓치기 쉬운 것(seal), 유리한 것(bank), 그냥 알아둘 것(plain)
export function Note({ tone = 'plain', title, children }: { tone?: 'seal' | 'bank' | 'plain'; title: string; children?: ReactNode }) {
  const style = {
    seal: 'border-seal/35 bg-seal-soft/60',
    bank: 'border-bank/30 bg-bank-soft/70',
    plain: 'border-rule bg-white',
  }[tone]
  const dot = { seal: 'bg-seal', bank: 'bg-bank', plain: 'bg-muted' }[tone]
  return (
    <div className={`rounded-xl border p-4 ${style}`}>
      <p className="flex items-start gap-2 text-[15px] font-bold leading-snug">
        <span className={`mt-[7px] size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
        {title}
      </p>
      {children && <div className="mt-1.5 pl-4 text-[14px] leading-relaxed text-ink/80">{children}</div>}
    </div>
  )
}

// 통장 거래내역처럼 들어오고 나가는 돈과 잔액을 한 줄씩 보여 준다.
// 줄마다 메모 길이가 달라 높이는 내용에 맞추고, 휴대폰에서는 잔액을 금액 아래에 둔다.
export type LedgerRow = { label: string; note?: string; amount: number; kind: 'in' | 'out' }

function LedgerLine({ label, note, amount, balance }: { label: string; note?: string; amount: ReactNode; balance: number }) {
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug font-semibold">{label}</p>
        {note && <p className="mt-0.5 text-[12px] leading-snug text-muted">{note}</p>}
      </div>
      <div className="num w-[6.75rem] shrink-0 text-right text-[14px] leading-snug whitespace-nowrap sm:w-28">
        {amount}
        <p className={`text-[12px] text-muted sm:hidden ${balance < 0 ? 'text-seal' : ''}`}>잔액 {man(balance, '')}</p>
      </div>
      <p className={`num hidden w-28 shrink-0 text-right text-[14px] leading-snug font-semibold whitespace-nowrap sm:block ${balance < 0 ? 'text-seal' : ''}`}>
        {man(balance, '')}
      </p>
    </li>
  )
}

export function Ledger({ rows, start, startLabel = '내 현금' }: { rows: LedgerRow[]; start: number; startLabel?: string }) {
  const balances = rows.reduce<number[]>((acc, r) => [...acc, (acc.at(-1) ?? start) + (r.kind === 'in' ? r.amount : -r.amount)], [])
  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-sheet">
      <div className="flex gap-3 bg-bank px-4 py-2 text-[12px] font-semibold text-white/85">
        <span className="flex-1">적요</span>
        <span className="w-[6.75rem] text-right sm:w-28">
          금액<span className="sm:hidden"> / 잔액</span>
        </span>
        <span className="hidden w-28 text-right sm:block">잔액</span>
      </div>
      <ol className="divide-y divide-rule">
        <LedgerLine label={startLabel} amount={<span className="text-muted">–</span>} balance={start} />
        {rows.map((r, i) => (
          <LedgerLine
            key={i}
            label={r.label}
            note={r.note}
            balance={balances[i]}
            amount={
              <span className={r.kind === 'in' ? 'text-bank' : ''}>
                {r.kind === 'in' ? '+' : '−'}
                {man(r.amount, '')}
              </span>
            }
          />
        ))}
      </ol>
    </div>
  )
}

// 결과 위에 찍는 원형 도장
export function Stamp({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      key={String(ok)}
      className={`stamp inline-grid size-[86px] shrink-0 place-items-center rounded-full border-[3px] text-center font-book text-[17px] leading-tight font-extrabold ${
        ok ? 'border-bank text-bank' : 'border-seal text-seal'
      }`}
      style={{ boxShadow: 'inset 0 0 0 3px var(--color-sheet), inset 0 0 0 4.5px currentColor' }}
    >
      {children}
    </span>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="num mt-0.5 text-[20px] font-bold">{value}</p>
      {sub && <p className="text-[12px] text-muted">{sub}</p>}
    </div>
  )
}

export function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>
}
