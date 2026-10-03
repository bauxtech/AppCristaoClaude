import { useEffect, useRef } from 'react'
import { useSession } from './session'

/** Chama fn(sample) quando a prévia troca entre dados de exemplo e conta vazia. */
export function useDataReset(fn: (sample: boolean) => void) {
  const { dataEpoch, sampleData } = useSession()
  const first = useRef(true)
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ref.current(sampleData)
  }, [dataEpoch]) // eslint-disable-line react-hooks/exhaustive-deps
}
