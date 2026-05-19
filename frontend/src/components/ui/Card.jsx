// Kart bileşeni
export default function Card({
  children,
  hover = false,
  padding = '24px',
  className = '',
  style = {},
  onClick,
  ...props
}) {
  return (
    <div
      className={`card ${hover ? 'card-hover' : ''} ${className}`}
      style={{ padding, cursor: onClick ? 'pointer' : 'default', ...style }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}
