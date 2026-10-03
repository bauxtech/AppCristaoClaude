import { router } from 'expo-router'
import { Image, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Avatar, Button, Card, ListRow, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { IS_PREVIEW } from '../../../lib/preview'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useBible } from '../../bible/BibleContext'
import { BOOKS } from '../../bible/books'
import { bookProgress } from '../../bible/screens/BooksScreen'
import { TileGrid } from '../../cell/screens/parts'
import { useChurch } from '../../church/ChurchContext'
import { useProfile } from '../ProfileContext'
import { useCell } from '../../cell/CellContext'
import { useChat } from '../../chat/ChatContext'
import { useConnection } from '../../../state/connection'
import { useSettings } from '../../settings/SettingsContext'
import { longDate } from '../../settings/screens/AccountScreens'
import { useSubscription } from '../../subscription/SubscriptionContext'
import { PreviewSubTools, TrialBanner } from '../../subscription/screens/SubscriptionScreens'

export const TOTAL_CHAPTERS = BOOKS.reduce((a, b) => a + b.chapters, 0)

export function ProfileHome() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const session = useSession()
  const { readChapters } = useBible()
  const { main } = useChurch()
  const profile = useProfile()
  const settings = useSettings()
  const sub = useSubscription()
  const { cell } = useCell()
  const connection = useConnection()
  const chat = useChat()
  const read = new Set(readChapters).size
  const pct = Math.round((read / TOTAL_CHAPTERS) * 100)
  const booksDone = BOOKS.filter((b) => bookProgress(b, readChapters) === b.chapters).length
  const name = session.profile.name || 'Seu nome'

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}>
      {settings.deletionAt ? (
        <Card style={{ gap: 8, borderColor: colors.danger }}>
          <AppText variant="bodyStrong">Conta marcada para exclusão</AppText>
          <AppText variant="small" tone="secondary">
            {`Sua conta será excluída em ${longDate(settings.deletionAt)}.`}
          </AppText>
          <Button label="Cancelar exclusão" size="sm" variant="soft" onPress={() => router.push('/configuracoes/exclusao')} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}
      <TrialBanner />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, paddingBottom: 4 }}>
        {profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={{ width: 64, height: 64, borderRadius: 32 }} accessible={false} /> : <Avatar name={name} size={64} />}
        <View style={{ flex: 1 }}>
          <AppText variant="screenTitle" accessibilityRole="header">
            {name}
          </AppText>
          <AppText variant="small" tone="secondary">
            {main?.name ?? 'Sem igreja vinculada'}
          </AppText>
        </View>
        <Button label="Editar" variant="outline" size="sm" onPress={() => router.push('/eu/editar')} accessibilityHint="Editar nome, foto e aniversário" />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { val: String(session.activeDays.length), lbl: 'dias com leitura ou oração', go: '/eu/tempo' },
          { val: `${pct}%`, lbl: 'da Bíblia lida', go: '/eu/mapa' },
          { val: String(booksDone), lbl: booksDone === 1 ? 'livro concluído' : 'livros concluídos', go: '/eu/mapa' },
        ].map((x) => (
          <Pressable key={x.lbl} onPress={() => router.push(x.go as '/eu/mapa')} accessibilityRole="button" accessibilityLabel={`${x.val} ${x.lbl}`} style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', gap: 2 }}>
            <AppText style={{ fontFamily: fonts.semibold, fontSize: 20, color: colors.primary }}>{x.val}</AppText>
            <AppText variant="label" tone="secondary" style={{ textAlign: 'center' }}>
              {x.lbl}
            </AppText>
          </Pressable>
        ))}
      </View>

      {session.activeDays.length === 0 && read === 0 ? (
        <Card style={{ gap: 6 }}>
          <AppText variant="bodyStrong">Sua caminhada começa aqui</AppText>
          <AppText variant="body" tone="secondary">
            Quando você ler um capítulo ou orar pelo app, os números aparecem aqui. Você também pode registrar os marcos da sua fé.
          </AppText>
        </Card>
      ) : null}

      <TileGrid
        items={[
          { label: 'Mapa dos 66 livros', sub: `${booksDone} concluídos`, icon: 'book', onPress: () => router.push('/eu/mapa') },
          { label: 'Minha jornada', sub: profile.milestones.length ? `${profile.milestones.length} marcos` : 'Registrar marcos', icon: 'flag', onPress: () => router.push('/eu/jornada') },
          { label: 'Anotações', sub: 'Bíblia, culto, curso e célula', icon: 'file', onPress: () => router.push('/eu/anotacoes') },
          { label: 'Música', sub: 'Por momento e favoritas', icon: 'music', onPress: () => router.push('/eu/musica') },
        ]}
      />

      <Card style={{ paddingVertical: 8 }}>
        <ListRow label="Favoritos e grifos" sub="Versículos que você marcou" onPress={() => router.push('/eu/favoritos')} divider />
        <ListRow label="Cultos gravados" sub="Texto e resumo das pregações" onPress={() => router.push('/culto')} divider />
        <ListRow label="Pedidos respondidos" sub="Linha do tempo da oração" onPress={() => router.push('/oracao/respondidos')} divider />
        <ListRow label="Tempo de leitura e oração" sub="Por semana" onPress={() => router.push('/eu/tempo')} divider />
        <ListRow label="Retrospectiva do ano" onPress={() => router.push('/eu/retrospectiva')} divider />
        <ListRow label="O que a célula vê de mim" onPress={() => router.push('/eu/celula-ve')} />
      </Card>

      <Card style={{ paddingVertical: 8 }}>
        <ListRow
          label="Meu plano"
          sub={sub.status === 'trial' ? `Teste grátis, faltam ${sub.daysLeft} ${sub.daysLeft === 1 ? 'dia' : 'dias'}` : sub.status === 'paymentFailed' ? 'Pagamento falhou' : 'Assinatura e cobrança'}
          onPress={() => router.push('/assinatura/meu-plano')}
          divider
        />
        <ListRow label="Avisos" sub={settings.unreadCount ? `${settings.unreadCount} não ${settings.unreadCount === 1 ? 'lido' : 'lidos'}` : undefined} onPress={() => router.push('/avisos')} divider />
        <ListRow label="Configurações" onPress={() => router.push('/configuracoes')} />
      </Card>

      <Card style={{ paddingVertical: 8 }}>
        <ListRow label="Sair da conta" onPress={() => router.push('/configuracoes/sair')} divider />
        {cell ? <ListRow label="Sair da célula" sub={cell.name} onPress={() => router.push('/celula/opcoes')} divider /> : null}
        <ListRow label="Excluir conta" danger onPress={() => router.push('/configuracoes/excluir')} />
      </Card>

      {IS_PREVIEW ? (
        <Card style={{ gap: 10 }}>
          <AppText variant="bodyStrong">Só na prévia</AppText>
          <AppText variant="small" tone="secondary">
            {session.sampleData ? 'Agora com os dados de exemplo do protótipo.' : 'Agora como conta nova, sem nada criado.'}
          </AppText>
          <Button label="Ver como conta nova" variant={session.sampleData ? 'primary' : 'outline'} onPress={() => (session.resetData(false), toast('Conta nova: tudo vazio'))} />
          <Button label="Carregar dados de exemplo" variant={session.sampleData ? 'outline' : 'primary'} onPress={() => (session.resetData(true), toast('Dados de exemplo carregados'))} />
          <PreviewSubTools />
          <Card style={{ gap: 8 }}>
            <AppText variant="bodyStrong">Estados gerais</AppText>
            <AppText variant="small" tone="secondary">
              {connection.demo === 'offline' ? 'Agora: sem internet.' : connection.demo === 'error' ? 'Agora: erro ao carregar.' : connection.demo === 'loading' ? 'Agora: carregando.' : 'Agora: normal.'}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button label="Sem internet" variant="outline" size="sm" onPress={() => connection.setDemo('offline')} />
              <Button label="Erro" variant="outline" size="sm" onPress={() => connection.setDemo('error')} />
              <Button label="Carregando" variant="outline" size="sm" onPress={() => connection.setDemo('loading')} />
              <Button label="Normal" variant="outline" size="sm" onPress={() => connection.setDemo(null)} />
              <Button label="Limite do chat atingido" variant="outline" size="sm" onPress={() => (chat.fillTodayLimit(), toast('Perguntas de hoje usadas'))} />
            </View>
          </Card>
          <ListRow label="Componentes" sub="Ver todos no claro, escuro e alto contraste" onPress={() => router.push('/componentes')} divider />
          <ListRow label="Teste de gravação" sub="Gravar 60 minutos com a tela bloqueada" onPress={() => router.push('/teste-gravacao')} divider />
          <ListRow
            label="Refazer o primeiro acesso"
            sub="Volta para a tela de boas-vindas"
            onPress={() => {
              session.signOut()
              router.replace('/bem-vindo')
            }}
          />
        </Card>
      ) : null}
    </ScrollView>
  )
}
