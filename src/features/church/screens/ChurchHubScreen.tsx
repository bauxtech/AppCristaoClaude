import { router } from 'expo-router'
import { Linking, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Button, Card, IconButton, MIN_TOUCH, SectionLabel, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { TileGrid } from '../../cell/screens/parts'
import { useSermons } from '../../sermon/SermonContext'
import { useChurch } from '../ChurchContext'
import { ACCESS_ITEMS, servicesByDay } from './format'
import { PlanButton } from '../../subscription/PlanLock'

/** Culto em destaque no topo da Igreja (QA de 20/10): gravar e abrir os cultos gravados lado a lado, e o último culto. */
function RecordCard() {
  const { colors } = useTheme()
  const { sermons } = useSermons()
  const last = sermons[0]
  return (
    <Card style={{ gap: 12, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mic" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="title">Culto</AppText>
          <AppText variant="small" tone="secondary">
            Grave a pregação e tenha o texto, o resumo e os versículos.
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <PlanButton feature="sermon" label="Gravar culto" icon="mic" onPress={() => router.push('/culto/gravar')} />
        <Button label={sermons.length ? `Cultos gravados (${sermons.length})` : 'Cultos gravados'} variant="outline" onPress={() => router.push('/culto')} />
      </View>
      {last ? (
        <Pressable
          onPress={() => router.push({ pathname: '/culto/[id]', params: { id: last.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Último culto: ${last.theme || 'Culto'}`}
          style={{ minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="label" tone="secondary">
              Último culto
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {last.theme || 'Culto'}
            </AppText>
          </View>
          <Icon name="chevronRight" size={16} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </Card>
  )
}

export function ChurchHubScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { main, churches, ministries, courses } = useChurch()
  const events = main?.events ?? []

  if (!main) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 120, gap: 20 }}>
        <AppText variant="screenTitle" accessibilityRole="header" style={{ paddingHorizontal: 4 }}>
          Igreja
        </AppText>
        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 16 }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="church" size={36} color={colors.primary} />
          </View>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            Nenhuma igreja cadastrada
          </AppText>
          <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
            Vincule sua igreja para ver horários de culto, acessibilidade, ministérios e cursos.
          </AppText>
        </View>
        <PlanButton feature="church" label="Buscar minha igreja" onPress={() => router.push('/igreja/buscar')} />
        <PlanButton feature="church" label="Cadastrar à mão" variant="outline" onPress={() => router.push('/igreja/cadastrar')} />
        <RecordCard />
      </ScrollView>
    )
  }

  const byDay = servicesByDay(main.services)
  const a = main.accessibility
  const activeCourses = courses.filter((c) => !c.completedAt).length

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 120, gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="screenTitle" accessibilityRole="header">
            Igreja
          </AppText>
          <Pressable
            onPress={() => router.push('/igreja/minhas')}
            accessibilityRole="button"
            accessibilityLabel={`${main.name}. Minhas igrejas${churches.length > 1 ? `, ${churches.length} igrejas` : ''}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: MIN_TOUCH }}
          >
            <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
              {main.name}
            </AppText>
            <Icon name="chevronDown" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>
        <IconButton icon="search" label="Buscar igreja" onPress={() => router.push('/igreja/buscar')} />
      </View>

      <RecordCard />

      <TileGrid
        items={[
          {
            label: 'Ministérios',
            sub: ministries.length ? `${ministries.length} ${ministries.length === 1 ? 'ministério' : 'ministérios'}` : 'Onde você serve',
            icon: 'people',
            onPress: () => router.push('/igreja/ministerios'),
          },
          { label: 'Cursos', sub: activeCourses ? `${activeCourses} em andamento` : 'Nenhum em andamento', icon: 'book', onPress: () => router.push('/igreja/cursos') },
        ]}
      />

      <Card style={{ paddingVertical: 4 }}>
        <Pressable
          onPress={() => router.push('/igreja/eventos')}
          accessibilityRole="button"
          accessibilityLabel={`Eventos, ${events.length} ${events.length === 1 ? 'próximo evento' : 'próximos eventos'}`}
          style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="calendar" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Eventos</AppText>
            <AppText variant="small" tone="secondary">
              {events.length ? `${events.length} ${events.length === 1 ? 'próximo evento' : 'próximos eventos'}` : 'Nenhum evento'}
            </AppText>
          </View>
          <Icon name="chevronRight" size={16} color={colors.lineStrong} />
        </Pressable>
      </Card>

      <SectionLabel>Sobre a igreja</SectionLabel>

      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel>Cultos</SectionLabel>
          <IconButton icon="edit" label="Editar horários de culto" onPress={() => router.push('/igreja/horarios')} />
        </View>
        {byDay.length === 0 ? (
          <AppText variant="body" tone="secondary">
            Nenhum horário informado ainda.
          </AppText>
        ) : (
          byDay.map((d, i) => (
            <View
              key={d.day}
              accessible
              accessibilityLabel={`${d.day}: ${d.times}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, borderBottomWidth: i < byDay.length - 1 ? 1 : 0, borderBottomColor: colors.line }}
            >
              <Icon name="clock" size={16} color={colors.primary} />
              <AppText variant="body" style={{ flex: 1 }}>
                {d.day}
              </AppText>
              <AppText variant="body" tone="secondary">
                {d.times}
              </AppText>
            </View>
          ))
        )}
      </Card>

      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SectionLabel>Acessibilidade</SectionLabel>
          <IconButton icon="edit" label="Informar acessibilidade" onPress={() => router.push('/igreja/acessibilidade')} />
        </View>
        {ACCESS_ITEMS.map((it, i) => {
          const v = a[it.key]
          const sub = it.key === 'libras' && v && a.librasServices ? a.librasServices : v === undefined ? 'Ninguém informou ainda' : v ? 'Disponível' : 'Não disponível'
          return (
            <View
              key={it.key}
              accessible
              accessibilityLabel={`${it.label}: ${sub}`}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: i < ACCESS_ITEMS.length - 1 ? 1 : 0, borderBottomColor: colors.line }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: v ? colors.primarySoft : colors.bg, marginTop: 2 }}>
                <Icon name={v ? 'check' : v === false ? 'close' : 'info'} size={12} color={v ? colors.primary : colors.textSecondary} strokeWidth={3} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body">{it.label}</AppText>
                <AppText variant="small" tone="secondary">
                  {sub}
                </AppText>
              </View>
            </View>
          )
        })}
        <AppText variant="small" tone="secondary">
          Informado por quem frequenta.
        </AppText>
      </Card>

      {main.address ? (
        <Card style={{ gap: 6 }}>
          <SectionLabel>Endereço</SectionLabel>
          <AppText variant="body">{main.address}</AppText>
          <Button
            label="Ver no mapa"
            icon="map"
            variant="text"
            size="sm"
            onPress={() => {
              toast('Abrindo o mapa')
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${main.name}, ${main.address}`)}`).catch(() => {})
            }}
            style={{ alignSelf: 'flex-start' }}
          />
        </Card>
      ) : null}
    </ScrollView>
  )
}
