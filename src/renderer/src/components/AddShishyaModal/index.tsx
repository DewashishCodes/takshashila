import React, { useState } from 'react'
import Modal from '../Modal'

interface Props {
  onClose: () => void
  onCreated: (agent: AgentIdentity) => void
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-stone)',
  border: '1px solid var(--color-gold-dim)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-mono)', fontSize: 12,
  padding: '6px 8px', outline: 'none', width: '100%'
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
        {label}
      </div>
      {children}
      {hint && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-text-dim)', marginTop: 2 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

export default function AddShishyaModal({ onClose, onCreated }: Props): React.JSX.Element {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [persona, setPersona] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = name.trim().length > 0 && domain.trim().length > 0 && !busy

  async function create(): Promise<void> {
    if (!canCreate) return
    setBusy(true)
    setError(null)
    try {
      const agent = await window.takshashila.sabha.addAgent(
        name.trim(),
        domain.trim(),
        persona.trim() || `${domain.trim()} specialist`
      )
      onCreated(agent)
    } catch (e) {
      // IPC wraps errors as "Error invoking remote method 'sabha:addAgent': Error: <msg>"
      const raw = e instanceof Error ? e.message : String(e)
      setError(raw.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, ''))
      setBusy(false)
    }
  }

  return (
    <Modal title="॥ New Shishya" onClose={onClose} width={440}>
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Field label="NAME" hint="The id is derived from this — e.g. “Panini” becomes panini">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="Panini"
            style={inputStyle}
            spellCheck={false}
          />
        </Field>

        <Field label="DOMAIN">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="Grammar, linting, code style"
            style={inputStyle}
            spellCheck={false}
          />
        </Field>

        <Field label="PERSONA" hint="Written to the agent's identity — how Chanakya describes them when routing">
          <textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="Reviews code style and naming with the rigor of a grammarian…"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </Field>

        {error && (
          <div style={{
            padding: '6px 8px',
            border: '1px solid var(--color-error)',
            color: 'var(--color-terracotta)',
            fontFamily: 'var(--font-body)', fontSize: 11
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--color-gold-dim)',
              color: 'var(--color-gold-dim)', fontFamily: 'var(--font-pixel)', fontSize: 9,
              padding: '8px 16px', cursor: 'pointer'
            }}
          >
            CANCEL
          </button>
          <button
            onClick={create}
            disabled={!canCreate}
            style={{
              background: canCreate ? 'var(--color-gold)' : 'var(--color-stone-light)',
              border: '1px solid var(--color-gold-dim)',
              color: canCreate ? 'var(--color-stone)' : 'var(--color-text-dim)',
              fontFamily: 'var(--font-pixel)', fontSize: 9,
              padding: '8px 16px', cursor: canCreate ? 'pointer' : 'default'
            }}
          >
            {busy ? 'SUMMONING…' : 'SUMMON'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
