import { ConfirmCard, EmptyState, Page } from '../../../components'

export { EmptyState, Page as PrayerPage }

/** Confirmação de apagar, dentro da tela. */
export function ConfirmDelete(props: { title: string; onCancel: () => void; onConfirm: () => void }) {
  return <ConfirmCard {...props} />
}
