import { useEffect, useRef } from 'react'

interface GaugeRingProps {
  value: number        // 0-1 (for risk) or 0-100 (for score)
  max?: number
  label: string
  sublabel?: string
  type?: 'risk' | 'score'
  size?: number
}

function getRiskColor(value: number): string {
  if (value < 0.2) return '#00c4ae'
  if (value < 0.5) return '#7dd3fc'
  if (value < 0.7) return '#f59e0b'
  if (value < 0.85) return '#f97316'
  return '#dc2626'
}

function getScoreColor(value: number): string {
  if (value >= 70) return '#00c4ae'
  if (value >= 50) return '#7dd3fc'
  if (value >= 30) return '#f59e0b'
  return '#dc2626'
}

export function GaugeRing({ value, max = 1, label, sublabel, type = 'risk', size = 90 }: GaugeRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const normalized = type === 'risk' ? value : value / 100
  const color = type === 'risk' ? getRiskColor(value) : getScoreColor(value)

  const displayValue = type === 'risk'
    ? `${Math.round(value * 100)}%`
    : `${Math.round(value)}`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 7
    const startAngle = Math.PI * 0.75
    const endAngle = Math.PI * 2.25
    const totalArc = endAngle - startAngle

    // Background track
    ctx.beginPath()
    ctx.arc(cx, cy, r, startAngle, endAngle)
    ctx.strokeStyle = 'rgba(61, 45, 24, 0.6)'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.stroke()

    // Value arc
    if (normalized > 0) {
      const fillEnd = startAngle + totalArc * normalized
      ctx.beginPath()
      ctx.arc(cx, cy, r, startAngle, fillEnd)
      ctx.strokeStyle = color
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [value, normalized, color, size])

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <canvas ref={canvasRef} style={{ width: size, height: size }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
          <span
            className="font-mono font-bold leading-none"
            style={{ fontSize: size * 0.18, color }}
          >
            {displayValue}
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-heading font-medium tracking-wide" style={{ color: 'var(--color-text-secondary)', fontSize: 10 }}>
          {label}
        </div>
        {sublabel && (
          <div className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  )
}

export function BigGauge({ value, label, crisisColor }: { value: number; label: string; crisisColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = 160

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const startAngle = Math.PI * 0.75
    const endAngle = Math.PI * 2.25
    const arc = endAngle - startAngle

    // Outer glow ring
    for (let i = 0; i < 3; i++) {
      const r = size / 2 - 6 - i * 0.5
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(0,180,160,${0.04 - i * 0.01})`
      ctx.lineWidth = 2 + i
      ctx.stroke()
    }

    // Track
    const r = size / 2 - 14
    ctx.beginPath()
    ctx.arc(cx, cy, r, startAngle, endAngle)
    ctx.strokeStyle = 'rgba(61, 45, 24, 0.5)'
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.stroke()

    // Fill
    if (value > 0) {
      const fillEnd = startAngle + arc * (value / 100)
      ctx.beginPath()
      ctx.arc(cx, cy, r, startAngle, fillEnd)
      ctx.strokeStyle = crisisColor
      ctx.lineWidth = 10
      ctx.lineCap = 'round'
      ctx.shadowColor = crisisColor
      ctx.shadowBlur = 15
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const angle = startAngle + arc * (i / 10)
      const isMajor = i % 5 === 0
      const innerR = r - (isMajor ? 10 : 6)
      const outerR = r + (isMajor ? 8 : 5)
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR)
      ctx.strokeStyle = isMajor ? 'rgba(125,211,252,0.4)' : 'rgba(61,45,24,0.5)'
      ctx.lineWidth = isMajor ? 1.5 : 0.8
      ctx.stroke()
    }
  }, [value, crisisColor, size])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold text-4xl" style={{ color: crisisColor }}>
          {Math.round(value)}
        </span>
        <span className="text-xs font-heading tracking-widest mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      </div>
    </div>
  )
}
