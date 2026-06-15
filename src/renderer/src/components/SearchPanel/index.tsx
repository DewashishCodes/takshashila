import React, { useState, useEffect, useRef } from 'react'
import Modal from '../Modal'

interface Props {
  agents: { id: string; name: string }[]
  onClose: () => void
  onSelectAgent: (id: string) => void
}

type Tab = 'smriti' | 'itihas' | 'blackboard'

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

  // Smriti
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<SmritiResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  // Itihas — live tail while tab is open
  const [entries, setEntries] = useState<ItihasEntry[]>([])
  const [filter, setFilter]   = useState('')
  const itihasRef = useRef<HTMLDivElement>(null)

  // Blackboard
  const [board, setBoard]       = useState('')
  const [boardDirty, setBoardDirty] = useState(false)
  const [boardSaving, setBoardSaving] = useState(false)

  // Load itihas once + live tail when that tab is active
  useEffect(() => {
    window.takshashila.sabha.getItihas(500).then((e) => setEntries(e.reverse()))
  }, [])

  useEffect(() => {
    if (tab !== 'itihas') return
    const id = setInterval(() => {
      window.takshashila.sabha.getItihas(500).then((e) => setEntries(e.reverse()))
    }, 2000)
    return () => clearInterval(id)
  }, [tab])

  // Load blackboard when tab opens
  useEffect(() => {
    if (tab !== 'blackboard') return
    window.takshashila.sabha.getBlackboard().then((b) => { setBoard(b); setBoardDirty(false) })
  }, [tab])

  function search(): void {
    if (!query.trim()) return
    setSearching(true)
    window.takshashila.smriti.search(query.trim()).then((r) => {
      setResults(r)
      setSearching(false)
    })
  }

  function saveBlackboard(): void {
    setBoardSaving(true)
    window.takshashila.sabha.updateBlackboard(board).then(() => {
      setBoardDirty(false)
      setBoardSaving(false)
    }).catch(() => setBoardSaving(false))
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

  const TABS: { id: Tab; label: string }[] = [
    { id: 'smriti',     label: '🧠 SMRITI' },
    { id: 'itihas',     label: '📜 ITIHAS' },
    { id: 'blackboard', label: '🪨 BLACKBOARD' },
  ]

  return (
    <Modal title="॥ Khoj — Search the Sabha" onClose={onClose} width={640}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-gold-dim)', flexShrink: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              background: tab === t.id ? 'var(--color-stone-light)' : 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--color-gold)' : '2px solid transparent',
              color: tab === t.id ? 'var(--color-gold)' : 'var(--color-text-dim)',
              fontFamily: 'var(--font-pixel)', fontSize: 7,
              padding: '8px 4px', cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{
        padding: 'var(--space-3)', display: 'flex', flexDirection: 'column',
        gap: 'var(--space-3)', minHeight: 340, maxHeight: '62vh'
      }}>

        {/* ── Smriti search ── */}
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
                  No shishya remembers "{query}".
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

        {/* ── Itihas live tail ── */}
        {tab === 'itihas' && (
          <>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter — e.g. aadesh, hook:Stop, gargi…"
                style={inputStyle}
                spellCheck={false}
              />
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--color-active)', flexShrink: 0 }}>
                ● LIVE
              </span>
            </div>
            <div ref={itihasRef} style={{ flex: 1, overflowY: 'auto' }}>
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

        {/* ── Blackboard ── */}
        {tab === 'blackboard' && (
          <>
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-dim)' }}>
                Shared context visible to all shishyas.
              </span>
              <button
                onClick={saveBlackboard}
                disabled={!boardDirty || boardSaving}
                style={{
                  background: boardDirty ? 'var(--color-gold)' : 'transparent',
                  border: '1px solid var(--color-gold-dim)',
                  color: boardDirty ? 'var(--color-stone)' : 'var(--color-text-dim)',
                  fontFamily: 'var(--font-pixel)', fontSize: 7,
                  padding: '4px 12px', cursor: boardDirty ? 'pointer' : 'default'
                }}
              >
                {boardSaving ? 'SAVING…' : 'SAVE'}
              </button>
            </div>
            <textarea
              value={board}
              onChange={(e) => { setBoard(e.target.value); setBoardDirty(true) }}
              style={{
                flex: 1, background: 'var(--color-stone)',
                border: '1px solid var(--color-gold-dim)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                padding: 'var(--space-2)', outline: 'none', resize: 'none',
                lineHeight: 1.6
              }}
              spellCheck={false}
            />
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Local interface copies (avoid importing from preload) ─────────────────────
interface SmritiResult { agentId: string; excerpt: string; score: number }
interface ItihasEntry  { timestamp: string; event: string; agentId?: string; payload?: unknown }
