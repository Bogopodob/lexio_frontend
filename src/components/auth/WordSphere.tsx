import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface Word {
  text: string
  color: string
}

const WORDS: Word[] = [
  { text: 'hello', color: '#5AD4B5' },
  { text: 'мир', color: '#F5C16A' },
  { text: 'hola', color: '#8b9bff' },
  { text: 'peace', color: '#5AD4B5' },
  { text: 'bonjour', color: '#F08AB4' },
  { text: 'world', color: '#F5C16A' },
  { text: 'こんにちは', color: '#7dd3fc' },
  { text: 'ciao', color: '#a78bfa' },
  { text: 'привет', color: '#F08AB4' },
  { text: 'hallo', color: '#5AD4B5' },
  { text: 'olá', color: '#8b9bff' },
  { text: '谢谢', color: '#F5C16A' },
  { text: 'merhaba', color: '#7dd3fc' },
  { text: 'paz', color: '#F08AB4' },
  { text: 'mundo', color: '#a78bfa' },
  { text: 'run', color: '#5AD4B5' },
]

function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    pts.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius))
  }
  return pts
}

function makePillTexture(text: string, color: string): THREE.CanvasTexture {
  const scale = 2
  const font = `700 ${44 * scale}px Inter, system-ui, sans-serif`
  const measurer = document.createElement('canvas').getContext('2d')!
  measurer.font = font
  const textW = Math.ceil(measurer.measureText(text).width)
  const padX = 30 * scale
  const padY = 18 * scale
  const w = textW + padX * 2
  const h = 44 * scale + padY * 2

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const radius = h / 2
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') ctx.roundRect(0, 0, w, h, radius)
  else ctx.rect(0, 0, w, h)
  ctx.fillStyle = 'rgba(12, 14, 16, 0.82)'
  ctx.fill()
  ctx.lineWidth = 2.5 * scale
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.85
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = color
  ctx.shadowBlur = 18 * scale
  ctx.fillText(text, w / 2, h / 2 + 2 * scale)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function makeGlowTexture(color: string): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, color)
  grad.addColorStop(0.35, color + 'aa')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function WordSprite({ word, position }: { word: Word; position: THREE.Vector3 }) {
  const ref = useRef<THREE.Sprite>(null)
  const [hovered, setHovered] = useState(false)
  const texture = useMemo(() => makePillTexture(word.text, word.color), [word])
  const baseScale = useMemo(() => {
    const aspect = texture.image.width / texture.image.height
    const h = 0.52
    return new THREE.Vector3(h * aspect, h, 1)
  }, [texture])

  useFrame((_, delta) => {
    const s = ref.current
    if (!s) return
    const target = hovered ? 1.35 : 1
    const k = 1 - Math.exp(-delta * 10)
    s.scale.lerp(new THREE.Vector3(baseScale.x * target, baseScale.y * target, 1), k)
  })

  return (
    <sprite
      ref={ref}
      position={position}
      scale={baseScale}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      <spriteMaterial map={texture} transparent depthWrite={false} opacity={hovered ? 1 : 0.92} />
    </sprite>
  )
}

function Scene() {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Sprite>(null)
  const { camera, gl } = useThree()
  const drag = useRef({ down: false, x: 0, y: 0, vx: 0, tilt: 0 })
  const pointer = useRef({ x: 0, y: 0 })

  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const positions = useMemo(() => fibonacciSphere(WORDS.length, 2.7), [])
  const glowTex = useMemo(() => makeGlowTexture('#5AD4B5'), [])

  const dust = useMemo(() => {
    const count = 220
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 4.5 + Math.random() * 4
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return geo
  }, [])

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const g = group.current
    if (g) {
      const dr = drag.current
      if (!dr.down) {
        g.rotation.y += d * (reduced ? 0 : 0.14 + Math.abs(dr.vx) * 2.2)
        if (Math.abs(dr.vx) > 0.0004) {
          g.rotation.y += dr.vx
          dr.vx *= Math.exp(-d * 2.4)
        }
        dr.tilt += (0 - dr.tilt) * (1 - Math.exp(-d * 2))
        g.rotation.x += (dr.tilt - g.rotation.x) * (1 - Math.exp(-d * 3))
      }
      g.position.y = Math.sin(t * 0.6) * 0.12
    }
    if (core.current) {
      core.current.rotation.y += d * 0.5
      core.current.rotation.x = Math.sin(t * 0.4) * 0.35
      const pulse = 1 + Math.sin(t * 1.8) * 0.08
      core.current.scale.setScalar(pulse)
    }
    if (glow.current) {
      const pulse = 2.6 + Math.sin(t * 1.8) * 0.35
      glow.current.scale.set(pulse, pulse, 1)
    }
    const px = pointer.current.x * 0.7
    const py = pointer.current.y * 0.45
    camera.position.x += (px - camera.position.x) * (1 - Math.exp(-d * 2.2))
    camera.position.y += (py - camera.position.y) * (1 - Math.exp(-d * 2.2))
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <group
        ref={group}
        onPointerDown={(e) => {
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          drag.current = { ...drag.current, down: true, x: e.clientX, y: e.clientY, vx: 0 }
        }}
        onPointerMove={(e) => {
          const ndc = {
            x: (e.clientX / window.innerWidth) * 2 - 1,
            y: -((e.clientY / window.innerHeight) * 2 - 1),
          }
          pointer.current = ndc
          const dr = drag.current
          if (dr.down && group.current) {
            const dx = e.clientX - dr.x
            group.current.rotation.y += dx * 0.008
            dr.vx = dx * 0.008
            dr.x = e.clientX
            dr.tilt = THREE.MathUtils.clamp(dr.tilt + (e.clientY - dr.y) * 0.003, -0.45, 0.45)
            dr.y = e.clientY
          }
        }}
        onPointerUp={() => {
          drag.current.down = false
        }}
        onPointerMissed={() => {
          drag.current.down = false
        }}
      >
        {/* core */}
        <sprite ref={glow} scale={[2.6, 2.6, 1]}>
          <spriteMaterial
            map={glowTex}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.85}
          />
        </sprite>
        <mesh ref={core}>
          <icosahedronGeometry args={[0.62, 1]} />
          <meshBasicMaterial color="#5AD4B5" wireframe transparent opacity={0.75} />
        </mesh>
        <mesh scale={0.34}>
          <icosahedronGeometry args={[0.62, 2]} />
          <meshBasicMaterial color="#0d1512" transparent opacity={0.95} />
        </mesh>

        {/* orbit rings */}
        <mesh rotation={[Math.PI / 2.25, 0, 0.35]}>
          <torusGeometry args={[3.35, 0.012, 8, 128]} />
          <meshBasicMaterial color="#8b9bff" transparent opacity={0.35} />
        </mesh>
        <mesh rotation={[Math.PI / 1.8, 0.2, -0.5]}>
          <torusGeometry args={[3.8, 0.01, 8, 128]} />
          <meshBasicMaterial color="#5AD4B5" transparent opacity={0.22} />
        </mesh>

        {/* words */}
        {WORDS.map((w, i) => (
          <WordSprite key={w.text} word={w} position={positions[i]} />
        ))}
      </group>

      <points geometry={dust}>
        <pointsMaterial color="#8b9bff" size={0.035} transparent opacity={0.55} sizeAttenuation />
      </points>
    </>
  )
}

export default function WordSphere() {
  return (
    <div className="auth-scene">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 8.6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <div className="auth-scene__hint">тяни сферу · наведи на слово</div>
    </div>
  )
}
