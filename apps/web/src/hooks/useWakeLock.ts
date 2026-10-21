import { useEffect } from 'react'

/**
 * Keeps the screen on while `active`, where the browser offers the Screen Wake Lock API (many
 * wallet in-app browsers don't). A code that dims away at the counter has to be woken again.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | undefined
    let released = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (released) void lock.release()
        else sentinel = lock
      } catch {
        // Refused, for example on low battery: the screen dims as usual.
      }
    }
    // The browser drops the lock whenever the page is hidden; take it again on return.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void sentinel?.release()
    }
  }, [active])
}
