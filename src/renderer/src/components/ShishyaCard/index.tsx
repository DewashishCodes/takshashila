import React from 'react'

interface Agent {
  id: string
  name: string
  domain: string
  avastha: 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'
  lastKriya?: string
}

interface Props {
  agent: Agent
  selected: boolean
  onClick: () => void
}

const AVASTHA_COLOR: Record<Agent['avastha'], string> = {
  idle:       'var(--color-idle)',
  working:    'var(--color-active)',
  processing: 'var(--color-gold)',
  vighna:     'var(--color-error)',
  siddhi:     'var(--color-success)'
}

export default function ShishyaCard({ agent, selected, onClick }: Props): React.JSX.Element {
  return (
    <div
      className={`pixel-panel${selected ? ' pixel-panel--active' : ''}`}
      onClick={onClick}
      style={{
        width: 140,
        height: 72,
        flexShrink: 0,
        padding: 'var(--space-2)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.15s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>🧑‍🏫</span>
        <span style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: 7,
          color: selected ? 'var(--color-gold)' : 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {agent.name.toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: AVASTHA_COLOR[agent.avastha],
          display: 'inline-block', flexShrink: 0
        }} />
        <span style={{
          fontFamily: 'var(--font-pixel)', fontSize: 6,
          color: 'var(--color-text-secondary)'
        }}>
          {agent.avastha}
        </span>
      </div>

      {agent.lastKriya && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 9,
          color: 'var(--color-text-dim)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {agent.lastKriya}
        </div>
      )}
    </div>
  )
}
