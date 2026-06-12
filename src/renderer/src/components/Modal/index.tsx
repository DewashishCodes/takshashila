import React, { useEffect } from 'react'

interface Props {
  title: string
  onClose?: () => void
  width?: number | string
  children: React.ReactNode
}

/** Centered pixel-panel dialog over a dimmed court. Escape closes when closable. */
export default function Modal({ title, onClose, width = 520, children }: Props): React.JSX.Element {
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(15, 8, 4, 0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        className="pixel-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: '90vw', maxHeight: '85vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--color-gold-dim)',
          flexShrink: 0
        }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-gold)' }}>
            {title}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-dim)', fontFamily: 'var(--font-pixel)', fontSize: 10
              }}
            >
              ✕
            </button>
          )}
        </div>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
