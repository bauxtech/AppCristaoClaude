import { router } from 'expo-router'
import { useState } from 'react'
import { Carousel, Cover, CoverEmpty, coverStyle, Segmented, useCarouselItemWidth } from '../../components'
import { useBible } from '../bible/BibleContext'
import { planState, type PlanDef } from '../bible/plans'
import { THEMES } from '../prayer/data'

/** "5 ou 10 min", "3, 5 ou 10 min". */
export function durationLabel(mins: number[]) {
  if (mins.length === 1) return `${mins[0]} min`
  return `${mins.slice(0, -1).join(', ')} ou ${mins[mins.length - 1]} min`
}

/** Tema de oração de hoje: gira pelos 5 temas, um por dia. */
export function themeOfDay(now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 0)
  const day = Math.floor((now.getTime() - start.getTime()) / 86400_000)
  return THEMES[day % THEMES.length]
}

export function PlanCover({ plan, width, mine }: { plan: PlanDef; width?: number; mine?: boolean }) {
  const { progress } = useBible()
  const started = !!progress[plan.id]
  const s = planState(plan, progress[plan.id])
  const st = coverStyle(plan.id)
  const info = !mine || !started ? `${plan.total} dias` : s.status === 'done' ? 'Concluído' : `Dia ${s.day} de ${s.total}`
  const label = `Plano ${plan.name}, ${!mine || !started ? `${plan.total} dias` : s.status === 'done' ? 'concluído' : `dia ${s.day} de ${s.total}`}`
  return (
    <Cover
      title={plan.name}
      tone={st.tone}
      graphic={st.graphic}
      info={info}
      progress={mine && started && s.status !== 'done' ? { value: s.done, max: s.total } : undefined}
      label={label}
      width={width}
      onPress={() => router.push(`/biblia/plano/${plan.id}`)}
    />
  )
}

/** Hoje: "Planos de leitura" com as abas Meus planos e Em destaque. */
export function ReadingPlansSection() {
  const { plans, progress } = useBible()
  const width = useCarouselItemWidth()
  const mine = plans.filter((p) => progress[p.id] || p.custom)
  const featured = plans.filter((p) => !p.custom)
  const [tab, setTab] = useState<'mine' | 'featured'>('mine')
  return (
    <Carousel
      title="Planos de leitura"
      onSeeAll={() => router.push('/biblia/planos')}
      seeAllHint="Abre todos os planos de leitura, na Bíblia"
      tabs={
        <Segmented
          label="Planos"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'mine', label: 'Meus planos' },
            { id: 'featured', label: 'Em destaque' },
          ]}
        />
      }
    >
      {tab === 'mine' ? (
        mine.length ? (
          mine.map((p) => <PlanCover key={p.id} plan={p} width={width} mine />)
        ) : (
          <CoverEmpty label="Escolher um plano" hint="Abre os planos de leitura" width={width} onPress={() => router.push('/biblia/planos')} />
        )
      ) : (
        featured.map((p) => <PlanCover key={p.id} plan={p} width={width} />)
      )}
    </Carousel>
  )
}

/** Hoje: "Momentos de oração". A primeira capa é a oração de hoje. */
export function PrayerMomentsSection({ seeAll = true }: { seeAll?: boolean }) {
  const width = useCarouselItemWidth()
  const today = themeOfDay()
  const ordered = [today, ...THEMES.filter((t) => t.id !== today.id)]
  return (
    <Carousel title="Momentos de oração" onSeeAll={seeAll ? () => router.push('/oracao') : undefined} seeAllHint="Abre o painel de oração">
      {ordered.map((t, i) => (
        <PrayerThemeCover key={t.id} theme={t} index={THEMES.indexOf(t)} today={i === 0} width={width} />
      ))}
    </Carousel>
  )
}

export function PrayerThemeCover({ theme, index, today, width }: { theme: (typeof THEMES)[number]; index: number; today?: boolean; width?: number }) {
  const dur = durationLabel(theme.durations)
  return (
    <Cover
      title={theme.label}
      tone={index}
      graphic={(['rays', 'arcs', 'waves'] as const)[index % 3]}
      tag={today ? 'Hoje' : undefined}
      info={dur}
      label={`Momento de oração ${theme.label}${today ? ', oração de hoje' : ''}, ${dur.replace('min', 'minutos')}`}
      width={width}
      onPress={() => router.push({ pathname: '/oracao/momento/[tema]', params: { tema: theme.id } })}
    />
  )
}
