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

  // Mount the Pixi scene once
  useEffect(() => {
    if (!hostRef.current) return
    const scene = new CourtScene(hostRef.current, (id) => onSelectRef.current(id))
    sceneRef.current = scene
    return () => {
      scene.destroy()
      sceneRef.current = null
    }
  }, [])

  // Push agent state into the scene
  useEffect(() => {
    sceneRef.current?.updateAgents(agents)
  }, [agents])

  useEffect(() => {
    sceneRef.current?.setSelected(selectedId)
  }, [selectedId])

  return (
    <div
      ref={hostRef}
      style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
    />
  )
}
