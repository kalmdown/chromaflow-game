import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Service-worker registration plus the "new version ready" toast.
 *
 * Without a visible prompt an installed PWA can sit on the version it was
 * first installed with indefinitely, so this is the only thing that keeps
 * home-screen copies current. Registration is a side effect of mounting, so
 * this renders on every screen; it draws nothing until an update is waiting.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="update-toast" role="status" aria-live="polite">
      <span className="update-toast__text">A new version of Chromaflow is ready.</span>
      <div className="update-toast__actions">
        <button
          type="button"
          className="button button--small"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
        <button
          type="button"
          className="button button--small button--primary"
          onClick={() => void updateServiceWorker(true)}
        >
          Reload
        </button>
      </div>
    </div>
  )
}
