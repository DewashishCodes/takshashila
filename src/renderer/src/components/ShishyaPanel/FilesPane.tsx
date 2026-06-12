import React, { useState, useEffect, useCallback } from 'react'
import Editor from './Editor'

interface Props {
  agentId: string
}

// Files the kshetra always contains but the Samrat rarely wants in the way
const DIM_NAMES = new Set(['.git', 'node_modules', '.claude'])

function sortEntries(entries: FsEntry[]): FsEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export default function FilesPane({ agentId }: Props): React.JSX.Element {
  const [rootEntries, setRootEntries] = useState<FsEntry[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [children, setChildren] = useState<Record<string, FsEntry[]>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)

  const loadRoot = useCallback(() => {
    window.takshashila.fs.listDir(agentId, '.').then((entries) => setRootEntries(sortEntries(entries)))
  }, [agentId])

  useEffect(() => {
    setExpanded(new Set())
    setChildren({})
    setSelected(null)
    setContent('')
    setDirty(false)
    loadRoot()
  }, [agentId, loadRoot])

  function toggleDir(path: string): void {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
        if (!children[path]) {
          window.takshashila.fs.listDir(agentId, path).then((entries) =>
            setChildren((c) => ({ ...c, [path]: sortEntries(entries) }))
          )
        }
      }
      return next
    })
  }

  function openFile(path: string): void {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    window.takshashila.fs.readFile(agentId, path).then((text) => {
      setSelected(path)
      setContent(text)
      setDirty(false)
    })
  }

  function save(): void {
    if (!selected) return
    window.takshashila.fs.writeFile(agentId, selected, content).then(() => {
      setDirty(false)
      setSaveFlash(true)
      setTimeout(() => setSaveFlash(false), 1200)
    })
  }

  function renderEntries(entries: FsEntry[], depth: number): React.JSX.Element[] {
    return entries.flatMap((e) => {
      const isOpen = expanded.has(e.path)
      const row = (
        <div
          key={e.path}
          onClick={() => (e.isDir ? toggleDir(e.path) : openFile(e.path))}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: `2px ${8 + depth * 14}px`,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: selected === e.path
              ? 'var(--color-gold)'
              : DIM_NAMES.has(e.name) ? 'var(--color-text-dim)' : 'var(--color-text-primary)',
            background: selected === e.path ? 'var(--color-stone-light)' : 'transparent',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            userSelect: 'none'
          }}
          title={e.path}
        >
          <span style={{ flexShrink: 0, fontSize: 9, width: 12, color: 'var(--color-gold-dim)' }}>
            {e.isDir ? (isOpen ? '▼' : '►') : '·'}
          </span>
          {e.name}
        </div>
      )
      const kids = e.isDir && isOpen && children[e.path]
        ? renderEntries(children[e.path], depth + 1)
        : []
      return [row, ...kids]
    })
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Tree */}
      <div style={{
        width: 180, flexShrink: 0,
        borderRight: '1px solid var(--color-gold-dim)',
        overflowY: 'auto',
        background: 'var(--color-stone-mid)',
        paddingTop: 4
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 8px 4px'
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--color-text-secondary)' }}>
            KSHETRA
          </span>
          <button
            onClick={loadRoot}
            title="Refresh"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-gold-dim)', fontSize: 11, padding: 0
            }}
          >
            ↻
          </button>
        </div>
        {rootEntries.length === 0 ? (
          <div style={{
            padding: 8, fontFamily: 'var(--font-body)', fontSize: 11,
            color: 'var(--color-text-dim)'
          }}>
            Empty kshetra
          </div>
        ) : renderEntries(rootEntries, 0)}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 8px',
              borderBottom: '1px solid var(--color-gold-dim)',
              flexShrink: 0
            }}>
              <span style={{
                flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {selected}{dirty ? ' ●' : ''}
              </span>
              <button
                onClick={save}
                disabled={!dirty}
                style={{
                  background: dirty ? 'var(--color-gold)' : 'transparent',
                  border: '1px solid var(--color-gold-dim)',
                  color: saveFlash ? 'var(--color-success)' : dirty ? 'var(--color-stone)' : 'var(--color-text-dim)',
                  fontFamily: 'var(--font-pixel)', fontSize: 7,
                  padding: '3px 8px',
                  cursor: dirty ? 'pointer' : 'default'
                }}
              >
                {saveFlash ? 'SAVED' : 'SAVE'}
              </button>
            </div>
            <Editor
              key={`${agentId}:${selected}`}
              value={content}
              filename={selected}
              onChange={(v) => { setContent(v); setDirty(true) }}
              onSave={save}
            />
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-dim)', fontFamily: 'var(--font-body)', fontSize: 12
          }}>
            Select a manuscript
          </div>
        )}
      </div>
    </div>
  )
}
