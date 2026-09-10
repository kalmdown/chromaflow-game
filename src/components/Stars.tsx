interface StarsProps {
  earned: number
  total?: number
  size?: 'sm' | 'lg'
}

export function Stars({ earned, total = 3, size = 'sm' }: StarsProps) {
  return (
    <span className={`stars stars--${size}`} aria-label={`${earned} of ${total} stars`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`stars__pip${i < earned ? ' is-earned' : ''}`} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}
