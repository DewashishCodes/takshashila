import React, { useState, useEffect, useCallback } from 'react'
import Editor from './Editor'

interface Props {
  agentId: string
}

const WORD_LIMIT = 2000

export default function SmritiPane({ agentId }: Props): React.JSX.Element {
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)

  const load = useCallback(() => {
    window.takshashila.smriti.getAgentSmriti(agentId).then((text) => {
      setContent(text)
      setLoaded(true)
      setDirty(false)
    })
  }, [agentId])

  useEffect(() => {
    setLoaded(false)
    load()
  }, [load])

  function save(): void {
    window.takshashila.smriti.update(agentId, content).then(() => {
      setDirty(false)
      setSaveFlash(true)
      setTimeout(() => setSaveFlash(false), 1200)
    })
  }

  const words = content.trim() ? content.trim().split(/\s+/).length : 0
  const overLimit = words > WORD_LIMIT

  if (!loaded) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-text-dim)', fontFamily: 'var(--font-body)', fontSize: 12
      }}>
        Recalling smriti…
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 8px',
        borderBottom: '1px solid var(--color-gold-dim)',
        flexShrink: 0
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--color-text-secondary)' }}>
          SMRITI.MD{dirty ? ' ●' : ''}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: overLimit ? 'var(--color-error)' : 'var(--color-text-dim)'
        }}>
          {words}/{WORD_LIMIT} words{overLimit ? ' — over limit' : ''}
        </span>
        <button
          onClick={load}
          title="Reload from disk"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-gold-dim)', fontSize: 11, padding: 0
          }}
        >
          ↻
        </button>
        <button
          onClick={save}
          disabled={!dirty}
          style={{
            background: dirty ? 'var(--color-gold)' : 'transparent',
            border: '1px solid var(--color-gold-dim)',
            color: saveFlash ? 'var(--color-success)' : dirty ? 'var(--color-stone)' : 'var(--color-text-dim)',
            fontFamily: 'var(--font-pixel)', fontSize: 7,
            padding: '3px 8px',
            cursor: dirty ? 'pointer' : 'default'
          }}
        >
          {saveFlash ? 'SAVED' : 'SAVE'}
        </button>
      </div>
      <Editor
        key={agentId}
        value={content}
        filename="smriti.md"
        onChange={(v) => { setContent(v); setDirty(true) }}
        onSave={save}
      />
    </div>
  )
}
