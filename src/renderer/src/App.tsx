import React, { useState, useRef } from 'react'
import ShishyaPanel from './components/ShishyaPanel'
import ShishyaCard from './components/ShishyaCard'

interface Agent {
  id: string
  name: string
  domain: string
  avastha: 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'
  lastKriya?: string
}

const INITIAL_AGENTS: Agent[] = [
  { id: 'chanakya',      name: 'Chanakya',      domain: 'Orchestrator',   avastha: 'idle' },
  { id: 'aaruni',        name: 'Aaruni',         domain: 'Executor',       avastha: 'idle' },
  { id: 'nachiketa',     name: 'Nachiketa',      domain: 'Researcher',     avastha: 'idle' },
  { id: 'gargi',         name: 'Gargi',          domain: 'Analyst',        avastha: 'idle' },
  { id: 'bharadwaja',    name: 'Bharadwaja',     domain: 'Engineer',       avastha: 'idle' },
  { id: 'chandragupta',  name: 'Chandragupta',   domain: 'Executor-fast',  avastha: 'idle' },
  { id: 'vishnu_sharma', name: 'Vishnu Sharma',  domain: 'Scribe',         avastha: 'idle' }
]

export default function App(): React.JSX.Element {
  const [agents] = useState<Agent[]>(INITIAL_AGENTS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [aadesh, setAadesh] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null

  function sendAadesh(): void {
    if (!aadesh.trim()) return
    window.takshashila.sabha.sendAadesh(aadesh.trim())
    setAadesh('')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--color-stone)', color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Title bar */}
      <div style={{
        height: 'var(--titlebar-height)',
        background: 'var(--color-stone)',
        borderBottom: '1px solid var(--color-gold-dim)',
        display: 'flex', alignItems: 'center',
        paddingLeft: 'var(--space-4)',
        WebkitAppRegion: 'drag' as React.CSSProperties['WebkitAppRegion'],
        flexShrink: 0
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--color-gold)' }}>
          TAKSHASHILA
        </span>
      </div>

      {/* Main: court floor + detail panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Court floor placeholder */}
        <div style={{
          flex: 1, overflow: 'hidden',
          background: 'var(--color-courtyard)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.35
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--color-gold)' }}>
            Court Floor — M5
          </span>
        </div>

        {/* Shishya detail panel */}
        <ShishyaPanel agent={selectedAgent} />
      </div>

      {/* Agent strip */}
      <div style={{
        height: 'var(--strip-height)',
        borderTop: '1px solid var(--color-gold-dim)',
        background: 'var(--color-stone)',
        display: 'flex', alignItems: 'center',
        padding: '0 var(--space-4)',
        gap: 'var(--space-3)',
        overflowX: 'auto',
        flexShrink: 0
      }}>
        {agents.map((agent) => (
          <ShishyaCard
            key={agent.id}
            agent={agent}
            selected={agent.id === selectedId}
            onClick={() => setSelectedId(agent.id === selectedId ? null : agent.id)}
          />
        ))}
        <button
          style={{
            width: 48, height: 48, flexShrink: 0,
            background: 'none',
            border: '1px dashed var(--color-gold-dim)',
            color: 'var(--color-gold-dim)',
            fontSize: 20, cursor: 'pointer'
          }}
          title="Add Shishya"
        >
          +
        </button>
      </div>

      {/* Aadesh bar */}
      <div style={{
        height: 'var(--aadesh-bar-height)',
        borderTop: '1px solid var(--color-gold-dim)',
        background: 'var(--color-stone)',
        display: 'flex', alignItems: 'center',
        padding: '0 var(--space-4)', gap: 'var(--space-3)',
        flexShrink: 0
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--color-gold)', whiteSpace: 'nowrap' }}>
          ॥ Aadesh:
        </span>
        <input
          ref={inputRef}
          type="text"
          value={aadesh}
          onChange={(e) => setAadesh(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendAadesh()}
          placeholder="Issue a mandate to Chanakya…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-mono)', fontSize: 13,
            caretColor: 'var(--color-gold)'
          }}
        />
        <button
          onClick={sendAadesh}
          style={{
            background: aadesh.trim() ? 'var(--color-gold)' : 'none',
            border: '1px solid var(--color-gold-dim)',
            color: aadesh.trim() ? 'var(--color-stone)' : 'var(--color-gold-dim)',
            fontFamily: 'var(--font-pixel)', fontSize: 10,
            padding: '4px 10px', cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          ►
        </button>
      </div>
    </div>
  )
}
