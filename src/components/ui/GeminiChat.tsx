import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { sendChatMessage } from '../../lib/api'
import type { ChatMessage } from '../../lib/api'

const AI_COLOR = '#10b981'
const AI_LIGHT = 'rgba(16,185,129,0.15)'
const G = (a: number) => `rgba(16,185,129,${a})`

const SUGGESTIONS = [
  'How long will my water last at current usage?',
  'Where can I get water in my city right now?',
  'What should I do first in a water emergency?',
  'How do I cut usage below 50L/day?',
  "What's the water situation in my city today?",
]

interface DisplayMessage extends ChatMessage {
  grounded?: boolean
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '4px 2px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: AI_COLOR }}
        />
      ))}
    </div>
  )
}

export function GeminiChat() {
  const { simulation, crisisLevel, currentDay, household } = useStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setHasUnread(false)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  // Reliable scroll-to-bottom: set scrollTop directly on the container
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Small delay so DOM has finished rendering the new message
    const id = setTimeout(() => {
      el.scrollTop = el.scrollHeight
    }, 60)
    return () => clearTimeout(id)
  }, [messages, loading])

  const context = simulation
    ? {
        city: (simulation as any).city?.name ?? 'your city',
        days_remaining: simulation.days.length - currentDay,
        crisis_level: crisisLevel,
        members: household?.members?.reduce((s: number, m: any) => s + m.count, 0) ?? 2,
        live_temp: (simulation as any).live_temp,
        daily_consumption: (simulation as any).daily_consumption,
        total_storage: (simulation as any).total_storage,
      }
    : {}

  const send = useCallback(
    async (text?: string) => {
      const userText = (text ?? input).trim()
      if (!userText || loading) return
      setInput('')

      const updated: DisplayMessage[] = [...messages, { role: 'user', content: userText }]
      setMessages(updated)
      setLoading(true)

      try {
        const result = await sendChatMessage(
          updated.map(m => ({ role: m.role, content: m.content })),
          context
        )
        setMessages(prev => [...prev, { role: 'model', content: result.reply, grounded: result.grounded }])
        if (!open) setHasUnread(true)
      } catch (e: any) {
        const detail = e?.response?.data?.detail || e?.message || 'Network error'
        setMessages(prev => [
          ...prev,
          { role: 'model', content: `${detail}` },
        ])
      } finally {
        setLoading(false)
      }
    },
    [messages, input, loading, context, open]
  )

  const crisisColor = {
    safe: '#00c4ae', watch: '#7dd3fc', warning: '#f59e0b', critical: '#f97316', zero: '#dc2626',
  }[crisisLevel] ?? '#00c4ae'

  const canSend = input.trim().length > 0 && !loading

  return (
    <>
      {/* ── Floating button ── */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.1, boxShadow: `0 0 40px ${G(0.55)}` }}
        whileTap={{ scale: 0.93 }}
        title="Water Crisis AI Assistant"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? `rgba(4,12,8,0.96)` : `linear-gradient(135deg, #047857 0%, #10b981 100%)`,
          border: `1.5px solid ${open ? G(0.35) : G(0.75)}`,
          boxShadow: open
            ? `0 0 20px ${G(0.2)}`
            : `0 0 30px ${G(0.5)}, 0 4px 20px rgba(0,0,0,0.45)`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white',
          transition: 'background 0.3s, border 0.3s',
        }}
      >
        <motion.span
          animate={open ? {} : { scale: [1, 1.15, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ fontSize: open ? 22 : 21, lineHeight: 1 }}
        >
          {open ? '✕' : '⬡'}
        </motion.span>

        {hasUnread && !open && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 10, height: 10, borderRadius: '50%',
              background: crisisColor, border: '2px solid #0d0906',
            }}
          />
        )}
      </motion.button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            style={{
              position: 'fixed', bottom: 96, right: 28, zIndex: 9998,
              width: 400, height: 600,
              background: 'rgba(4,12,8,0.97)',
              border: `1px solid ${G(0.2)}`,
              borderRadius: 22,
              boxShadow: `0 24px 70px rgba(0,0,0,0.65), 0 0 50px ${G(0.07)}`,
              display: 'flex', flexDirection: 'column',
              backdropFilter: 'blur(24px)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '13px 18px 12px',
              borderBottom: `1px solid ${G(0.12)}`,
              background: G(0.04),
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Hexagon logo */}
                <motion.div
                  animate={{ rotate: [0, 60, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: `linear-gradient(135deg, #047857, #10b981)`,
                    border: `1px solid ${G(0.4)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, color: 'white',
                    boxShadow: `0 0 12px ${G(0.35)}`,
                  }}
                >
                  ⬡
                </motion.div>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: AI_COLOR,
                    letterSpacing: '0.1em', fontFamily: 'var(--font-heading)',
                  }}>
                    WATER CRISIS AI
                  </div>
                  <div style={{ fontSize: 9, color: G(0.45), marginTop: 1 }}>
                    {simulation
                      ? `${(simulation as any).city?.name ?? 'City'} · ${crisisLevel.toUpperCase()} · Gemini 2.0`
                      : 'Gemini 2.0 Flash · Google Search'}
                  </div>
                </div>
              </div>

              {simulation && (
                <div style={{
                  padding: '3px 9px', borderRadius: 20, fontSize: 9, fontWeight: 600,
                  background: `${crisisColor}18`, border: `1px solid ${crisisColor}35`,
                  color: crisisColor, fontFamily: 'var(--font-mono)',
                }}>
                  {crisisLevel.toUpperCase()}
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{
              flex: 1, overflowY: 'auto', padding: '14px 14px 6px',
              display: 'flex', flexDirection: 'column', gap: 10,
              scrollbarWidth: 'thin',
              scrollbarColor: `${G(0.2)} transparent`,
              minHeight: 0,
            }}>
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
                  <p style={{
                    fontSize: 11, color: G(0.4), textAlign: 'center',
                    marginBottom: 14, fontStyle: 'italic',
                  }}>
                    Ask me anything about your water situation
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SUGGESTIONS.map(s => (
                      <motion.button
                        key={s}
                        whileHover={{ background: G(0.1), x: 2 }}
                        onClick={() => send(s)}
                        style={{
                          textAlign: 'left', padding: '9px 13px', borderRadius: 11,
                          fontSize: 11, background: G(0.05),
                          border: `1px solid ${G(0.12)}`,
                          color: 'rgba(134,210,170,0.8)', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {m.role === 'model' && (
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: `linear-gradient(135deg, #047857, #10b981)`,
                      border: `1px solid ${G(0.3)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: 'white', flexShrink: 0,
                      marginRight: 7, marginTop: 2,
                      boxShadow: `0 0 8px ${G(0.25)}`,
                    }}>
                      ⬡
                    </div>
                  )}
                  <div style={{
                    maxWidth: '80%', padding: '9px 13px',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: 12, lineHeight: 1.55,
                    background: m.role === 'user'
                      ? `linear-gradient(135deg, rgba(4,120,87,0.45), ${G(0.28)})`
                      : 'rgba(255,255,255,0.045)',
                    border: `1px solid ${m.role === 'user' ? G(0.35) : 'rgba(255,255,255,0.07)'}`,
                    color: m.role === 'user' ? '#d1fae5' : '#cdbfa8',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                    {m.grounded && (
                      <div style={{ marginTop: 5, fontSize: 9, color: G(0.5) }}>
                        🔍 live search
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7 }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: `linear-gradient(135deg, #047857, #10b981)`,
                    border: `1px solid ${G(0.3)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'white', flexShrink: 0,
                  }}>⬡</div>
                  <TypingDots />
                </motion.div>
              )}
            </div>

            {/* Input bar */}
            <div style={{
              padding: '10px 14px 14px',
              borderTop: `1px solid ${G(0.1)}`,
              background: G(0.03),
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                  }}
                  placeholder="Ask about your water crisis…"
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: G(0.06),
                    border: `1px solid ${input ? G(0.35) : G(0.15)}`,
                    borderRadius: 13, padding: '9px 14px',
                    fontSize: 12, color: '#d1fae5',
                    outline: 'none', transition: 'border 0.2s',
                  }}
                />
                <motion.button
                  whileHover={canSend ? { scale: 1.08 } : {}}
                  whileTap={canSend ? { scale: 0.94 } : {}}
                  onClick={() => send()}
                  disabled={!canSend}
                  style={{
                    width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                    background: canSend
                      ? 'linear-gradient(135deg, #047857, #10b981)'
                      : G(0.08),
                    border: 'none',
                    color: canSend ? 'white' : G(0.3),
                    cursor: canSend ? 'pointer' : 'not-allowed',
                    fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s, color 0.2s',
                    boxShadow: canSend ? `0 0 18px ${G(0.4)}` : 'none',
                  }}
                >
                  ➤
                </motion.button>
              </div>
              <div style={{ marginTop: 7, fontSize: 9, color: G(0.28), textAlign: 'center' }}>
                Gemini 2.0 Flash · context-aware · Google Search grounding
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
