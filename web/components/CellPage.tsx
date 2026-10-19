'use client'

import { useEffect, useState } from 'react'
import { getPublicCell, isValidPhone, keyFromPath, leaveContact, REMOTE, reportPage, type ReportReason } from '../lib/api'
import type { PublicCell } from '../lib/data'
import { maskPhone, weekly } from '../lib/format'
import { AlertIcon, CheckIcon } from './Icons'

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'error' } | { state: 'ok'; cell: PublicCell }

/** Página pública da célula: um cartão de visita. O que é interno da célula fica só no app. */
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
      <main id="conteudo" className="page narrow" aria-busy="true">
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
    <>
      <SiteBar />
      <main id="conteudo" className="page narrow">
        <header className="hero">
          <h1>{title}</h1>
          <p className="sub">{text}</p>
        </header>
        <GetApp />
      </main>
    </>
  )
}

/** Quem denunciou o logo ou a capa não vê mais a imagem neste navegador. */
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

/** Computador (duas colunas) ou celular (uma). A ordem do conteúdo muda de verdade, não só na tela, para o leitor de tela ler na mesma ordem. */
function useWide() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 900px)')
    const update = () => setWide(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return wide
}

function ActiveCell({ cell }: { cell: PublicCell }) {
  const wide = useWide()
  const [joinCode, setJoinCode] = useState<string | null>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [cover, setCover] = useState<string | null>(null)
  useEffect(() => setLogo(cell.logoUrl && !logoHiddenHere(cell.logoUrl) ? cell.logoUrl : null), [cell.logoUrl])
  useEffect(() => setCover(cell.coverUrl && !logoHiddenHere(cell.coverUrl) ? cell.coverUrl : null), [cell.coverUrl])
  const place = [cell.neighborhood, cell.city].filter(Boolean).join(', ')
  const join = joinCode ? <JoinNext code={joinCode} /> : <ContactForm code={cell.code} onDone={setJoinCode} />
  return (
    <>
      <SiteBar />
      <main id="conteudo" className="page">
        {/* Topo como um perfil (LinkedIn, Dribbble): capa larga e o logo por cima, no canto. */}
        <header className="profile">
          <div className={cover ? 'cover' : 'cover cover-empty'}>{cover ? <img src={cover} alt={`Capa da célula ${cell.name}`} /> : null}</div>
          <div className="profile-body">
            <div className="avatar" aria-hidden={logo ? undefined : true}>
              {logo ? <img src={logo} alt={`Logo da célula ${cell.name}`} /> : <span>{cell.name.trim().charAt(0).toUpperCase()}</span>}
            </div>
            <p className="eyebrow">Célula{cell.type ? ` · ${cell.type}` : ''}</p>
            <h1>{cell.name}</h1>
            {place ? <p className="sub">{place}</p> : null}
            {cell.schedule ? (
              <ul className="facts" aria-label="Quando se encontra">
                <li>{weekly(cell.schedule.day, cell.schedule.time)}</li>
              </ul>
            ) : null}
          </div>
        </header>

        <div className="layout">
          <div className="main-col">
            {cell.bio ? (
              <section className="panel" aria-labelledby="sobre">
                <h2 id="sobre">Sobre a célula</h2>
                <p className="pre" style={{ margin: 0 }}>
                  {cell.bio}
                </p>
              </section>
            ) : null}
            {/* No celular, o formulário vem logo depois do texto. No computador, fica na coluna da direita. */}
            {wide ? null : join}
            <HowToJoin />
          </div>
          {wide ? <aside className="side-col">{join}</aside> : null}
        </div>

        <footer>
          <p>Esta página mostra só o que o líder publicou. Endereço, roteiro e pedidos de oração ficam no app, para quem entra na célula.</p>
          <ReportForm
            code={cell.code}
            onReported={(reason) => {
              if (reason === 'logo' && cell.logoUrl) {
                hideLogoHere(cell.logoUrl)
                setLogo(null)
              }
              if (reason === 'capa' && cell.coverUrl) {
                hideLogoHere(cell.coverUrl)
                setCover(null)
              }
            }}
          />
          <p className="legal">
            <a href="https://www.acasa.app.br/termos">Termos de uso</a> · <a href="https://www.acasa.app.br/privacidade">Política de privacidade</a>
          </p>
        </footer>
      </main>
    </>
  )
}

