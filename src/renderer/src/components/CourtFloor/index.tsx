import React, { useEffect, useRef, useState, useCallback } from 'react'
import { CourtScene } from '../../scene/court/CourtScene'
import { loadCourtAssets } from '../../scene/court/assets'
import { DESK_POSITIONS } from '../../scene/court/layout'

interface Agent {
  id: string
  name: string
  domain: string
  avastha: 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'
  lastKriya?: string
}

interface Props {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

interface Bubble {
  id: string
  from: string
  fromName: string
  to: string
  toName: string
  subject: string
  screenX: number
  screenY: number
  born: number
}

interface LogEntry {
  id: string
  from: string
  fromName: string
  to: string
  toName: string
  subject: string
  body: string
  timestamp: string
}

// Matches palette.ts ROBE_COLORS — hex string form
const ROBE_HEX: Record<string, string> = {
  chanakya:      '#F4C430',
  aaruni:        '#C1440E',
  nachiketa:     '#5B7FA6',
  gargi:         '#9B6B9B',
  bharadwaja:    '#4A7C59',
  chandragupta:  '#E05A2B',
  vishnu_sharma: '#5B9B9B',
}

function robeColor(id: string): string { return ROBE_HEX[id] ?? '#8C7B6B' }

function agentName(agents: Agent[], id: string): string {
  return agents.find((a) => a.id === id)?.name ?? id
}

function clock(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

const BUBBLE_TTL = 5000 // ms before a speech bubble fades

export default function CourtFloor({ agents, selectedId, onSelect }: Props): React.JSX.Element {
  const hostRef       = useRef<HTMLDivElement>(null)
  const sceneRef      = useRef<CourtScene | null>(null)
  const onSelectRef   = useRef(onSelect)
  onSelectRef.current = onSelect
  const agentsRef     = useRef(agents)
  agentsRef.current   = agents
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  const [sceneError, setSceneError] = useState<string | null>(null)
  const [bubbles, setBubbles]       = useState<Bubble[]>([])
  const [log, setLog]               = useState<LogEntry[]>([])
  const [showLog, setShowLog]       = useState(false)

  // ── Scene mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hostRef.current) return
    const host = hostRef.current
    let scene: CourtScene | null = null
    let unsubSandesh: (() => void) | null = null
    let cancelled = false

    loadCourtAssets()
      .then((assets) => {
        if (cancelled) return
        scene = new CourtScene(host, (id) => onSelectRef.current(id), assets)
        sceneRef.current = scene
        scene.updateAgents(agentsRef.current)
        if (selectedIdRef.current) scene.setSelected(selectedIdRef.current)
        // scroll arc animation in Pixi
        unsubSandesh = window.takshashila.sabha.onSandesh((msg) => {
          sceneRef.current?.playScroll(msg.from, msg.to)
        })
      })
      .catch((err) => {
        console.error('[CourtFloor] scene failed to start:', err)
        if (!cancelled) setSceneError((err as Error).message ?? String(err))
      })

    return () => {
      cancelled = true
      unsubSandesh?.()
      scene?.destroy()
      sceneRef.current = null
    }
  }, [])

  // ── Avastha → Pixi + samrat scroll trigger ───────────────────────────────────
  const prevAvasthaRef = useRef<Record<string, string>>({})
  useEffect(() => {
    try {
      const chanakya = agents.find((a) => a.id === 'chanakya')
      const prev = prevAvasthaRef.current['chanakya']
      if (chanakya && chanakya.avastha === 'working' && prev && prev !== 'working') {
        sceneRef.current?.playScroll('samrat', 'chanakya')
      }
      for (const a of agents) prevAvasthaRef.current[a.id] = a.avastha
      sceneRef.current?.updateAgents(agents)
    } catch (err) { console.error('[CourtFloor] updateAgents failed:', err) }
  }, [agents])

  useEffect(() => {
    sceneRef.current?.setSelected(selectedId)
  }, [selectedId])

  // ── Dialogue subscription — independent of scene load ────────────────────────
  useEffect(() => {
    const unsub = window.takshashila.sabha.onSandesh((msg) => {
      const fromName = agentName(agentsRef.current, msg.from)
      const toName   = agentName(agentsRef.current, msg.to)

      // Speech bubble: project sender's desk from world → screen coords
      const seat = DESK_POSITIONS[msg.from]
      if (seat) {
        const { x: wx, y: wy, scale } = sceneRef.current?.getWorldTransform()
          ?? { x: 0, y: 0, scale: 1 }
        const screenX = seat.x * scale + wx
        const screenY = (seat.y - 70) * scale + wy  // above the avatar head

        setBubbles((prev) => [
          ...prev.filter((b) => Date.now() - b.born < BUBBLE_TTL),
          { id: msg.id, from: msg.from, fromName, to: msg.to, toName,
            subject: msg.subject, screenX, screenY, born: Date.now() }
        ])
      }

      // Dialogue log — newest first, cap at 40
      setLog((prev) => [
        { id: msg.id, from: msg.from, fromName, to: msg.to, toName,
          subject: msg.subject, body: msg.body, timestamp: msg.timestamp },
        ...prev
      ].slice(0, 40))
    })

    // Sweep expired bubbles every 500ms
    const sweep = setInterval(() => {
      setBubbles((prev) => prev.filter((b) => Date.now() - b.born < BUBBLE_TTL))
    }, 500)

    return () => { unsub(); clearInterval(sweep) }
  }, [])

