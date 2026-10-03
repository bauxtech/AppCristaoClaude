import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { AppText, Button, Card, ConfirmCard, Page, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { useCell } from '../CellContext'
import type { Cell } from '../data'
import { CellForm } from './CreateCellScreen'
import { CellGuard } from './Guard'

export function EditCellScreen() {
  return <CellGuard title="Editar célula" action="editCell">{(cell) => <EditCell cell={cell} />}</CellGuard>
}

function EditCell({ cell }: { cell: Cell }) {
  const { colors } = useTheme()
  const toast = useToast()
  const { update } = useCell()
  const [pending, setPending] = useState<Parameters<Parameters<typeof CellForm>[0]['onSubmit']>[0] | null>(null)

  async function pickCover() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.7 })
    if (!res.canceled && res.assets[0]) {
      update((c) => ({ ...c, coverUri: res.assets[0].uri }))
      toast('Foto de capa trocada')
    }
  }

  function save(v: NonNullable<typeof pending>) {
    update((c) => ({ ...c, ...v }))
    toast('Célula salva')
    router.back()
  }

  return (
    <Page title="Editar célula">
      <View style={{ gap: 8 }}>
        <AppText variant="bodyStrong">Foto de capa</AppText>
        <Pressable
          onPress={pickCover}
          accessibilityRole="button"
          accessibilityLabel={cell.coverUri ? 'Trocar foto de capa' : 'Adicionar foto de capa'}
          style={{ height: 140, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.primarySoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
        >
          {cell.coverUri ? (
            <Image source={{ uri: cell.coverUri }} style={{ width: '100%', height: '100%' }} accessible={false} />
          ) : (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Icon name="image" size={24} color={colors.primary} />
              <AppText variant="small" style={{ color: colors.primary }}>
                Adicionar foto
              </AppText>
            </View>
          )}
        </Pressable>
        {cell.coverUri ? <Button label="Remover foto" variant="text" size="sm" onPress={() => update((c) => ({ ...c, coverUri: undefined }))} style={{ alignSelf: 'flex-start' }} /> : null}
      </View>
      {pending ? (
        <ConfirmCard
          title="Mudar dia, horário ou local?"
          message="Todas as pessoas da célula vão receber um aviso com a mudança."
          confirmLabel="Salvar e avisar"
          danger={false}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            save(pending)
            toast('Célula salva. Todos foram avisados')
          }}
        />
      ) : null}
      <CellForm
        initial={cell}
        submitLabel={() => 'Salvar'}
        note={(changed) =>
          changed ? (
            <Card style={{ flexDirection: 'row', gap: 8, borderColor: colors.accent }}>
              <Icon name="alert" size={16} color={colors.accent} />
              <AppText variant="small" style={{ flex: 1 }}>
                Mudar dia, horário ou endereço avisa todas as pessoas da célula.
              </AppText>
            </Card>
          ) : null
        }
        onSubmit={(v) => {
          const changed = v.day !== cell.day || v.time !== cell.time || v.address !== cell.address
          if (changed) setPending(v)
          else save(v)
        }}
      />
    </Page>
  )
}
