import { useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'

const CRISIS_CONFIG = {
  safe:     { r: 0,   g: 180, b: 160, speed: 0.25, count: 55, opacity: 0.55, connectionOpacity: 0.08 },
  watch:    { r: 125, g: 211, b: 252, speed: 0.45, count: 60, opacity: 0.50, connectionOpacity: 0.07 },
  warning:  { r: 245, g: 158, b: 11,  speed: 0.90, count: 70, opacity: 0.60, connectionOpacity: 0.09 },
  critical: { r: 249, g: 115, b: 22,  speed: 1.60, count: 80, opacity: 0.65, connectionOpacity: 0.12 },
  zero:     { r: 220, g: 38,  b: 38,  speed: 2.80, count: 90, opacity: 0.70, connectionOpacity: 0.15 },
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number; opacity: number
  baseSpeed: number
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { crisisLevel } = useStore()
  const crisisRef = useRef(crisisLevel)
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const colorRef = useRef({ r: 0, g: 180, b: 160 })
  const targetColorRef = useRef({ r: 0, g: 180, b: 160 })

  useEffect(() => {
    crisisRef.current = crisisLevel
    const cfg = CRISIS_CONFIG[crisisLevel as keyof typeof CRISIS_CONFIG] ?? CRISIS_CONFIG.safe
    targetColorRef.current = { r: cfg.r, g: cfg.g, b: cfg.b }
  }, [crisisLevel])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Init particles
    const count = 65
    particlesRef.current = Array.from({ length: count }, () => {
      const speed = 0.15 + Math.random() * 0.35
      const angle = Math.random() * Math.PI * 2
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 0.8 + Math.random() * 1.8,
        opacity: 0.2 + Math.random() * 0.4,
        baseSpeed: speed,
      }
    })

    const draw = () => {
      const cfg = CRISIS_CONFIG[crisisRef.current as keyof typeof CRISIS_CONFIG] ?? CRISIS_CONFIG.safe

      // Lerp color toward target
      const tc = targetColorRef.current
      const cc = colorRef.current
      cc.r += (tc.r - cc.r) * 0.02
      cc.g += (tc.g - cc.g) * 0.02
      cc.b += (tc.b - cc.b) * 0.02

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      const speedMult = cfg.speed

      // Erratic bonus for zero state
      const erratic = crisisRef.current === 'zero' ? 0.04 : 0

      for (const p of particles) {
        // Update position
        if (erratic > 0) {
          p.vx += (Math.random() - 0.5) * erratic
          p.vy += (Math.random() - 0.5) * erratic
          // Dampen to prevent infinite acceleration
          const mag = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
          if (mag > p.baseSpeed * 3) {
            p.vx = (p.vx / mag) * p.baseSpeed * 3
            p.vy = (p.vy / mag) * p.baseSpeed * 3
          }
        }
        p.x += p.vx * speedMult
        p.y += p.vy * speedMult

        // Wrap
        if (p.x < -5) p.x = canvas.width + 5
        if (p.x > canvas.width + 5) p.x = -5
        if (p.y < -5) p.y = canvas.height + 5
        if (p.y > canvas.height + 5) p.y = -5

        // Draw particle with glow
        const alpha = p.opacity * cfg.opacity
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${Math.round(cc.r)},${Math.round(cc.g)},${Math.round(cc.b)},${alpha})`
        ctx.fill()
      }

      // Draw connections (only nearby pairs)
      const maxDist = 110
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * cfg.connectionOpacity
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(${Math.round(cc.r)},${Math.round(cc.g)},${Math.round(cc.b)},${alpha})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.9,
      }}
    />
  )
}
