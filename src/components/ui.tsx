import { useId, type ReactNode } from 'react'
import { man } from '../format'

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
  min?: number
  max?: number
  readout?: (v: number) => string
}

export function NumberField({ label, value, onChange, suffix, hint, step = 1, min = 0, max, readout }: NumProps) {
  const id = useId()
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
          type="number"
          inputMode="decimal"
          className="num w-full min-w-0 bg-transparent text-[17px] font-semibold outline-none"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = e.target.value === '' ? 0 : Number(e.target.value)
            onChange(Number.isFinite(v) ? v : 0)
          }}
        />
        <span className="ml-2 shrink-0 text-[14px] text-muted">{suffix}</span>
      </div>
    </Field>
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

// 통장 거래내역처럼 들어오고 나가는 돈과 잔액을 한 줄씩 보여 준다
export type LedgerRow = { label: string; note?: string; amount: number; kind: 'in' | 'out' }

export function Ledger({ rows, start, startLabel = '내 현금' }: { rows: LedgerRow[]; start: number; startLabel?: string }) {
  const balances = rows.reduce<number[]>((acc, r) => [...acc, (acc.at(-1) ?? start) + (r.kind === 'in' ? r.amount : -r.amount)], [])
  return (
    <div className="overflow-hidden rounded-xl border border-rule">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-bank px-4 py-2 text-[12px] font-semibold text-white/85 sm:grid-cols-[1fr_7.5rem_7.5rem]">
        <span>적요</span>
        <span className="text-right">금액</span>
        <span className="text-right">잔액</span>
      </div>
      <ol className="ledger-lines pb-1">
        <li className="grid min-h-11 grid-cols-[1fr_auto_auto] items-center gap-x-3 px-4 sm:grid-cols-[1fr_7.5rem_7.5rem]">
          <span className="text-[14px] font-semibold">{startLabel}</span>
          <span />
          <span className="num text-right text-[14px] font-semibold">{man(start, '')}</span>
        </li>
        {rows.map((r, i) => {
          const balance = balances[i]
          return (
            <li key={i} className="grid min-h-11 grid-cols-[1fr_auto_auto] items-center gap-x-3 px-4 py-1.5 sm:grid-cols-[1fr_7.5rem_7.5rem]">
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">{r.label}</span>
                {r.note && <span className="block text-[12px] leading-snug text-muted">{r.note}</span>}
              </span>
              <span className={`num text-right text-[14px] ${r.kind === 'in' ? 'text-bank' : 'text-ink'}`}>
                {r.kind === 'in' ? '+' : '−'}
                {man(r.amount, '')}
              </span>
              <span className={`num text-right text-[14px] font-semibold ${balance < 0 ? 'text-seal' : ''}`}>{man(balance, '')}</span>
            </li>
          )
        })}
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
