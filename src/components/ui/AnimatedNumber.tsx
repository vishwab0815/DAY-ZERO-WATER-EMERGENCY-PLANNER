import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  style?: React.CSSProperties
  stiffness?: number
  damping?: number
  mass?: number
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  style,
  stiffness = 80,
  damping = 22,
  mass = 0.6,
}: AnimatedNumberProps) {
  const mv = useMotionValue(value)
  const spring = useSpring(mv, { stiffness, damping, mass })
  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`)

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  return (
    <motion.span className={className} style={style}>
      {display}
    </motion.span>
  )
}

// Larger dramatic version for hero numbers
export function HeroNumber({
  value,
  suffix = '',
  color,
  className,
}: {
  value: number
  suffix?: string
  color: string
  className?: string
}) {
  const mv = useMotionValue(value)
  const spring = useSpring(mv, { stiffness: 50, damping: 18, mass: 0.8 })
  const display = useTransform(spring, (v) => `${Math.round(v)}${suffix}`)

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  return (
    <motion.span
      className={className}
      style={{ color, display: 'inline-block', fontFamily: 'var(--font-heading)', fontWeight: 700 }}
    >
      {display}
    </motion.span>
  )
}
