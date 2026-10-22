import { View } from 'react-native'
import { AppText, Page } from '../../components'

/** Ajuda do Hoje (pedido do Thiago, 22/10): o que é cada parte da tela e como usar, em poucas linhas. */
export const HELP_TOPICS: { title: string; text: string }[] = [
  {
    title: 'Dias com leitura ou oração',
    text: 'O número no alto da tela. Conta cada dia em que você leu a Bíblia ou orou pelo app. Não é sequência: se você pular um dia, o total não volta a zero. Toque nele para ver os dias do mês.',
  },
  { title: 'Avisos', text: 'O sino abre os seus avisos. O número em cima dele mostra quantos você ainda não leu.' },
  {
    title: 'Passagem do dia',
    text: 'Um trecho da Bíblia por dia, o mesmo para todos. Ler capítulo abre o capítulo inteiro, Ouvir lê o trecho em voz alta e Perguntar sobre isso leva a passagem para o chat.',
  },
  { title: 'Reflexão de hoje', text: 'Um texto curto sobre a Bíblia, novo a cada dia, com uma oração no final. Dá para ler ou ouvir.' },
  {
    title: 'O que você está sentindo agora?',
    text: 'Escolha como você está e o app mostra um versículo para esse momento. Se quiser entender mais, pergunte sobre o tema no chat.',
  },
  { title: 'Momentos de oração', text: 'Orações guiadas, de poucos minutos, separadas por tema. A primeira é a oração de hoje. Toque em uma para começar.' },
  {
    title: 'Planos de leitura',
    text: 'Um plano divide a Bíblia, ou parte dela, em leituras por dia. Em Meus planos ficam os que você começou. Em Em destaque estão os planos prontos do app.',
  },
  {
    title: 'Criar o seu plano',
    text: 'Na Bíblia, abra Planos de leitura e toque em Criar meu plano. Escolha os livros, em quantos dias quer ler (ou quantos capítulos por dia) e dê um nome.',
  },
  {
    title: 'Dia do plano',
    text: 'O "Dia 1 de 30" na capa mostra em qual leitura você está. Abra o plano, leia os capítulos do dia e toque em Marcar dia como lido. O plano só avança quando você marca. Se atrasar, toque em Retomar de onde parei: a contagem recomeça a partir de hoje, sem perder o que você já leu.',
  },
  {
    title: 'Próximos compromissos',
    text: 'As próximas datas da sua célula, da sua igreja, dos seus cursos e ministérios, e os eventos que você salvou.',
  },
  { title: 'Pedidos da célula', text: 'Quantos pedidos de oração a sua célula tem agora. Aparece para quem participa de uma célula.' },
  { title: 'Música do dia', text: 'Uma sugestão de música cristã brasileira por dia. Toque em Spotify, YouTube ou Deezer para ouvir.' },
]

export function HelpScreen() {
  return (
    <Page title="Como usar o Hoje">
      {HELP_TOPICS.map((t) => (
        <View key={t.title} style={{ gap: 6 }}>
          <AppText variant="title" accessibilityRole="header">
            {t.title}
          </AppText>
          <AppText variant="body" tone="secondary">
            {t.text}
          </AppText>
        </View>
      ))}
    </Page>
  )
}
