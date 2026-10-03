'use client'

import { useEffect, useState } from 'react'
import { getPublicCell, isValidPhone, leaveContact, leavePrayer } from '../lib/api'
import type { PrivateAddress, PublicCell } from '../lib/data'
import { formatMeeting, maskPhone, weekly } from '../lib/format'
import { AlertIcon, CheckIcon } from './Icons'

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'ok'; cell: PublicCell }

/** Página pública da célula. Mostra só o bairro até a pessoa deixar nome e telefone. */
export function CellPage({ code }: { code: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  useEffect(() => {
    let alive = true
    getPublicCell(code).then((cell) => alive && setLoad(cell ? { state: 'ok', cell } : { state: 'missing' }))
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
  if (load.state === 'missing') return <Unavailable title="Este convite não vale mais" text="O link está errado ou a célula mudou de código. Peça um novo convite para quem te chamou." />
  const cell = load.cell
  if (cell.status === 'archived') return <Unavailable title={`${cell.name} não está mais se reunindo`} text="A célula foi arquivada pelo líder. Peça a quem te convidou o convite de outra célula." />
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

function ActiveCell({ cell }: { cell: PublicCell }) {
  const [address, setAddress] = useState<PrivateAddress | null>(null)
  return (
    <main id="conteudo" className="wrap">
      <header className="hero">
        {cell.coverUrl ? <img className="cover" src={cell.coverUrl} alt="" /> : null}
        <p className="label">Convite para a célula</p>
        <h1>{cell.name}</h1>
        <p className="sub">{[cell.churchName, `${cell.neighborhood}, ${cell.city}`].filter(Boolean).join(' · ')}</p>
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
            {`Bairro ${cell.neighborhood}. O endereço aparece quando você deixa seu nome e telefone.`}
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

function GetApp() {
  return (
    <section className="card" aria-labelledby="app">
      <h2 id="app">Acompanhe pelo app</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        No App Cristão você confirma presença, vê a escala, pede carona e lê a Bíblia com a célula. 7 dias grátis.
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
