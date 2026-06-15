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

// Matches palette.ts ROBE_COLORS — kept in sync manually to avoid importing pixi
const ROBE_HEX: Record<string, string> = {
  chanakya:      '#F4C430',
  aaruni:        '#C1440E',
  nachiketa:     '#5B7FA6',
  gargi:         '#9B6B9B',
  bharadwaja:    '#4A7C59',
  chandragupta:  '#E05A2B',
  vishnu_sharma: '#5B9B9B',
}

// Character archetype — matches the sprite description in assets.ts
const CHAR_EMOJI: Record<string, string> = {
  chanakya:      '🔮', // necromancer strategist
  aaruni:        '⚔️', // kobold warrior
  nachiketa:     '🗺️', // wandering seeker
  gargi:         '📚', // heroine philosopher
  bharadwaja:    '🛡️', // armored knight builder
  chandragupta:  '⚡', // samurai, swift
  vishnu_sharma: '📜', // old wizard scribe
}

// Tool name → readable activity phrase shown as the agent "dialogue"
const KRIYA_LABEL: Record<string, string> = {
  Bash:          'running command',
  Write:         'writing file',
  Read:          'reading file',
  Edit:          'editing code',
  Glob:          'searching files',
  Grep:          'scanning code',
  WebSearch:     'searching the web',
  WebFetch:      'fetching page',
  Agent:         'spawning agent',
  TodoRead:      'reading tasks',
  TodoWrite:     'updating tasks',
  NotebookEdit:  'editing notebook',
}

function robeColor(id: string): string {
  return ROBE_HEX[id] ?? '#8C7B6B'
}

function charEmoji(id: string): string {
  return CHAR_EMOJI[id] ?? '🧑‍💻'
}

function kriyaLabel(tool?: string): string {
  if (!tool) return ''
  return KRIYA_LABEL[tool] ?? tool.toLowerCase()
}

function panelClass(avastha: Agent['avastha'], selected: boolean): string {
  let cls = 'pixel-panel'
  if (selected) cls += ' pixel-panel--active'
  else if (avastha === 'working')    cls += ' pixel-panel--working'
  else if (avastha === 'processing') cls += ' pixel-panel--processing'
  else if (avastha === 'vighna')     cls += ' pixel-panel--vighna'
  return cls
}

const AVASTHA_DOT: Record<Agent['avastha'], string> = {
  idle:       'var(--color-idle)',
  working:    'var(--color-active)',
  processing: 'var(--color-gold)',
  vighna:     'var(--color-error)',
  siddhi:     'var(--color-success)',
}

const AVASTHA_LABEL: Record<Agent['avastha'], string> = {
  idle:       'idle',
  working:    'working',
  processing: 'awaiting',
  vighna:     'error',
  siddhi:     'done',
}

export default function ShishyaCard({ agent, selected, onClick }: Props): React.JSX.Element {
  const robe  = robeColor(agent.id)
  const emoji = charEmoji(agent.id)
  const isActive = agent.avastha === 'working' || agent.avastha === 'processing'
  const kriya = kriyaLabel(agent.lastKriya)

  return (
    <div
      className={panelClass(agent.avastha, selected)}
      onClick={onClick}
      style={{
        width: 152,
        minHeight: 80,
        flexShrink: 0,
        padding: '6px var(--space-2)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        transition: 'border-color 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Robe-color top bar (matches court sprite accent) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, background: robe, opacity: 0.85
      }} />

      {/* Avatar + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        {/* Robe-colored avatar circle with character emoji */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: robe + '22',
          border: `2px solid ${robe}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, lineHeight: 1
        }}>
          {emoji}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-pixel)', fontSize: 7,
            color: selected ? 'var(--color-gold)' : 'var(--color-text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {agent.name.toUpperCase()}
          </div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: 9,
            color: 'var(--color-text-dim)', marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {agent.domain}
          </div>
        </div>
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: AVASTHA_DOT[agent.avastha],
          display: 'inline-block',
          animation: isActive ? 'dot-blink 1.2s ease-in-out infinite' : undefined,
          boxShadow: isActive ? `0 0 6px ${AVASTHA_DOT[agent.avastha]}` : undefined,
        }} />
        <span style={{
          fontFamily: 'var(--font-pixel)', fontSize: 6,
          color: isActive ? AVASTHA_DOT[agent.avastha] : 'var(--color-text-secondary)',
          fontWeight: isActive ? 700 : undefined,
        }}>
          {AVASTHA_LABEL[agent.avastha]}
        </span>
      </div>

      {/* Activity dialogue — visible only when working */}
      {isActive && kriya && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 9,
          color: agent.avastha === 'processing' ? 'var(--color-gold)' : 'var(--color-active)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          paddingLeft: 12,
          opacity: 0.9,
        }}>
          ✦ {kriya}…
        </div>
      )}
    </div>
  )
}
