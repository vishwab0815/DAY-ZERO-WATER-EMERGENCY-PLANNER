import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Truck, Building, Droplets, ShieldCheck, CloudRain, Drill } from 'lucide-react'
import { getAlternatives } from '../lib/api'
import { useStore } from '../store/useStore'
import type { Alternative } from '../types'

const TYPE_ICONS: Record<string, React.ElementType> = {
  tanker: Truck,
  ro_shop: Droplets,
  atm: Building,
  borewell: Drill,
  rainwater: CloudRain,
  government: ShieldCheck,
}

const QUALITY_LABELS: Record<string, { label: string; color: string }> = {
  potable: { label: 'Drinkable', color: '#00c4ae' },
  utility_safe: { label: 'Utility Safe', color: '#7dd3fc' },
  utility_safe_with_treatment: { label: 'Treat Before Use', color: '#f59e0b' },
  test_required: { label: 'Test Required', color: '#f59e0b' },
}

function AlternativeCard({ alt, delay }: { alt: Alternative; delay: number }) {
  const Icon = TYPE_ICONS[alt.type] ?? Droplets
  const quality = QUALITY_LABELS[alt.quality] ?? { label: alt.quality, color: '#94a3b8' }

  const borderColor = !alt.available
    ? 'rgba(61,45,24,0.3)'
    : alt.crisis_price_warning
    ? 'rgba(245,158,11,0.35)'
    : 'rgba(0,180,160,0.25)'

  const accentColor = !alt.available ? '#475569' : alt.crisis_price_warning ? '#f59e0b' : '#00c4ae'

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
      style={{
        background: alt.available ? 'rgba(26,19,10,0.8)' : 'rgba(10,8,5,0.6)',
        border: `1px solid ${borderColor}`,
        opacity: alt.available ? 1 : 0.55,
      }}
    >
      {/* Background glow for available sources */}
      {alt.available && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 120, height: 120,
          background: `radial-gradient(circle at 80% 20%, ${accentColor}08 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
          <Icon size={18} style={{ color: accentColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading font-semibold text-sm" style={{ color: alt.available ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
              {alt.title}
            </span>
            {!alt.available && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(71,85,105,0.3)', color: 'var(--color-text-muted)', fontSize: 9 }}>
                UNAVAILABLE
              </span>
            )}
            {alt.crisis_price_warning && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 9 }}>
                CRISIS PRICING
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-md"
              style={{ background: `${quality.color}12`, color: quality.color, border: `1px solid ${quality.color}25`, fontSize: 9 }}>
              {quality.label}
            </span>
            {alt.quality_risk && (
              <span className="text-xs" style={{ color: '#f59e0b', fontSize: 9 }}>⚠ {alt.quality_risk} contamination risk</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center px-3 py-2.5 rounded-xl" style={{ background: 'rgba(61,45,24,0.3)' }}>
          <div className="font-mono font-bold text-base" style={{ color: accentColor }}>
            {alt.cost_inr === 0 ? 'Free' : `₹${alt.cost_inr.toLocaleString('en-IN')}`}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
            {alt.cost_inr > 0 ? `₹${alt.cost_per_liter}/L` : 'no cost'}
          </div>
        </div>
        <div className="text-center px-3 py-2.5 rounded-xl" style={{ background: 'rgba(61,45,24,0.3)' }}>
          <div className="font-mono font-bold text-base" style={{ color: accentColor }}>
            {alt.liters === 0 ? 'Varies' : `${alt.liters}L`}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>per order</div>
        </div>
        <div className="text-center px-3 py-2.5 rounded-xl" style={{ background: 'rgba(61,45,24,0.3)' }}>
          <div className="font-mono font-bold text-base" style={{ color: accentColor }}>
            {alt.delivery_hours === null ? 'Seasonal'
              : alt.delivery_hours === undefined ? 'Seasonal'
              : alt.delivery_hours === 0 ? 'Instant'
              : `${alt.delivery_hours}h`}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>
            {alt.type === 'government' ? `starts day ${alt.latency_days ?? 4}` : 'wait time'}
          </div>
        </div>
      </div>

      {/* Notes */}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {alt.notes}
      </p>

      {/* Rainwater potential */}
      {alt.type === 'rainwater' && alt.roof_area_sqm && (
        <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(0,180,160,0.08)', border: '1px solid rgba(0,180,160,0.2)', color: 'var(--color-teal)' }}>
          💡 1mm rain on your {alt.roof_area_sqm}m² roof = {Math.round(alt.roof_area_sqm * 0.8)}L harvested
        </div>
      )}
    </motion.div>
  )
}

export function Alternatives() {
  const { household, simulation } = useStore()
  const [alternatives, setAlternatives] = useState<Alternative[]>([])
  const [loading, setLoading] = useState(true)
  const [crisisDay, setCrisisDay] = useState(0)

  const cityId = household?.city_id ?? 'chennai'
  const cityName = simulation?.city?.name ?? cityId

  useEffect(() => {
    setLoading(true)
    getAlternatives(cityId, crisisDay)
      .then(setAlternatives)
      .finally(() => setLoading(false))
  }, [cityId, crisisDay])

  const available = alternatives.filter(a => a.available)
  const unavailable = alternatives.filter(a => !a.available)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(61,45,24,0.4)' }}>
        <div>
          <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
            Water Alternatives
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {cityName} — what other sources exist if supply stops
          </p>
        </div>
        {/* Crisis day slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-heading" style={{ color: 'var(--color-text-muted)' }}>Crisis Day:</span>
          <input
            type="range" min={0} max={30} value={crisisDay}
            onChange={e => setCrisisDay(Number(e.target.value))}
            className="w-28 accent-teal-500"
            style={{ accentColor: 'var(--color-teal)' }}
          />
          <span className="text-xs font-mono w-6" style={{ color: 'var(--color-teal)' }}>{crisisDay}</span>
          {crisisDay > 7 && (
            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              Prices up {crisisDay > 14 ? '4-5x' : crisisDay > 7 ? '2-3x' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 rounded-full border-2"
              style={{ borderColor: 'transparent', borderTopColor: 'var(--color-teal)' }} />
          </div>
        ) : (
          <>
            {crisisDay > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mb-5 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                ⚠ Showing crisis day {crisisDay} prices. Tanker and RO shop costs spike significantly as crisis deepens. Water ATMs may shut down after day 14.
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              {available.map((alt, i) => (
                <AlternativeCard key={alt.id} alt={alt} delay={i * 0.08} />
              ))}
            </div>

            {unavailable.length > 0 && (
              <>
                <div className="text-xs font-heading tracking-widest mb-3 mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  CURRENTLY UNAVAILABLE
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {unavailable.map((alt, i) => (
                    <AlternativeCard key={alt.id} alt={alt} delay={(available.length + i) * 0.08} />
                  ))}
                </div>
              </>
            )}

            {/* Cost comparison table */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mt-6 glass-panel p-5">
              <div className="font-heading text-xs tracking-widest mb-4" style={{ color: 'var(--color-text-muted)' }}>
                COST TO SUSTAIN FOR 30 DAYS
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'RO Shop (50L/day)', cost: alternatives.find(a=>a.type==='ro_shop')?.cost_per_liter ?? 1.75, icon: '💧' },
                  { label: 'Tanker (1000L/wk)', cost: alternatives.find(a=>a.type==='tanker')?.cost_per_liter ?? 0.65, icon: '🚛' },
                  { label: 'Water ATM', cost: alternatives.find(a=>a.type==='atm')?.cost_per_liter ?? 0.5, icon: '🏦' },
                ].map(({ label, cost, icon }) => {
                  const monthly = cost * 50 * 30
                  return (
                    <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(26,19,10,0.6)', border: '1px solid rgba(61,45,24,0.4)' }}>
                      <div style={{ fontSize: 22 }}>{icon}</div>
                      <div className="font-mono font-bold text-base mt-2" style={{ color: 'var(--color-teal)' }}>
                        ₹{Math.round(monthly).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{label}</div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--color-text-muted)' }}>
                Based on 50L/day for a family. Costs increase dramatically during active crisis.
              </p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
