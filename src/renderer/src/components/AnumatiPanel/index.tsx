import React, { useEffect, useState } from 'react'

interface AnumatiItem {
  id: string
  from: string
  timestamp: string
  decision: string
  context: string
}

/** Toast stack that surfaces pending tool-permission requests from agent sessions.
 *  IPC is already fully wired on main — this is the missing renderer half. */
export default function AnumatiPanel(): React.JSX.Element | null {
  const [items, setItems] = useState<AnumatiItem[]>([])

  useEffect(() => {
    // Load anything pending from before the renderer started
    window.takshashila.anumati.getPending().then(setItems).catch(() => {})

    // Subscribe to new requests
    const unsub = window.takshashila.anumati.onNew((item) => {
      setItems((prev) => {
        if (prev.some((x) => x.id === item.id)) return prev
        return [...prev, item]
      })
    })
    return unsub
  }, [])

  async function respond(item: AnumatiItem, approved: boolean): Promise<void> {
    setItems((prev) => prev.filter((x) => x.id !== item.id))
    try {
      await window.takshashila.anumati.respond(item.id, approved)
      await window.takshashila.chanakya.anumatiRespond(approved)
    } catch { /* non-fatal — UI already updated */ }
  }

  if (items.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 44, right: 12, zIndex: 80,
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
      maxWidth: 360, maxHeight: '70vh', overflowY: 'auto',
      pointerEvents: 'none'
    }}>
      {items.map((item) => (
        <div
          key={item.id}
          className="pixel-panel"
          style={{
            padding: 'var(--space-3)',
            borderLeft: '3px solid var(--color-terracotta)',
            pointerEvents: 'auto',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              fontFamily: 'var(--font-pixel)', fontSize: 7,
              color: 'var(--color-terracotta)', textTransform: 'uppercase'
            }}>
              Anumati
            </span>
            <span style={{
              fontFamily: 'var(--font-pixel)', fontSize: 7,
              color: 'var(--color-gold-dim)', marginLeft: 'auto'
            }}>
              {item.from}
            </span>
          </div>

          <pre style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--color-text-primary)', margin: 0,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 120, overflowY: 'auto',
            background: 'rgba(0,0,0,0.3)', padding: 'var(--space-2)'
          }}>
            {item.context.slice(-400)}
          </pre>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={() => respond(item, true)}
              style={{
                flex: 1, fontFamily: 'var(--font-pixel)', fontSize: 8,
                background: 'var(--color-gold)', color: 'var(--color-stone)',
                border: 'none', padding: '4px 0', cursor: 'pointer'
              }}
            >
              ✓ ALLOW
            </button>
            <button
              onClick={() => respond(item, false)}
              style={{
                flex: 1, fontFamily: 'var(--font-pixel)', fontSize: 8,
                background: 'none', color: 'var(--color-terracotta)',
                border: '1px solid var(--color-terracotta)', padding: '4px 0', cursor: 'pointer'
              }}
            >
              ✕ DENY
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
