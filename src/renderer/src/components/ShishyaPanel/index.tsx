import React, { useState } from 'react'
import TerminalPane from './TerminalPane'

interface Agent {
  id: string
  name: string
  domain: string
  avastha: 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'
}

interface Props {
  agent: Agent | null
}

type Tab = 'terminal' | 'files' | 'git' | 'smriti'

const TAB_LABELS: Record<Tab, string> = {
  terminal: '॥ Terminal',
  files:    '📜 Files',
  git:      '⚔️ Git',
  smriti:   '🧠 Smriti'
}

const AVASTHA_COLOR: Record<Agent['avastha'], string> = {
  idle:       'var(--color-idle)',
  working:    'var(--color-active)',
  processing: 'var(--color-gold)',
  vighna:     'var(--color-error)',
  siddhi:     'var(--color-success)'
}

export default function ShishyaPanel({ agent }: Props): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('terminal')

  if (!agent) {
    return (
      <div
        className="pixel-panel"
        style={{
          width: 'var(--panel-width)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <span style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-body)', fontSize: 12 }}>
          Select a shishya
        </span>
      </div>
    )
  }

  return (
    <div
      className="pixel-panel"
      style={{
        width: 'var(--panel-width)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-gold-dim)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)'
      }}>
        <div style={{
          width: 40, height: 40,
          background: 'var(--color-stone)',
          border: '1px solid var(--color-gold-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20
        }}>
          🧑‍🏫
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-gold)', lineHeight: 1 }}>
            {agent.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: AVASTHA_COLOR[agent.avastha],
              display: 'inline-block', flexShrink: 0
            }} />
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--color-text-secondary)' }}>
              {agent.avastha.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-gold-dim)',
        flexShrink: 0
      }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              background: tab === t ? 'var(--color-stone-light)' : 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--color-gold)' : '2px solid transparent',
              color: tab === t ? 'var(--color-gold)' : 'var(--color-text-dim)',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              padding: '6px 4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'terminal' && <TerminalPane agentId={agent.id} />}
        {tab !== 'terminal' && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-dim)', fontFamily: 'var(--font-body)', fontSize: 12
          }}>
            {TAB_LABELS[tab]} — coming in a later milestone
          </div>
        )}
      </div>
    </div>
  )
}
