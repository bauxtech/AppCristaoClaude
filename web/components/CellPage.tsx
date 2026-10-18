'use client'

import { useEffect, useState } from 'react'
import { getPublicCell, isValidPhone, keyFromPath, leaveContact, leavePrayer, REMOTE, reportPage, type ReportReason } from '../lib/api'
import type { PrivateAddress, PublicCell } from '../lib/data'
import { formatMeeting, maskPhone, weekly } from '../lib/format'
import { AlertIcon, CheckIcon } from './Icons'

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'error' } | { state: 'ok'; cell: PublicCell }

/** Página pública da célula. Mostra só o bairro até a pessoa deixar nome e telefone. */
export function CellPage({ code }: { code: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  useEffect(() => {
    let alive = true
    // Com o banco, a página é uma só para todos os endereços: a célula vem do endereço aberto.
    // Endereço fora do formato: não procura nada e mostra que o convite não vale.
    const real = REMOTE ? keyFromPath(window.location.pathname) : code
    if (!real) {
      setLoad({ state: 'missing' })
      return
    }
    getPublicCell(real)
      .then((cell) => {
        if (!alive) return
        // Endereço antigo ou link /c/<código>: a barra do navegador passa a mostrar o endereço atual da célula.
        // Sem a barra no fim, como o site acasa.app.br usa.
        if (cell?.slug && REMOTE && window.location.pathname.replace(/\/$/, '') !== `/celulas/${cell.slug}`) {
          window.history.replaceState(null, '', `/celulas/${cell.slug}`)
        }
        setLoad(cell ? { state: 'ok', cell } : { state: 'missing' })
      })
      .catch(() => alive && setLoad({ state: 'error' }))
    return () => {
      alive = false
    }
  }, [code])

  if (load.state === 'loading') {
    return (
      <main id="conteudo" className="wrap" aria-busy="true">
        <p className="muted" role="status" style={{ paddingTop: 48 }}>
          Carregando a célula
        </p>
      </main>
    )
  }
  if (load.state === 'error') return <Unavailable title="Não foi possível abrir o convite" text="Confira a internet e abra o link de novo." />
  if (load.state === 'missing') return <Unavailable title="Este convite não vale mais" text="O link está errado ou a célula mudou de código. Peça um novo convite para quem te chamou." />
  const cell = load.cell
  if (cell.status === 'archived') return <Unavailable title={`${cell.name} não está mais se reunindo`} text="A célula foi arquivada pelo líder. Peça a quem te convidou o convite de outra célula." />
  if (cell.status === 'paused') return <Unavailable title={`${cell.name} está com as reuniões paradas`} text="Por enquanto, a célula não recebe novos contatos pela página. Fale com quem te convidou para saber quando volta." />
  return <ActiveCell cell={cell} />
}

function Unavailable({ title, text }: { title: string; text: string }) {
  return (
    <main id="conteudo" className="wrap">
      <header className="hero">
        <h1>{title}</h1>
        <p className="sub">{text}</p>
      </header>
      <GetApp />
    </main>
  )
}

/** Quem denunciou o logo não vê mais o logo neste navegador. */
const HIDDEN_LOGO_KEY = 'acasa-logo-denunciado'

function logoHiddenHere(url: string) {
  try {
    return (JSON.parse(localStorage.getItem(HIDDEN_LOGO_KEY) ?? '[]') as string[]).includes(url)
  } catch {
    return false
  }
}

function hideLogoHere(url: string) {
  try {
    const list = JSON.parse(localStorage.getItem(HIDDEN_LOGO_KEY) ?? '[]') as string[]
    localStorage.setItem(HIDDEN_LOGO_KEY, JSON.stringify([...list, url].slice(-50)))
  } catch {
    // Sem armazenamento no navegador: o logo some só até recarregar.
  }
}

function ActiveCell({ cell }: { cell: PublicCell }) {
  const [address, setAddress] = useState<PrivateAddress | null>(null)
  const [logo, setLogo] = useState<string | null>(null)
  useEffect(() => setLogo(cell.logoUrl && !logoHiddenHere(cell.logoUrl) ? cell.logoUrl : null), [cell.logoUrl])
  return (
    <main id="conteudo" className="wrap">
      <header className="hero">
        {cell.coverUrl ? <img className="cover" src={cell.coverUrl} alt="" /> : null}
        {logo ? <img className="logo" src={logo} alt={`Logo da célula ${cell.name}`} width={72} height={72} /> : null}
        <p className="label">Convite para a célula</p>
        <h1>{cell.name}</h1>
        {/* Bairro e cidade só quando o líder preencheu: sem eles, a linha some em vez de mostrar uma vírgula solta. */}
        {[cell.churchName, [cell.neighborhood, cell.city].filter(Boolean).join(', ')].filter(Boolean).length ? (
          <p className="sub">{[cell.churchName, [cell.neighborhood, cell.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
        ) : null}
        <ul className="tags" aria-label="Sobre a célula">
          <li className="tag">{weekly(cell.day, cell.time)}</li>
          {cell.type ? <li className="tag">{cell.type}</li> : null}
          <li className="tag">{`Líder: ${cell.leaderFirstName}`}</li>
        </ul>
      </header>

      <section className="card featured" aria-labelledby="proxima">
        <h2 id="proxima" className="label">
          Próxima reunião
        </h2>
        <p style={{ fontWeight: 700, fontSize: '1.0625rem', margin: '0 0 4px' }}>{cell.nextMeeting ? formatMeeting(cell.nextMeeting.date, cell.nextMeeting.time) : 'Sem reunião marcada'}</p>
        {address ? (
          <>
            <p style={{ margin: 0 }}>{address.address}</p>
            {address.reference ? <p className="muted" style={{ margin: 0 }}>{address.reference}</p> : null}
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            {cell.neighborhood ? `Bairro ${cell.neighborhood}. O endereço aparece quando você deixa seu nome e telefone.` : 'O endereço aparece quando você deixa seu nome e telefone.'}
          </p>
        )}
      </section>

      {address ? null : <ContactForm code={cell.code} leader={cell.leaderFirstName} onDone={setAddress} />}

      <section className="card" aria-labelledby="roteiro">
        <h2 id="roteiro">Roteiro da semana</h2>
        {cell.plan ? (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>{[cell.plan.title, cell.plan.ref].filter(Boolean).join(' · ')}</p>
            {cell.plan.sections.map((s) => (
              <div key={s.title}>
                <div className="section-head">
                  <h3 className="label" style={{ margin: 0 }}>
                    {s.title}
                  </h3>
                  <span className="pill">{`${s.minutes} min`}</span>
                </div>
                <p className="pre" style={{ margin: '4px 0 0' }}>
                  {s.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            O líder ainda não publicou o roteiro desta semana.
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="materiais">
        <h2 id="materiais">Materiais</h2>
        {cell.materials.length ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {cell.materials.map((m) => (
              <li key={m.name} className="material">
                <span>
                  {m.name}
                  <span className="hint">{` · ${m.kind}, ${m.size}`}</span>
                </span>
                <a className="btn outline" href={m.url} download aria-label={`Baixar ${m.name}`}>
                  Baixar
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Nenhum material publicado.
          </p>
        )}
      </section>

      <PrayerForm code={cell.code} leader={cell.leaderFirstName} />
      <GetApp />
      <footer>
        <p>Esta página mostra só o que o líder publicou. Os pedidos de oração vão só para o líder.</p>
        <ReportForm
          code={cell.code}
          onReported={(reason) => {
            if (reason === 'logo' && cell.logoUrl) {
              hideLogoHere(cell.logoUrl)
              setLogo(null)
            }
          }}
        />
      </footer>
    </main>
  )
}

function ContactForm({ code, leader, onDone }: { code: string; leader: string; onDone: (a: PrivateAddress) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const digits = phone.replace(/\D/g, '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) return setError('Digite seu nome.')
    if (!isValidPhone(digits)) return setError('Digite o telefone com DDD, só números.')
    if (!consent) return setError(`Marque que aceita que ${leader} fale com você.`)
    setSending(true)
    try {
      onDone(await leaveContact(code, name, digits))
    } catch {
      setError('Não foi possível enviar. Tente de novo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="card" aria-labelledby="contato">
      <h2 id="contato">Quero participar</h2>
      <p className="muted" style={{ marginTop: 0 }}>{`Deixe seu nome e telefone para ${leader}. Depois disso, o endereço completo aparece aqui.`}</p>
      <form onSubmit={submit} noValidate>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
        </label>
        <label>
          Telefone com DDD
          <input value={maskPhone(phone)} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" />
          <span className="hint">Só o líder vê seu telefone.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{`Aceito que ${leader} use meu nome e telefone para falar comigo sobre a célula.`}</span>
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary block" type="submit" disabled={sending}>
          {sending ? 'Enviando' : 'Enviar e ver o endereço'}
        </button>
      </form>
    </section>
  )
}

function PrayerForm({ code, leader }: { code: string; leader: string }) {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (sent) {
    return (
      <section className="card" aria-live="polite">
        <div className="success">
          <CheckIcon />
          <div>
            <h2 style={{ marginBottom: 4 }}>Pedido enviado</h2>
            <p className="muted" style={{ margin: 0 }}>{`${leader} recebeu seu pedido e vai orar por você. Ele não aparece nesta página.`}</p>
          </div>
        </div>
        <button className="btn outline" type="button" style={{ marginTop: 16 }} onClick={() => (setSent(false), setText(''))}>
          Enviar outro pedido
        </button>
      </section>
    )
  }

  return (
    <section className="card" aria-labelledby="pedido">
      <h2 id="pedido">Deixar um pedido de oração</h2>
      <p className="muted" style={{ marginTop: 0 }}>{`Vai só para ${leader}. Não aparece na página.`}</p>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault()
          if (!text.trim()) return setError('Escreva o seu pedido.')
          if (!consent) return setError(`Marque que autoriza enviar o pedido para ${leader}.`)
          try {
            await leavePrayer(code, text, name || undefined)
            setSent(true)
            setError(null)
          } catch {
            setError('Não foi possível enviar. Tente de novo.')
          }
        }}
      >
        <label>
          Seu pedido
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        </label>
        <label>
          Seu nome (opcional)
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
        </label>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{`Autorizo enviar este pedido de oração para ${leader}. Pedido de oração é dado sensível e só o líder recebe.`}</span>
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary block" type="submit">
          Enviar pedido
        </button>
      </form>
    </section>
  )
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'logo', label: 'O logo é impróprio' },
  { value: 'nome', label: 'O nome ou o endereço da página é impróprio' },
  { value: 'outro', label: 'Outro motivo' },
]

/** Denúncia: vai para a equipe do acasa. O logo denunciado some na hora para quem denunciou. */
function ReportForm({ code, onReported }: { code: string; onReported: (reason: ReportReason) => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('logo')
  const [detail, setDetail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  if (state === 'sent') {
    return (
      <p role="status">
        <CheckIcon /> Denúncia enviada para a equipe do acasa. Obrigado.
      </p>
    )
  }
  if (!open) {
    return (
      <button type="button" className="link" onClick={() => setOpen(true)}>
        Denunciar esta página
      </button>
    )
  }
  return (
    <form
      className="report"
      aria-labelledby="denunciar"
      onSubmit={async (e) => {
        e.preventDefault()
        setState('sending')
        try {
          await reportPage(code, reason, detail)
          onReported(reason)
          setState('sent')
        } catch {
          setState('error')
        }
      }}
    >
      <h2 id="denunciar">Denunciar esta página</h2>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend className="muted">O que está errado?</legend>
        {REASONS.map((r) => (
          <label key={r.value} className="check">
            <input type="radio" name="motivo" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
            <span>{r.label}</span>
          </label>
        ))}
      </fieldset>
      <label>
        Detalhes (opcional)
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={500} rows={3} />
      </label>
      {state === 'error' ? (
        <p role="alert" className="error">
          Não foi possível enviar. Confira a internet e tente de novo.
        </p>
      ) : null}
      <button className="btn outline block" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Enviando' : 'Enviar denúncia'}
      </button>
    </form>
  )
}

function GetApp() {
  return (
    <section className="card" aria-labelledby="app">
      <h2 id="app">Acompanhe pelo app</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        No acasa você confirma presença, vê a escala, pede carona e lê a Bíblia com a célula. 7 dias grátis.
      </p>
      <div className="row">
        <span className="btn outline" aria-disabled="true">
          App Store: em breve
        </span>
        <span className="btn outline" aria-disabled="true">
          Google Play: em breve
        </span>
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        <AlertIcon /> O app ainda não está nas lojas.
      </p>
    </section>
  )
}

/** Só para testes: a página de uma célula ativa, sem passar pelo banco. */
export const ActiveCellForTest = ActiveCell
