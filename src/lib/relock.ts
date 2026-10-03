import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

/** Chama relock quando o app vai para segundo plano (diário e anotações voltam a travar). */
export function useRelockOnBackground(relock: () => void) {
  const ref = useRef(relock)
  ref.current = relock
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') ref.current()
    })
    return () => sub.remove()
  }, [])
}
