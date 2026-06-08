import React from 'react'

export default function App(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--color-stone)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)'
      }}
    >
      {/* Title bar placeholder */}
      <div
        style={{
          height: 'var(--titlebar-height)',
          background: 'var(--color-stone)',
          borderBottom: '1px solid var(--color-gold-dim)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 'var(--space-4)',
          WebkitAppRegion: 'drag' as React.CSSProperties['WebkitAppRegion']
        }}
      >
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--color-gold)' }}>
          TAKSHASHILA
        </span>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Court floor placeholder */}
        <div
          style={{
            flex: 1,
            background: 'var(--color-courtyard)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.3
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--color-gold)' }}>
            Court Floor
          </span>
        </div>

        {/* Detail panel placeholder */}
        <div
          className="pixel-panel"
          style={{
            width: 'var(--panel-width)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-dim)' }}>
            Shishya Panel
          </span>
        </div>
      </div>

      {/* Agent strip placeholder */}
      <div
        className="pixel-panel"
        style={{
          height: 'var(--strip-height)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 'var(--space-4)',
          gap: 'var(--space-3)'
        }}
      >
        {['Chanakya', 'Aaruni', 'Nachiketa', 'Gargi'].map((name) => (
          <div
            key={name}
            className="pixel-panel pixel-panel--active"
            style={{
              width: 120,
              height: 72,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer'
            }}
          >
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--color-gold)' }}>
              {name.toUpperCase()}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-idle)' }}>
              ● idle
            </span>
          </div>
        ))}
      </div>

      {/* Aadesh bar */}
      <div
        style={{
          height: 'var(--aadesh-bar-height)',
          background: 'var(--color-stone)',
          borderTop: '1px solid var(--color-gold-dim)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--space-4)',
          gap: 'var(--space-3)'
        }}
      >
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--color-gold)', whiteSpace: 'nowrap' }}>
          ॥ Aadesh:
        </span>
        <input
          type="text"
          placeholder="Issue a mandate to Chanakya…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            caretColor: 'var(--color-gold)'
          }}
        />
        <button
          style={{
            background: 'none',
            border: '1px solid var(--color-gold-dim)',
            color: 'var(--color-gold)',
            fontFamily: 'var(--font-pixel)',
            fontSize: 10,
            padding: '4px 8px',
            cursor: 'pointer'
          }}
        >
          ►
        </button>
      </div>
    </div>
  )
}
