import React, { useState, useRef, useEffect, useCallback } from 'react'
import ShishyaPanel from './components/ShishyaPanel'
import ShishyaCard from './components/ShishyaCard'
import CourtFloor from './components/CourtFloor'
import OnboardingWizard from './components/OnboardingWizard'
import AddShishyaModal from './components/AddShishyaModal'
import SearchPanel from './components/SearchPanel'
import AnumatiPanel from './components/AnumatiPanel'

interface Agent {
  id: string
  name: string
  domain: string
  avastha: 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'
  lastKriya?: string
}

// Fallback while Sabha loads
const AGENT_SEEDS: Agent[] = [
  { id: 'chanakya',      name: 'Chanakya',      domain: 'Orchestrator',   avastha: 'idle' },
  { id: 'aaruni',        name: 'Aaruni',         domain: 'Executor',       avastha: 'idle' },
  { id: 'nachiketa',     name: 'Nachiketa',      domain: 'Researcher',     avastha: 'idle' },
  { id: 'gargi',         name: 'Gargi',          domain: 'Analyst',        avastha: 'idle' },
  { id: 'bharadwaja',    name: 'Bharadwaja',     domain: 'Engineer',       avastha: 'idle' },
  { id: 'chandragupta',  name: 'Chandragupta',   domain: 'Executor-fast',  avastha: 'idle' },
  { id: 'vishnu_sharma', name: 'Vishnu Sharma',  domain: 'Scribe',         avastha: 'idle' }
]

export default function App(): React.JSX.Element {
  const [agents, setAgents] = useState<Agent[]>(AGENT_SEEDS)
  const [selectedId, setSelectedId] = useState<string | null>('chanakya')
  const [aadesh, setAadesh] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showAddShishya, setShowAddShishya] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [aadeshHistory, setAadeshHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const refreshAgents = useCallback(() => {
    window.takshashila.sabha.getAgents().then((loaded) => {
      if (loaded.length > 0) setAgents(loaded.map(a => ({ ...a, lastKriya: undefined })))
    }).catch(() => { /* use seeds */ })
  }, [])

  // Load agents from Sabha on mount
  useEffect(() => {
    refreshAgents()

    // First run: show the onboarding wizard
    window.takshashila.config.get().then((cfg) => {
      if (!cfg.onboarded) setShowOnboarding(true)
    }).catch(() => { /* skip */ })

    // Subscribe to avastha changes
    const unsub = window.takshashila.sabha.onAvashtaChange((update) => {
      setAgents(prev => prev.map(a =>
        a.id === update.agentId
          ? { ...a, avastha: update.avastha, lastKriya: update.lastKriya }
          : a
      ))
    })

    // Ctrl/Cmd+K opens the search panel
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      unsub()
      window.removeEventListener('keydown', onKey)
    }
  }, [refreshAgents])

  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null

  function sendAadesh(): void {
    if (!aadesh.trim()) return
    setAadeshHistory((prev) => [aadesh.trim(), ...prev.slice(0, 49)])
    setHistoryIndex(-1)
    window.takshashila.sabha.sendAadesh(aadesh.trim())
    setAadesh('')
  }

  function handleAadeshKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') { sendAadesh(); return }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(historyIndex + 1, aadeshHistory.length - 1)
      if (next >= 0) { setHistoryIndex(next); setAadesh(aadeshHistory[next]) }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = historyIndex - 1
      if (next < 0) { setHistoryIndex(-1); setAadesh('') }
      else { setHistoryIndex(next); setAadesh(aadeshHistory[next]) }
    }
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
        flexShrink: 0,
        ...({ WebkitAppRegion: 'drag' } as React.CSSProperties)
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--color-gold)', flex: 1 }}>
          TAKSHASHILA
        </span>
        <button
          onClick={() => setShowSearch(true)}
          title="Search smriti & itihas (Ctrl+K)"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-gold-dim)', fontSize: 12,
            padding: '0 var(--space-4)', height: '100%',
            ...({ WebkitAppRegion: 'no-drag' } as React.CSSProperties)
          }}
        >
          🔍
        </button>
      </div>

      {/* Main: court floor + detail panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Court floor — Pixi.js scene */}
        <CourtFloor
          agents={agents}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />

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
          onClick={() => setShowAddShishya(true)}
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
          onKeyDown={handleAadeshKey}
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

      {/* Anumati toast stack — approval requests from agent sessions */}
      <AnumatiPanel />

      {/* Overlays */}
      {showOnboarding && (
        <OnboardingWizard
          agents={agents}
          onDone={() => setShowOnboarding(false)}
        />
      )}
      {showAddShishya && (
        <AddShishyaModal
          onClose={() => setShowAddShishya(false)}
          onCreated={(agent) => {
            setShowAddShishya(false)
            refreshAgents()
            setSelectedId(agent.id)
          }}
        />
      )}
      {showSearch && (
        <SearchPanel
          agents={agents}
          onClose={() => setShowSearch(false)}
          onSelectAgent={(id) => setSelectedId(id)}
        />
      )}
    </div>
  )
}
