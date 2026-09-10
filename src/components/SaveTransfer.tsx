import { useState } from 'react'
import { exportSave, mergeSaves, parseSave } from '../game/progress.ts'
import type { SaveData } from '../game/progress.ts'

interface SaveTransferProps {
  save: SaveData
  onImport: (save: SaveData) => void
}

type Note = { kind: 'ok' | 'error'; text: string } | null

/**
 * Moves a profile between devices as text.
 *
 * Deliberately copy/paste rather than file download: an installed iOS PWA
 * handles `<a download>` and blob URLs badly, and a share sheet is not
 * guaranteed either, so the reliable path is the primary one and the share
 * button only appears where the API exists.
 *
 * Imports merge rather than overwrite — see mergeSaves. A player who has
 * progress on both devices keeps the better result on every level.
 */
export function SaveTransfer({ save, onImport }: SaveTransferProps) {
  const [text, setText] = useState('')
  const [note, setNote] = useState<Note>(null)

  const cleared = Object.keys(save.records).length
  const payload = exportSave(save)

  async function copyOut() {
    setText(payload)
    try {
      await navigator.clipboard.writeText(payload)
      setNote({ kind: 'ok', text: 'Save copied to the clipboard.' })
    } catch {
      // Clipboard access can be refused; the textarea below still holds it.
      setNote({ kind: 'ok', text: 'Save shown below — select it all and copy.' })
    }
  }

  async function shareOut() {
    try {
      await navigator.share({ title: 'Chromaflow save', text: payload })
    } catch {
      // A cancelled share sheet is not an error worth reporting.
    }
  }

  function importIn() {
    const incoming = parseSave(text.trim())
    if (!incoming) {
      setNote({ kind: 'error', text: 'That is not a Chromaflow save.' })
      return
    }
    const merged = mergeSaves(save, incoming)
    onImport(merged)
    const gained = Object.keys(merged.records).length - cleared
    setNote({
      kind: 'ok',
      text: gained > 0 ? `Merged — ${gained} more level(s) cleared.` : 'Merged into this device.',
    })
  }

  return (
    <div className="transfer">
      <p className="transfer__hint">
        Progress lives only in this browser. Copy it out to move to another device, or keep it
        somewhere safe — iOS can clear storage for apps left unopened for a week or so.
      </p>

      <div className="transfer__row">
        <button type="button" className="button button--small" onClick={() => void copyOut()}>
          Copy this device's save
        </button>
        {'share' in navigator && (
          <button type="button" className="button button--small" onClick={() => void shareOut()}>
            Share
          </button>
        )}
      </div>

      <label className="transfer__label" htmlFor="transfer-text">
        Paste a save here to merge it in
      </label>
      <textarea
        id="transfer-text"
        className="transfer__text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={'{ "version": 1, ... }'}
      />

      <div className="transfer__row">
        <button
          type="button"
          className="button button--small button--primary"
          onClick={importIn}
          disabled={text.trim().length === 0}
        >
          Merge save
        </button>
      </div>

      {note && (
        <p
          className={`transfer__note transfer__note--${note.kind}`}
          role="status"
          aria-live="polite"
        >
          {note.text}
        </p>
      )}
    </div>
  )
}