/** Barra do topo igual à do site: a marca acasa e o link para conhecer o app. */
function SiteBar() {
  return (
    <div className="sitebar">
      <a className="brand" href="https://www.acasa.app.br" aria-label="acasa, ir para o site">
        acasa
      </a>
      <a className="btn small" href="https://www.acasa.app.br">
        Conheça o app
      </a>
    </div>
  )
}

function ContactForm({ code, onDone }: { code: string; onDone: (inviteCode: string) => void }) {
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
    if (!consent) return setError('Marque que aceita que o líder fale com você.')
    setSending(true)
    try {
      onDone((await leaveContact(code, name, digits)).inviteCode)
    } catch (err) {
      setError(err instanceof Error && /tentativas/i.test(err.message) ? 'Muitas tentativas hoje. Tente de novo amanhã.' : 'Não foi possível enviar. Tente de novo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="contato">
      <h2 id="contato">Quero participar</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Deixe seu nome e telefone para o líder. Em seguida você recebe o código para entrar na célula pelo app.
      </p>
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
          <span>Aceito que o líder da célula use meu nome e telefone para falar comigo sobre a célula.</span>
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn primary block" type="submit" disabled={sending}>
          {sending ? 'Enviando' : 'Enviar e receber o código'}
        </button>
      </form>
    </section>
  )
}

/** Depois do contato: o código para entrar pelo app. O resto da célula só aparece lá. */
function JoinNext({ code }: { code: string }) {
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)
  return (
    <section className="panel featured" aria-labelledby="enviado" aria-live="polite">
      <div className="success">
        <CheckIcon />
        <h2 id="enviado" style={{ margin: 0 }}>
          Contato enviado
        </h2>
      </div>
      <p style={{ marginTop: 12 }}>O líder recebeu seu nome e telefone. Para entrar na célula, baixe o acasa e use este código:</p>
      <p className="joincode" aria-label={`Código ${code.split('').join(' ')}`}>
        {code}
      </p>
      <button
        type="button"
        className="btn outline"
        onClick={() => {
          navigator.clipboard?.writeText(code).then(
            () => setCopied('yes'),
            () => setCopied('no'),
          ) ?? setCopied('no')
        }}
      >
        Copiar código
      </button>
      {copied ? (
        <p className="hint" role="status">
          {copied === 'yes' ? 'Código copiado.' : 'Não deu para copiar. Anote o código acima.'}
        </p>
      ) : null}
      <p className="muted" style={{ marginBottom: 0 }}>
        O endereço e o roteiro da reunião aparecem no app depois que o líder aprovar a sua entrada.
      </p>
    </section>
  )
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'capa', label: 'A capa é imprópria' },
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

function StoreButtons() {
  return (
    <>
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
    </>
  )
}

/** Como entrar na célula: pela página, depois pelo app. */
function HowToJoin() {
  return (
    <section className="panel" aria-labelledby="como">
      <h2 id="como">Como participar</h2>
      <ol className="steps">
        <li>Deixe seu nome e telefone nesta página. O líder recebe o seu contato.</li>
        <li>Baixe o acasa e entre na célula com o código que aparece depois do envio.</li>
        <li>O líder aprova a sua entrada. Aí você vê no app o endereço e o roteiro da reunião.</li>
      </ol>
      <p className="muted">No acasa você também confirma presença e lê a Bíblia com a célula. 7 dias grátis.</p>
      <StoreButtons />
    </section>
  )
}

function GetApp() {
  return (
    <section className="panel" aria-labelledby="app">
      <h2 id="app">Conheça o acasa</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Bíblia, oração e a sua célula no mesmo app. 7 dias grátis.
      </p>
      <StoreButtons />
    </section>
  )
}

/** Só para testes: a página de uma célula ativa, sem passar pelo banco. */
export const ActiveCellForTest = ActiveCell
