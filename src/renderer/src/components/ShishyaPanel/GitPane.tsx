import React, { useState, useEffect, useCallback } from 'react'

interface Props {
  agentId: string
}

const SECTION_STYLES: { key: keyof GitStatus; label: string; color: string }[] = [
  { key: 'staged',    label: 'STAGED',    color: 'var(--color-success)' },
  { key: 'modified',  label: 'MODIFIED',  color: 'var(--color-gold)' },
  { key: 'untracked', label: 'UNTRACKED', color: 'var(--color-text-secondary)' }
]

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function GitPane({ agentId }: Props): React.JSX.Element {
  const [status, setStatus] = useState<GitStatus>({ modified: [], staged: [], untracked: [] })
  const [log, setLog] = useState<GitCommit[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.all([
      window.takshashila.git.status(agentId),
      window.takshashila.git.log(agentId, 30),
      window.takshashila.git.branches(agentId)
    ]).then(([s, l, b]) => {
      setStatus(s)
      setLog(l)
      setBranches(b)
      setLoading(false)
    })
  }, [agentId])

  useEffect(() => { refresh() }, [refresh])

  const hasRepo = branches.length > 0 || log.length > 0
  const changeCount = status.staged.length + status.modified.length + status.untracked.length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3)' }}>
      {/* Header: branch + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--color-gold)' }}>
          ⎇ {branches[0] ?? 'no repo'}
        </span>
        {branches.length > 1 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-dim)' }}>
            +{branches.length - 1} more
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={refresh}
          style={{
            background: 'none', border: '1px solid var(--color-gold-dim)',
            color: 'var(--color-gold-dim)', fontFamily: 'var(--font-pixel)',
            fontSize: 7, padding: '3px 8px', cursor: 'pointer'
          }}
        >
          {loading ? '…' : '↻ REFRESH'}
        </button>
      </div>

      {!hasRepo && !loading ? (
        <div style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-body)', fontSize: 12 }}>
          No git repository in this kshetra yet.
        </div>
      ) : (
        <>
          {/* Working tree status */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: 7,
              color: 'var(--color-text-secondary)', marginBottom: 6
            }}>
              WORKING TREE {changeCount > 0 ? `(${changeCount})` : '— CLEAN'}
            </div>
            {SECTION_STYLES.map(({ key, label, color }) =>
              status[key].length === 0 ? null : (
                <div key={key} style={{ marginBottom: 6 }}>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color, marginBottom: 2 }}>
                    {label}
                  </div>
                  {status[key].map((f) => (
                    <div
                      key={f}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, color,
                        padding: '1px 0 1px 10px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}
                      title={f}
                    >
                      {f}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Commit log */}
          <div style={{
            fontFamily: 'var(--font-pixel)', fontSize: 7,
            color: 'var(--color-text-secondary)', marginBottom: 6
          }}>
            ITIHAS — COMMITS
          </div>
          {log.length === 0 ? (
            <div style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-body)', fontSize: 11 }}>
              No commits yet.
            </div>
          ) : (
            log.map((c) => (
              <div
                key={c.hash}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 8,
                  padding: '3px 0',
                  borderBottom: '1px solid var(--color-stone-mid)'
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--color-gold-dim)', flexShrink: 0
                }}>
                  {c.hash}
                </span>
                <span style={{
                  flex: 1, fontFamily: 'var(--font-body)', fontSize: 11,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }} title={c.message}>
                  {c.message}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color: 'var(--color-text-dim)', flexShrink: 0
                }}>
                  {timeAgo(c.timestamp)}
                </span>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
