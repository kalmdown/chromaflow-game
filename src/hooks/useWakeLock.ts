import { useEffect } from 'react'

/**
 * Holds a screen wake lock while `active`, so the display does not dim mid-move.
 *
 * This is a turn-based puzzle — a player can sit on one board for a minute
 * working out a route, which is exactly the idle the OS reads as "dim and
 * lock". The lock is released the moment play stops.
 *
 * The browser drops the lock whenever the page is hidden and will not let it be
 * re-taken until the page is visible again, so the visibility listener
 * reacquires on return rather than assuming the lock survived. Everything here
 * is best-effort: the API is absent on some browsers and can reject (low
 * battery, denied permission), and none of that should reach the player.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const wakeLock = navigator.wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinel | null = null
    let released = false

    const acquire = async () => {
      if (released || sentinel || document.visibilityState !== 'visible') return
      try {
        sentinel = await wakeLock.request('screen')
        // Clear our handle when the browser releases it on its own, so the
        // next visibility change can take a fresh one.
        sentinel.addEventListener('release', () => {
          sentinel = null
        })
        if (released) void sentinel.release().catch(() => {})
      } catch {
        sentinel = null
      }
    }

    const onVisibility = () => void acquire()

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}
