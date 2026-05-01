import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Suspense } from 'react'
import { WaterTank } from './WaterTank'
import type { CrisisLevel } from '../../types'

interface SceneProps {
  fillPercent: number
  crisisLevel?: CrisisLevel
  height?: string
  interactive?: boolean
}

function SceneContent({ fillPercent, crisisLevel = 'safe' }: { fillPercent: number; crisisLevel?: CrisisLevel }) {
  return (
    <>
      <ambientLight intensity={0.3} color="#1a3a5c" />
      <directionalLight position={[5, 8, 5]} intensity={0.6} color="#c8e8ff" castShadow />
      <directionalLight position={[-3, 4, -3]} intensity={0.3} color="#00d4c8" />
      <Environment preset="night" />
      <WaterTank fillPercent={fillPercent} crisisLevel={crisisLevel} />
    </>
  )
}

export function Scene({ fillPercent, crisisLevel = 'safe', height = '100%', interactive = true }: SceneProps) {
  return (
    <Canvas
      style={{ height, background: 'transparent' }}
      camera={{ position: [0, 0.5, 5.5], fov: 45 }}
      shadows
      gl={{ antialias: true, alpha: true, toneMapping: 2 }}
    >
      <Suspense fallback={null}>
        <SceneContent fillPercent={fillPercent} crisisLevel={crisisLevel} />
        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.8}
            autoRotate
            autoRotateSpeed={0.5}
          />
        )}
      </Suspense>
    </Canvas>
  )
}
