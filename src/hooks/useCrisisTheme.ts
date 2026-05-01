import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

const PALETTES = {
  safe:     { r: 0,   g: 180, b: 160, bgR: 5,  bgG: 12, bgB: 20 },
  watch:    { r: 125, g: 211, b: 252, bgR: 5,  bgG: 12, bgB: 22 },
  warning:  { r: 245, g: 158, b: 11,  bgR: 12, bgG: 8,  bgB: 5  },
  critical: { r: 249, g: 115, b: 22,  bgR: 15, bgG: 6,  bgB: 4  },
  zero:     { r: 220, g: 38,  b: 38,  bgR: 18, bgG: 4,  bgB: 4  },
}

export function useCrisisTheme() {
  const { crisisLevel } = useStore()
  const currentRef = useRef({ ...PALETTES.safe })
  const currentBgRef = useRef({ r: 5, g: 12, b: 20 })
  const animRef = useRef<number>(0)

  useEffect(() => {
    const target = PALETTES[crisisLevel as keyof typeof PALETTES] ?? PALETTES.safe
    const startAccent = { ...currentRef.current }
    const startBg = { ...currentBgRef.current }
    const startTime = performance.now()
    const duration = 1200

    if (animRef.current) cancelAnimationFrame(animRef.current)

    const animate = (now: number) => {
      const raw = (now - startTime) / duration
      const t = Math.min(raw, 1)
      const ease = 1 - Math.pow(1 - t, 3) // ease-out cubic

      const r = startAccent.r + (target.r - startAccent.r) * ease
      const g = startAccent.g + (target.g - startAccent.g) * ease
      const b = startAccent.b + (target.b - startAccent.b) * ease

      const bgR = startBg.r + (target.bgR - startBg.r) * ease
      const bgG = startBg.g + (target.bgG - startBg.g) * ease
      const bgB = startBg.b + (target.bgB - startBg.b) * ease

      const rr = Math.round(r), rg = Math.round(g), rb = Math.round(b)
      const bR = Math.round(bgR), bG = Math.round(bgG), bB = Math.round(bgB)

      document.documentElement.style.setProperty('--ca-r', String(rr))
      document.documentElement.style.setProperty('--ca-g', String(rg))
      document.documentElement.style.setProperty('--ca-b', String(rb))
      document.documentElement.style.setProperty('--crisis-accent', `rgb(${rr},${rg},${rb})`)
      document.documentElement.style.setProperty('--crisis-accent-raw', `${rr},${rg},${rb}`)
      document.documentElement.style.setProperty('--crisis-bg', `rgb(${bR},${bG},${bB})`)
      document.documentElement.style.setProperty(
        '--crisis-glow',
        `rgba(${rr},${rg},${rb},0.25)`
      )
      document.documentElement.style.setProperty(
        '--crisis-glow-strong',
        `rgba(${rr},${rg},${rb},0.5)`
      )

      currentRef.current = { r, g, b, bgR: bgR, bgG: bgG, bgB: bgB } as any

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        currentRef.current = { r: target.r, g: target.g, b: target.b } as any
        currentBgRef.current = { r: target.bgR, g: target.bgG, b: target.bgB }
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [crisisLevel])
}
