import { forwardRef } from 'react'

// Genel amaçlı Input bileşeni
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    type = 'text',
    placeholder,
    required = false,
    className = '',
    containerStyle = {},
    icon: Icon,
    ...props
  },
  ref
) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && (
        <label style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--color-text)',
        }}>
          {label}
          {required && <span style={{ color: 'var(--color-accent)', marginLeft: 3 }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {Icon && (
          <span style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Icon size={16} />
          </span>
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={`input-field ${error ? 'error' : ''} ${className}`}
          style={Icon ? { paddingLeft: 38 } : {}}
          {...props}
        />
      </div>

      {error && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)', margin: 0 }}>
          ⚠ {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
          {hint}
        </p>
      )}
    </div>
  )
})

export default Input
