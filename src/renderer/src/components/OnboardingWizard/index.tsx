import React, { useState, useEffect, useCallback } from 'react'
import Modal from '../Modal'

interface Props {
  agents: { id: string; name: string; domain: string }[]
  onDone: () => void
}

const STEPS = ['SWAGAT', 'PARIKSHA', 'SABHA'] as const

const inputStyle: React.CSSProperties = {
  background: 'var(--color-stone)',
  border: '1px solid var(--color-gold-dim)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-mono)', fontSize: 12,
  padding: '6px 8px', outline: 'none', width: '100%'
}

const primaryBtn: React.CSSProperties = {
  background: 'var(--color-gold)', border: '1px solid var(--color-gold-dim)',
  color: 'var(--color-stone)', fontFamily: 'var(--font-pixel)', fontSize: 9,
  padding: '8px 16px', cursor: 'pointer'
}

const ghostBtn: React.CSSProperties = {
  background: 'none', border: '1px solid var(--color-gold-dim)',
  color: 'var(--color-gold-dim)', fontFamily: 'var(--font-pixel)', fontSize: 9,
  padding: '8px 16px', cursor: 'pointer'
}

export default function OnboardingWizard({ agents, onDone }: Props): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [checks, setChecks] = useState<SystemCheckItem[] | null>(null)
  const [command, setCommand] = useState('claude')
  const [sabhaHome, setSabhaHome] = useState('')

  useEffect(() => {
    window.takshashila.config.get().then((cfg) => {
      setCommand(cfg.defaultCommand)
      setSabhaHome(cfg.sabhaHome)
    })
  }, [])

  const runChecks = useCallback(async (cmd: string) => {
    setChecks(null)
    await window.takshashila.config.set({ defaultCommand: cmd })
    setChecks(await window.takshashila.system.check())
  }, [])

  // Kick off the environment check as soon as the user reaches that step
  useEffect(() => {
    if (step === 1 && !checks) void runChecks(command)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function finish(): void {
    window.takshashila.config.set({ onboarded: true }).then(onDone)
  }

  return (
    <Modal title={`॥ Takshashila — ${STEPS[step]}`} width={560}>
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {STEPS.map((s, i) => (
            <span key={s} style={{
              width: 8, height: 8,
              background: i === step ? 'var(--color-gold)' : 'var(--color-stone-light)',
              border: '1px solid var(--color-gold-dim)'
            }} />
          ))}
        </div>

        {step === 0 && (
          <>
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--color-gold)' }}>
              तक्षशिला
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
              Welcome, Samrat. This is your court of AI scholars — a multi-agent Claude Code
              harness styled as the ancient university of Takshashila.
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              You issue an <b style={{ color: 'var(--color-gold)' }}>Aadesh</b> (mandate) from the bar at the bottom.
              <b style={{ color: 'var(--color-gold)' }}> Chanakya</b>, the orchestrator, routes work to specialist{' '}
              <b style={{ color: 'var(--color-gold)' }}>Shishyas</b>, each running their own Claude Code session in
              an isolated workspace (<b style={{ color: 'var(--color-gold)' }}>Kshetra</b>). When a decision needs
              your approval, an <b style={{ color: 'var(--color-gold)' }}>Anumati</b> request appears.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Checking the tools the court depends on:
            </p>
            {checks === null ? (
              <div style={{ color: 'var(--color-text-dim)', fontSize: 12, padding: 'var(--space-3) 0' }}>
                Examining the environment…
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checks.map((c) => (
                  <div key={c.id} style={{
                    display: 'flex', gap: 10, alignItems: 'baseline',
                    padding: '6px 8px',
                    background: 'var(--color-stone)',
                    border: `1px solid ${c.found ? 'var(--color-success)' : c.required ? 'var(--color-error)' : 'var(--color-gold-dim)'}`
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-pixel)', fontSize: 9, flexShrink: 0,
                      color: c.found ? 'var(--color-success)' : c.required ? 'var(--color-error)' : 'var(--color-gold-dim)'
                    }}>
                      {c.found ? '✓' : '✗'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, flexShrink: 0, width: 150 }}>
                      {c.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: c.found ? 'var(--color-text-secondary)' : 'var(--color-terracotta)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }} title={c.detail}>
                      {c.detail}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                CLAUDE COMMAND
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runChecks(command)}
                  style={inputStyle}
                  spellCheck={false}
                />
                <button onClick={() => runChecks(command)} style={ghostBtn}>RE-CHECK</button>
              </div>
            </div>

            <div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                SABHA HOME
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-dim)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }} title={sabhaHome}>
                {sabhaHome}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              The court convenes with seven scholars. Click any of them on the floor (or in the
              strip below) to open their terminal, files, git, and smriti.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {agents.map((a) => (
                <div key={a.id} style={{
                  padding: '8px 10px',
                  background: 'var(--color-stone)',
                  border: '1px solid var(--color-gold-dim)'
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--color-gold)' }}>
                    {a.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {a.domain}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} style={ghostBtn}>◄ BACK</button>
          ) : (
            <button onClick={finish} style={{ ...ghostBtn, border: 'none', color: 'var(--color-text-dim)' }}>
              SKIP
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} style={primaryBtn}>NEXT ►</button>
          ) : (
            <button onClick={finish} style={primaryBtn}>ENTER THE COURT</button>
          )}
        </div>
      </div>
    </Modal>
  )
}