  const toggleLog = useCallback(() => setShowLog((v) => !v), [])

  if (sceneError) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)',
        background: 'var(--color-stone)', padding: 'var(--space-6)'
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--color-terracotta)' }}>
          Court floor could not be raised
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--color-text-secondary)', maxWidth: 480, textAlign: 'center'
        }}>
          {sceneError}
        </span>
      </div>
    )
  }

  return (
    <div ref={hostRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

      {/* ── Speech bubbles ── */}
      {bubbles.map((b) => {
        const age     = Date.now() - b.born
        const opacity = age > BUBBLE_TTL * 0.7
          ? 1 - (age - BUBBLE_TTL * 0.7) / (BUBBLE_TTL * 0.3)
          : 1
        const color   = robeColor(b.from)

        return (
          <div
            key={b.id}
            style={{
              position:  'absolute',
              left:      b.screenX,
              top:       b.screenY,
              transform: 'translate(-50%, -100%)',
              zIndex:    30,
              pointerEvents: 'none',
              opacity:   Math.max(0, opacity),
              transition: 'opacity 0.3s',
              maxWidth:  200,
            }}
          >
            {/* Bubble body */}
            <div style={{
              background:   'var(--color-stone-mid)',
              border:       `2px solid ${color}`,
              padding:      '5px 8px',
              fontSize:     10,
              fontFamily:   'var(--font-body)',
              color:        'var(--color-text-primary)',
              boxShadow:    `0 0 10px ${color}55`,
              lineHeight:   1.4,
            }}>
              <div style={{
                fontFamily: 'var(--font-pixel)', fontSize: 7,
                color, marginBottom: 3, whiteSpace: 'nowrap'
              }}>
                {b.fromName} → {b.toName}
              </div>
              <div style={{
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {b.subject}
              </div>
            </div>
            {/* Downward tail */}
            <div style={{
              width: 0, height: 0, margin: '0 auto',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `7px solid ${color}`,
            }} />
          </div>
        )
      })}

      {/* ── Dialogue feed toggle ── */}
      <button
        onClick={toggleLog}
        title="Sabha Dialogue (agent conversations)"
        style={{
          position: 'absolute', bottom: 8, left: 8, zIndex: 40,
          background: showLog ? 'var(--color-gold)' : 'var(--color-stone-mid)',
          border: `1px solid ${showLog ? 'var(--color-gold)' : 'var(--color-gold-dim)'}`,
          color: showLog ? 'var(--color-stone)' : 'var(--color-gold-dim)',
          fontFamily: 'var(--font-pixel)', fontSize: 7,
          padding: '4px 8px', cursor: 'pointer',
        }}
      >
        {log.length > 0 && !showLog && (
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: 'var(--color-active)', marginRight: 4,
            animation: 'dot-blink 1.2s ease-in-out infinite',
          }} />
        )}
        ॥ DIALOGUE
      </button>

      {/* ── Dialogue feed panel ── */}
      {showLog && (
        <div
          className="pixel-panel"
          style={{
            position: 'absolute', bottom: 36, left: 8, zIndex: 40,
            width: 280, maxHeight: 320, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{
            padding: '6px 10px',
            borderBottom: '1px solid var(--color-gold-dim)',
            fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--color-gold)',
            flexShrink: 0,
          }}>
            ॥ Sabha Dialogue
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {log.length === 0 ? (
              <div style={{
                padding: '12px 10px',
                fontFamily: 'var(--font-body)', fontSize: 11,
                color: 'var(--color-text-dim)',
              }}>
                No messages yet. Send an Aadesh to start.
              </div>
            ) : (
              log.map((entry) => {
                const fromColor = robeColor(entry.from)
                const toColor   = robeColor(entry.to)
                return (
                  <div
                    key={entry.id}
                    style={{
                      padding: '6px 10px',
                      borderBottom: '1px solid var(--color-stone-light)',
                    }}
                  >
                    {/* Header: from → to + time */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: 4, marginBottom: 3,
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-pixel)', fontSize: 7,
                        color: fromColor,
                      }}>
                        {entry.fromName}
                      </span>
                      <span style={{ color: 'var(--color-text-dim)', fontSize: 10 }}>→</span>
                      <span style={{
                        fontFamily: 'var(--font-pixel)', fontSize: 7,
                        color: toColor,
                      }}>
                        {entry.toName}
                      </span>
                      <span style={{
                        marginLeft: 'auto',
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        color: 'var(--color-text-dim)',
                      }}>
                        {clock(entry.timestamp)}
                      </span>
                    </div>
                    {/* Subject */}
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: 11,
                      color: 'var(--color-text-primary)',
                      fontStyle: 'italic',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      "{entry.subject}"
                    </div>
                    {/* Body preview if meaningful */}
                    {entry.body && entry.body !== entry.subject && (
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        color: 'var(--color-text-dim)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {entry.body.slice(0, 80)}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
