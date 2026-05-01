import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface WaterTankProps {
  fillPercent: number
  crisisLevel?: string
  animated?: boolean
}

const VERTEX_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec4 modelPos = modelMatrix * vec4(position, 1.0);

    float e = sin(modelPos.x * 4.5 + uTime * 1.4) * 0.018
            + cos(modelPos.z * 3.8 + uTime * 1.1) * 0.014
            + sin((modelPos.x + modelPos.z) * 2.8 + uTime * 0.85) * 0.009;

    modelPos.y += e;
    vElevation = e;

    gl_Position = projectionMatrix * viewMatrix * modelPos;
  }
`

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uColorDeep;
  uniform vec3 uColorShallow;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vElevation;

  void main() {
    float c1 = sin(vUv.x * 22.0 + uTime * 0.45) * cos(vUv.y * 18.0 + uTime * 0.35);
    float c2 = cos(vUv.x * 14.0 - uTime * 0.25) * sin(vUv.y * 26.0 + uTime * 0.55);
    float caustic = (c1 + c2) * 0.18 + 0.5;

    vec3 color = mix(uColorDeep, uColorShallow, caustic + vElevation * 8.0);

    float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x)
                   * smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);

    gl_FragColor = vec4(color, uOpacity * edgeFade);
  }
`

function getWaterColors(fillPercent: number, crisisLevel: string) {
  if (crisisLevel === 'zero' || crisisLevel === 'critical') {
    return { deep: '#5c0000', shallow: '#dc2626' }
  }
  if (crisisLevel === 'warning' || fillPercent < 40) {
    return { deep: '#4a2000', shallow: '#d97706' }
  }
  return { deep: '#003d5c', shallow: '#0a9396' }
}

function WaterVolume({ fillPercent, crisisLevel = 'safe' }: WaterTankProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const tankH = 3.8
  const innerR = 1.18

  const targetH = Math.max(0.05, (fillPercent / 100) * (tankH - 0.15))
  const yPos = -tankH / 2 + targetH / 2 + 0.08

  const colors = getWaterColors(fillPercent, crisisLevel)

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color(colors.deep) },
      uColorShallow: { value: new THREE.Color(colors.shallow) },
      uOpacity: { value: 0.88 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
  }), [colors.deep, colors.shallow])

  useEffect(() => {
    material.uniforms.uColorDeep.value.set(colors.deep)
    material.uniforms.uColorShallow.value.set(colors.shallow)
  }, [crisisLevel, fillPercent])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    if (meshRef.current) {
      const target = new THREE.Vector3(0, yPos, 0)
      meshRef.current.position.lerp(target, 0.04)
      const targetScaleY = targetH
      meshRef.current.scale.y += (targetScaleY - meshRef.current.scale.y) * 0.04
    }
  })

  return (
    <mesh ref={meshRef} position={[0, yPos, 0]} material={material}>
      <cylinderGeometry args={[innerR, innerR, 1, 64, 12]} />
    </mesh>
  )
}

function GlassShell() {
  return (
    <mesh>
      <cylinderGeometry args={[1.25, 1.25, 3.8, 64, 1, true]} />
      <meshPhysicalMaterial
        color="#c8e8f0"
        transmission={0.92}
        roughness={0.02}
        metalness={0.05}
        thickness={0.25}
        transparent
        opacity={0.18}
        side={THREE.DoubleSide}
        envMapIntensity={1.2}
      />
    </mesh>
  )
}

function MetalRim({ y }: { y: number }) {
  return (
    <mesh position={[0, y, 0]}>
      <torusGeometry args={[1.27, 0.035, 8, 64]} />
      <meshStandardMaterial color="#2a5a7a" metalness={0.9} roughness={0.15} />
    </mesh>
  )
}

function TankBase() {
  return (
    <group position={[0, -1.98, 0]}>
      <mesh>
        <cylinderGeometry args={[1.35, 1.35, 0.08, 64]} />
        <meshStandardMaterial color="#0a1f2e" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.04, 64]} />
        <meshStandardMaterial color="#061420" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

function LevelIndicator({ fillPercent, crisisLevel = 'safe' }: WaterTankProps) {
  const colors = getWaterColors(fillPercent, crisisLevel)
  const color = new THREE.Color(colors.shallow)
  const tankH = 3.8
  const indicatorY = -tankH / 2 + (fillPercent / 100) * tankH

  return (
    <group position={[1.32, indicatorY, 0]}>
      <mesh>
        <boxGeometry args={[0.06, 0.015, 0.06]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.05, 0, 0]}>
        <boxGeometry args={[0.04, 0.008, 0.04]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} />
      </mesh>
    </group>
  )
}

function GlowLight({ crisisLevel = 'safe' }: { crisisLevel?: string }) {
  const lightColors = {
    safe: '#00b4a0',
    watch: '#7dd3fc',
    warning: '#f59e0b',
    critical: '#f97316',
    zero: '#dc2626',
  }
  const color = lightColors[crisisLevel as keyof typeof lightColors] ?? '#00b4a0'
  return (
    <>
      <pointLight position={[0, -2.5, 0]} color={color} intensity={2.5} distance={6} decay={2} />
      <pointLight position={[0, 0, 0]} color={color} intensity={0.8} distance={5} decay={2} />
    </>
  )
}

function BubbleParticles({ fillPercent }: { fillPercent: number }) {
  const count = 40
  const particleRef = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * 1.0
      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3.0
      pos[i * 3 + 2] = Math.sin(angle) * r
    }
    return pos
  }, [])

  const velocities = useMemo(() => Array.from({ length: count }, () => 0.3 + Math.random() * 0.7), [])
  const phases = useMemo(() => Array.from({ length: count }, () => Math.random() * Math.PI * 2), [])

  useFrame(({ clock }) => {
    if (!particleRef.current) return
    const pos = particleRef.current.geometry.attributes.position.array as Float32Array
    const t = clock.elapsedTime
    const tankH = 3.8
    const waterTop = -tankH / 2 + (fillPercent / 100) * tankH

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += velocities[i] * 0.008
      pos[i * 3] += Math.sin(t * 0.5 + phases[i]) * 0.002

      if (pos[i * 3 + 1] > waterTop) {
        pos[i * 3 + 1] = -tankH / 2 + 0.1
      }
    }
    particleRef.current.geometry.attributes.position.needsUpdate = true
  })

  if (fillPercent < 5) return null

  return (
    <points ref={particleRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#7dd3fc" size={0.025} transparent opacity={0.5} sizeAttenuation />
    </points>
  )
}

export function WaterTank({ fillPercent, crisisLevel = 'safe', animated = true }: WaterTankProps) {
  return (
    <group>
      <GlassShell />
      <WaterVolume fillPercent={fillPercent} crisisLevel={crisisLevel} animated={animated} />
      <BubbleParticles fillPercent={fillPercent} />
      <MetalRim y={1.95} />
      <MetalRim y={-1.95} />
      <TankBase />
      <LevelIndicator fillPercent={fillPercent} crisisLevel={crisisLevel} />
      <GlowLight crisisLevel={crisisLevel} />
    </group>
  )
}
