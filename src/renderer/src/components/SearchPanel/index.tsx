import React, { useState, useEffect } from 'react'
import Modal from '../Modal'

interface Props {
  agents: { id: string; name: string }[]
  onClose: () => void
  onSelectAgent: (id: string) => void
}

type Tab = 'smriti' | 'itihas'

const inputStyle: React.CSSProperties = {
  background: 'var(--color-stone)',
  border: '1px solid var(--color-gold-dim)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-mono)', fontSize: 12,
  padding: '6px 8px', outline: 'none', width: '100%'
}

function clock(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour12: false }) } catch { return '' }
}

export default function SearchPanel({ agents, onClose, onSelectAgent }: Props): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('smriti')

  // Smriti search
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SmritiResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  // Itihas
  const [entries, setEntries] = useState<ItihasEntry[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    window.takshashila.sabha.getItihas(500).then((e) => setEntries(e.reverse()))
  }, [])

  function search(): void {
    if (!query.trim()) return
    setSearching(true)
    window.takshashila.smriti.search(query.trim()).then((r) => {
      setResults(r)
      setSearching(false)
    })
  }

  const nameOf = (id?: string): string => agents.find((a) => a.id === id)?.name ?? id ?? ''

  const f = filter.trim().toLowerCase()
  const visibleEntries = f
    ? entries.filter((e) =>
        e.event.toLowerCase().includes(f) ||
        (e.agentId ?? '').toLowerCase().includes(f) ||
        JSON.stringify(e.payload ?? '').toLowerCase().includes(f)
      )
    : entries

  return (
    <Modal title="॥ Khoj — Search the Sabha" onClose={onClose} width={620}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-gold-dim)', flexShrink: 0 }}>
        {(['smriti', 'itihas'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              background: tab === t ? 'var(--color-stone-light)' : 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--color-gold)' : '2px solid transparent',
              color: tab === t ? 'var(--color-gold)' : 'var(--color-text-dim)',
              fontFamily: 'var(--font-pixel)', fontSize: 8,
              padding: '8px 4px', cursor: 'pointer'
            }}
          >
            {t === 'smriti' ? '🧠 SMRITI' : '📜 ITIHAS'}
          </button>
        ))}
      </div>

      <div style={{
        padding: 'var(--space-3)', display: 'flex', flexDirection: 'column',
        gap: 'var(--space-3)', minHeight: 320, maxHeight: '60vh'
      }}>
        {tab === 'smriti' && (
          <>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Search every shishya's memory…"
                style={inputStyle}
                spellCheck={false}
              />
              <button
                onClick={search}
                style={{
                  background: 'var(--color-gold)', border: '1px solid var(--color-gold-dim)',
                  color: 'var(--color-stone)', fontFamily: 'var(--font-pixel)', fontSize: 8,
                  padding: '6px 14px', cursor: 'pointer', flexShrink: 0
                }}
              >
                {searching ? '…' : 'KHOJ'}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {results === null ? (
                <div style={{ color: 'var(--color-text-dim)', fontSize: 12, fontFamily: 'var(--font-body)' }}>
                  Search across all smriti.md files.
                </div>
              ) : results.length === 0 ? (
                <div style={{ color: 'var(--color-text-dim)', fontSize: 12, fontFamily: 'var(--font-body)' }}>
                  No shishya remembers “{query}”.
                </div>
              ) : (
                results.map((r, i) => (
                  <div
                    key={`${r.agentId}-${i}`}
                    onClick={() => { onSelectAgent(r.agentId); onClose() }}
                    style={{
                      padding: '8px 10px', marginBottom: 8, cursor: 'pointer',
                      background: 'var(--color-stone)',
                      border: '1px solid var(--color-gold-dim)'
                    }}
                    title="Open this shishya"
                  >
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--color-gold)', marginBottom: 2 }}>
                      {nameOf(r.agentId)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      …{r.excerpt}…
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'itihas' && (
          <>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter events — e.g. aadesh, hook:Stop, gargi…"
              style={{ ...inputStyle, flexShrink: 0 }}
              spellCheck={false}
            />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {visibleEntries.length === 0 ? (
                <div style={{ color: 'var(--color-text-dim)', fontSize: 12, fontFamily: 'var(--font-body)' }}>
                  No chronicle entries{f ? ' match' : ' yet'}.
                </div>
              ) : (
                visibleEntries.map((e, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'baseline',
                    padding: '3px 0',
                    borderBottom: '1px solid var(--color-stone-light)'
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-dim)', flexShrink: 0 }}>
                      {clock(e.timestamp)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-gold)', flexShrink: 0 }}>
                      {e.event}
                    </span>
                    {e.agentId && (
                      <span
                        onClick={() => { onSelectAgent(e.agentId!); onClose() }}
                        style={{
                          fontFamily: 'var(--font-body)', fontSize: 11,
                          color: 'var(--color-text-secondary)', cursor: 'pointer',
                          textDecoration: 'underline', flexShrink: 0
                        }}
                      >
                        {nameOf(e.agentId)}
                      </span>
                    )}
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-dim)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {e.payload ? JSON.stringify(e.payload) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
