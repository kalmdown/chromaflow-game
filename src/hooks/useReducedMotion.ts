import { useEffect, useState } from 'react'
import type { Settings } from '../game/progress.ts'

/** Tracks the OS-level preference so the 'system' setting stays live. */
export function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

export function useReducedMotion(motion: Settings['motion']): boolean {
  const system = useSystemReducedMotion()
  if (motion === 'reduced') return true
  if (motion === 'full') return false
  return system
}
