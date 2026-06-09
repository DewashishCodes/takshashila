import React, { useEffect, useRef } from 'react'
import { CourtScene } from '../../scene/court/CourtScene'

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

export default function CourtFloor({ agents, selectedId, onSelect }: Props): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CourtScene | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [sceneError, setSceneError] = React.useState<string | null>(null)

  // Mount the Pixi scene once. A scene failure must never take down the
  // whole React tree — degrade to a visible error instead.
  useEffect(() => {
    if (!hostRef.current) return
    let scene: CourtScene | null = null
    try {
      scene = new CourtScene(hostRef.current, (id) => onSelectRef.current(id))
      sceneRef.current = scene
    } catch (err) {
      console.error('[CourtFloor] scene failed to start:', err)
      setSceneError((err as Error).message ?? String(err))
    }
    return () => {
      scene?.destroy()
      sceneRef.current = null
    }
  }, [])

  // Push agent state into the scene
  useEffect(() => {
    try { sceneRef.current?.updateAgents(agents) }
    catch (err) { console.error('[CourtFloor] updateAgents failed:', err) }
  }, [agents])

  useEffect(() => {
    sceneRef.current?.setSelected(selectedId)
  }, [selectedId])

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
    <div
      ref={hostRef}
      style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
    />
  )
}
