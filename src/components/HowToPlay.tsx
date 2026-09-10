import { Modal } from './Modal.tsx'
import { KeyMark, LockMark, ShuffleMark } from './Board.tsx'

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="How to play"
      onClose={onClose}
      footer={
        <button type="button" className="button button--primary" onClick={onClose}>
          Got it
        </button>
      }
    >
      <ol className="rules">
        <li>
          <strong>Grow your flow.</strong> You start owning the top-left tile. Pick a colour and
          your whole region turns that colour, swallowing every tile of that colour touching it.
          Tiles connect <em>up, down, left and right only</em> — never diagonally. Tapping a tile
          on the board is a shortcut for picking its colour.
        </li>
        <li>
          <strong>Absorb the whole board before your turns run out.</strong> The turn counter drops
          by one each time you pick a new colour.
        </li>
        <li>
          <strong>Finish on the target colour.</strong> The target is shown at the top of every
          level. You only win if the board is full <em>and</em> your flow's final colour is the
          target.
        </li>
        <li className="rules__warn">
          <strong>Keep one target tile in reserve.</strong> If you absorb the last unclaimed tiles
          of the target colour while other tiles are still out there, you lose on the spot — there
          is no longer any way to finish on the target.
        </li>
        <li>
          <strong>Combos.</strong> Every absorbed tile is worth 10 points. Absorb four or more
          tiles in a row across consecutive turns and the multiplier climbs 1.25× → 1.5× → 2×. One
          small turn resets it.
        </li>
      </ol>

      <h3 className="rules__subhead">Special tiles</h3>
      <ul className="specials">
        <li>
          <span className="specials__mark specials__mark--key">
            <KeyMark size={18} />
          </span>
          <span>
            <strong>Key.</strong> Absorb it like any other tile of its colour. It opens every lock
            carrying the same number.
          </span>
        </li>
        <li>
          <span className="specials__mark specials__mark--lock">
            <LockMark size={18} />
          </span>
          <span>
            <strong>Lock.</strong> Grey and unplayable until its key is collected. Locked tiles
            cannot be absorbed, and they do not count as target-colour tiles while locked.
          </span>
        </li>
        <li>
          <span className="specials__mark specials__mark--shuffle">
            <ShuffleMark size={18} />
          </span>
          <span>
            <strong>Shuffle.</strong> Absorbs normally, then instantly re-deals the colours of every
            remaining ordinary tile. Positions, keys, locks and your own region stay put.
          </span>
        </li>
      </ul>

      <h3 className="rules__subhead">Controls</h3>
      <ul className="keys">
        <li>
          <kbd>1</kbd>–<kbd>7</kbd> or a tap on the board picks a colour
        </li>
        <li>
          <kbd>Z</kbd> or <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo
        </li>
        <li>
          <kbd>R</kbd> restart the level
        </li>
        <li>
          <kbd>Esc</kbd> close a dialog
        </li>
      </ul>
    </Modal>
  )
}
