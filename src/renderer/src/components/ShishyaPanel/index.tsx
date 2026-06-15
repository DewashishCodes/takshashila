import React, { useState } from 'react'
import TerminalPane from './TerminalPane'
import FilesPane from './FilesPane'
import GitPane from './GitPane'
import SmritiPane from './SmritiPane'

interface Agent {
  id: string
  name: string
  domain: string
  avastha: 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'
  lastKriya?: string
}

const ROBE_HEX: Record<string, string> = {
  chanakya:      '#F4C430',
  aaruni:        '#C1440E',
  nachiketa:     '#5B7FA6',
  gargi:         '#9B6B9B',
  bharadwaja:    '#4A7C59',
  chandragupta:  '#E05A2B',
  vishnu_sharma: '#5B9B9B',
}

const CHAR_EMOJI: Record<string, string> = {
  chanakya:      '🔮',
  aaruni:        '⚔️',
  nachiketa:     '🗺️',
  gargi:         '📚',
  bharadwaja:    '🛡️',
  chandragupta:  '⚡',
  vishnu_sharma: '📜',
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
      {(() => {
        const robe  = ROBE_HEX[agent.id] ?? '#8C7B6B'
        const emoji = CHAR_EMOJI[agent.id] ?? '🧑‍💻'
        const isActive = agent.avastha === 'working' || agent.avastha === 'processing'
        return (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: `2px solid ${robe}`,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            background: `linear-gradient(90deg, ${robe}18 0%, transparent 60%)`
          }}>
            {/* Robe-colored avatar — matches court sprite and sidebar card */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: robe + '22',
              border: `2px solid ${robe}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
              boxShadow: isActive ? `0 0 12px ${robe}88` : undefined,
            }}>
              {emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-gold)', lineHeight: 1 }}>
                {agent.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: AVASTHA_COLOR[agent.avastha],
                  display: 'inline-block', flexShrink: 0,
                  animation: isActive ? 'dot-blink 1.2s ease-in-out infinite' : undefined,
                  boxShadow: isActive ? `0 0 6px ${AVASTHA_COLOR[agent.avastha]}` : undefined,
                }} />
                <span style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 7,
                  color: isActive ? AVASTHA_COLOR[agent.avastha] : 'var(--color-text-secondary)'
                }}>
                  {agent.avastha.toUpperCase()}
                </span>
                {agent.domain && (
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 10,
                    color: 'var(--color-text-dim)', marginLeft: 4
                  }}>
                    · {agent.domain}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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

      {/* Tab content — terminal stays mounted (hidden) so xterm + scrollback
          survive tab switches; the PTY stream never detaches */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1,
          display: tab === 'terminal' ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <TerminalPane agentId={agent.id} />
        </div>
        {tab === 'files' && <FilesPane agentId={agent.id} />}
        {tab === 'git' && <GitPane agentId={agent.id} />}
        {tab === 'smriti' && <SmritiPane agentId={agent.id} />}
      </div>
    </div>
  )
}
