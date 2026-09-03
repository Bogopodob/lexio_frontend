import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'

interface Word {
  text: string
  lang: string
  mean: string
  color: string
}

const WORDS: Word[] = [
  { text: 'hello', lang: 'EN', mean: 'привет', color: '#5AD4B5' },
  { text: 'мир', lang: 'RU', mean: 'peace · world', color: '#F5C16A' },
  { text: 'hola', lang: 'ES', mean: 'привет', color: '#8b9bff' },
  { text: 'peace', lang: 'EN', mean: 'мир · покой', color: '#5AD4B5' },
  { text: 'bonjour', lang: 'FR', mean: 'добрый день', color: '#F08AB4' },
  { text: 'world', lang: 'EN', mean: 'мир · вселенная', color: '#F5C16A' },
  { text: 'こんにちは', lang: 'JA', mean: 'добрый день', color: '#7dd3fc' },
  { text: 'ciao', lang: 'IT', mean: 'привет / пока', color: '#a78bfa' },
  { text: 'привет', lang: 'RU', mean: 'hello', color: '#F08AB4' },
  { text: 'hallo', lang: 'DE', mean: 'привет', color: '#5AD4B5' },
  { text: 'olá', lang: 'PT', mean: 'привет', color: '#8b9bff' },
  { text: '谢谢', lang: 'ZH', mean: 'спасибо', color: '#F5C16A' },
  { text: 'merhaba', lang: 'TR', mean: 'здравствуйте', color: '#7dd3fc' },
  { text: 'paz', lang: 'ES', mean: 'мир · покой', color: '#F08AB4' },
  { text: 'mundo', lang: 'ES', mean: 'мир · вселенная', color: '#a78bfa' },
  { text: 'run', lang: 'EN', mean: 'бежать', color: '#5AD4B5' },
]

/* ── helpers ─────────────────────────────────────────── */

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

/* ── nebula background (custom GLSL) ─────────────────── */

const NEBULA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`

const NEBULA_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uPointer;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * vec2(1.6, 1.0);
    float t = uTime * 0.05;

    // domain warp
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 0.6),
                  fbm(p + 2.4 * q + vec2(8.3, 2.8) - t * 0.5));
    float f = fbm(p + 2.8 * r);

    vec3 deep = vec3(0.043, 0.047, 0.059);
    vec3 violet = vec3(0.24, 0.20, 0.55);
    vec3 mint = vec3(0.13, 0.55, 0.46);
    vec3 amber = vec3(0.55, 0.38, 0.16);

    vec3 col = mix(deep, violet, smoothstep(0.25, 0.75, f));
    col = mix(col, mint, smoothstep(0.55, 0.95, fbm(p + r * 1.6 - t)));
    col = mix(col, amber, smoothstep(0.72, 0.98, fbm(p * 1.4 - r + 3.7)) * 0.55);

    // cursor aura
    float d = distance(uv, uPointer * vec2(0.5, 0.5) + 0.5);
    col += vec3(0.10, 0.35, 0.30) * smoothstep(0.55, 0.0, d) * 0.5;

    // vignette
    float vig = smoothstep(1.05, 0.35, distance(uv, vec2(0.5, 0.42)));
    col *= mix(0.55, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`

function Nebula({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  )
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
    if (pointer.current) uniforms.uPointer.value.set(pointer.current.x, pointer.current.y)
  })
  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={NEBULA_VERT}
        fragmentShader={NEBULA_FRAG}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

/* ── morphing blob core (custom GLSL) ────────────────── */

const BLOB_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vN;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    float n = snoise(position * 1.4 + vec3(0.0, uTime * 0.35, uTime * 0.22));
    n += 0.5 * snoise(position * 3.1 - vec3(uTime * 0.25));
    vN = n;
    vec3 displaced = position + normal * n * 0.16;
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const BLOB_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vN;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 1.8);
    vec3 deep = vec3(0.03, 0.16, 0.13);
    vec3 mint = vec3(0.35, 0.83, 0.71);
    vec3 violet = vec3(0.55, 0.45, 1.0);
    vec3 col = mix(deep, mint, smoothstep(-0.6, 0.7, vN));
    col = mix(col, violet, fres * 0.85);
    col += mint * fres * 0.6;
    gl_FragColor = vec4(col, 1.0);
  }
`

function BlobCore() {
  const mesh = useRef<THREE.Mesh>(null)
  const wire = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    uniforms.uTime.value = t
    if (mesh.current) {
      mesh.current.rotation.y += d * 0.35
      mesh.current.rotation.z = Math.sin(t * 0.3) * 0.2
    }
    if (wire.current) {
      wire.current.rotation.y -= d * 0.28
      wire.current.rotation.x = Math.sin(t * 0.4) * 0.35
    }
  })
  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.62, 64, 64]} />
        <shaderMaterial vertexShader={BLOB_VERT} fragmentShader={BLOB_FRAG} uniforms={uniforms} />
      </mesh>
      <mesh ref={wire} scale={1.45}>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshBasicMaterial color="#5AD4B5" wireframe transparent opacity={0.28} />
      </mesh>
    </group>
  )
}

/* ── words / constellation / bursts / comets ─────────── */

function WordSprite({
  word,
  position,
  onSelect,
}: {
  word: Word
  position: THREE.Vector3
  onSelect: (w: Word, at: THREE.Vector3) => void
}) {
  const ref = useRef<THREE.Sprite>(null)
  const [hovered, setHovered] = useState(false)
  const texture = useMemo(() => makePillTexture(word.text, word.color), [word])
  const baseScale = useMemo(() => {
    const aspect = texture.image.width / texture.image.height
    const h = 0.52
    return new THREE.Vector3(h * aspect, h, 1)
  }, [texture])

  useEffect(() => () => texture.dispose(), [texture])

  useFrame((_, delta) => {
    const s = ref.current
    if (!s) return
    const target = hovered ? 1.4 : 1
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
      onClick={(e) => {
        e.stopPropagation()
        onSelect(word, position.clone())
      }}
    >
      <spriteMaterial map={texture} transparent depthWrite={false} opacity={hovered ? 1 : 0.92} />
    </sprite>
  )
}

function Constellation({ positions }: { positions: THREE.Vector3[] }) {
  const ref = useRef<THREE.LineSegments>(null)
  const geometry = useMemo(() => {
    const verts: number[] = []
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[i].distanceTo(positions[j]) < 2.1) {
          verts.push(
            positions[i].x, positions[i].y, positions[i].z,
            positions[j].x, positions[j].y, positions[j].z,
          )
        }
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    return geo
  }, [positions])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    const mat = ref.current?.material as THREE.LineBasicMaterial | undefined
    if (mat) mat.opacity = 0.13 + Math.sin(state.clock.elapsedTime * 0.9) * 0.05
  })

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial color="#8b9bff" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  )
}

interface Burst {
  id: number
  pos: THREE.Vector3
  color: string
}

function SparkBurst({ burst, onDone }: { burst: Burst; onDone: (id: number) => void }) {
  const points = useRef<THREE.Points>(null)
  const ring = useRef<THREE.Mesh>(null)
  const life = useRef(0)

  const { geometry, velocities } = useMemo(() => {
    const count = 70
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 1.6 + Math.random() * 2.4
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      vel[i * 3 + 2] = Math.cos(phi) * speed
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { geometry, velocities: vel }
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      ;(points.current?.material as THREE.Material | undefined)?.dispose()
      ;(ring.current?.material as THREE.Material | undefined)?.dispose()
      ;(ring.current?.geometry as THREE.BufferGeometry | undefined)?.dispose()
    },
    [geometry],
  )

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05)
    life.current += d
    const t = life.current
    if (t >= 1.1) {
      onDone(burst.id)
      return
    }
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const damp = Math.exp(-d * 2.2)
    for (let i = 0; i < arr.length; i += 3) {
      velocities[i] *= damp
      velocities[i + 1] *= damp
      velocities[i + 2] *= damp
      arr[i] += velocities[i] * d
      arr[i + 1] += velocities[i + 1] * d
      arr[i + 2] += velocities[i + 2] * d
    }
    attr.needsUpdate = true
    const mat = points.current?.material as THREE.PointsMaterial | undefined
    if (mat) mat.opacity = 1 - t / 1.1
    if (ring.current) {
      const s = 0.25 + t * 2.6
      ring.current.scale.set(s, s, 1)
      const rmat = ring.current.material as THREE.MeshBasicMaterial
      rmat.opacity = Math.max(0, 0.85 - t * 0.95)
    }
  })

  return (
    <group position={burst.pos}>
      <points ref={points} geometry={geometry}>
        <pointsMaterial
          color={burst.color}
          size={0.09}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <Billboard>
        <mesh ref={ring}>
          <ringGeometry args={[0.85, 1, 48]} />
          <meshBasicMaterial
            color={burst.color}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>
    </group>
  )
}

function Comet({
  radius,
  speed,
  tilt,
  color,
  offset,
}: {
  radius: number
  speed: number
  tilt: number
  color: string
  offset: number
}) {
  const head = useRef<THREE.Sprite>(null)
  const glowTex = useMemo(() => makeGlowTexture(color), [color])
  const trail = useMemo(() => {
    const N = 42
    const arr = new Float32Array(N * 3)
    const axis = new THREE.Vector3(1, 0, 0)
    for (let i = 0; i < N; i++) {
      const a = offset - (N - 1 - i) * 0.045 * Math.sign(speed || 1)
      const p = new THREE.Vector3(
        Math.cos(a) * radius,
        Math.sin(a * 0.9) * radius * 0.35,
        Math.sin(a) * radius,
      ).applyAxisAngle(axis, tilt)
      arr[i * 3] = p.x
      arr[i * 3 + 1] = p.y
      arr[i * 3 + 2] = p.z
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return { geo, N }
  }, [radius, speed, tilt, offset])

  useEffect(
    () => () => {
      trail.geo.dispose()
      glowTex.dispose()
    },
    [trail, glowTex],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset
    const head3 = new THREE.Vector3(
      Math.cos(t) * radius,
      Math.sin(t * 0.9) * radius * 0.35,
      Math.sin(t) * radius,
    ).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt)
    if (head.current) head.current.position.copy(head3)

    const attr = trail.geo.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    arr.copyWithin(3, 0, (trail.N - 1) * 3)
    arr[(trail.N - 1) * 3] = head3.x
    arr[(trail.N - 1) * 3 + 1] = head3.y
    arr[(trail.N - 1) * 3 + 2] = head3.z
    attr.needsUpdate = true
  })

  const lineObj = useMemo(
    () =>
      new THREE.Line(
        trail.geo,
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    [trail, color],
  )

  useEffect(() => {
    const mat = lineObj.material as THREE.Material
    return () => {
      mat.dispose()
    }
  }, [lineObj])

  return (
    <group>
      <primitive object={lineObj} />
      <sprite ref={head} scale={[0.42, 0.42, 1]}>
        <spriteMaterial
          map={glowTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

/* ── scene root ──────────────────────────────────────── */

function Scene({
  onSelect,
  pointer,
}: {
  onSelect: (w: Word | null) => void
  pointer: React.RefObject<{ x: number; y: number }>
}) {
  const group = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Sprite>(null)
  const { camera } = useThree()
  const drag = useRef({ down: false, x: 0, y: 0, vx: 0, tilt: 0 })
  const orbit = useRef(0)
  const [bursts, setBursts] = useState<Burst[]>([])
  const burstId = useRef(0)

  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const positions = useMemo(() => fibonacciSphere(WORDS.length, 2.7), [])
  const glowTex = useMemo(() => makeGlowTexture('#5AD4B5'), [])
  useEffect(() => () => glowTex.dispose(), [glowTex])

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
  useEffect(() => () => dust.dispose(), [dust])

  const spawnBurst = (word: Word, at: THREE.Vector3) => {
    const id = ++burstId.current
    setBursts((list) => [...list.slice(-5), { id, pos: at, color: word.color }])
    onSelect(word)
  }

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
    if (glow.current) {
      const pulse = 2.7 + Math.sin(t * 1.8) * 0.4
      glow.current.scale.set(pulse, pulse, 1)
    }
    // slow cinematic camera drift + pointer parallax
    orbit.current += d * (reduced ? 0 : 0.05)
    const px = pointer.current?.x ?? 0
    const py = pointer.current?.y ?? 0
    const tx = Math.sin(orbit.current) * 1.1 + px * 0.7
    const ty = py * 0.45
    const k = 1 - Math.exp(-d * 2.2)
    camera.position.x += (tx - camera.position.x) * k
    camera.position.y += (ty - camera.position.y) * k
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <Nebula pointer={pointer} />
      <group
        onPointerDown={(e) => {
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          drag.current = { ...drag.current, down: true, x: e.clientX, y: e.clientY, vx: 0 }
        }}
        onPointerMove={(e) => {
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
          onSelect(null)
        }}
      >
        <group ref={group}>
          <sprite ref={glow} scale={[2.7, 2.7, 1]}>
            <spriteMaterial
              map={glowTex}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.8}
            />
          </sprite>

          <BlobCore />
          <Constellation positions={positions} />

          {WORDS.map((w, i) => (
            <WordSprite key={w.text} word={w} position={positions[i]} onSelect={spawnBurst} />
          ))}

          {bursts.map((b) => (
            <SparkBurst
              key={b.id}
              burst={b}
              onDone={(id) => setBursts((list) => list.filter((x) => x.id !== id))}
            />
          ))}
        </group>

        <Comet radius={4.4} speed={0.32} tilt={0.5} color="#8b9bff" offset={0} />
        <Comet radius={5.1} speed={-0.24} tilt={-0.7} color="#5AD4B5" offset={2.4} />
      </group>

      <points geometry={dust}>
        <pointsMaterial color="#8b9bff" size={0.035} transparent opacity={0.5} sizeAttenuation />
      </points>
    </>
  )
}

export default function WordSphere() {
  const [selected, setSelected] = useState<Word | null>(null)
  const pointer = useRef({ x: 0, y: 0 })

  return (
    <div
      className="auth-scene"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        pointer.current = {
          x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
          y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
        }
      }}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 8.6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <Suspense fallback={null}>
          <Scene onSelect={setSelected} pointer={pointer} />
        </Suspense>
      </Canvas>

      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.text}
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="auth-word-chip"
          >
            <span className="auth-word-chip__dot" style={{ background: selected.color, boxShadow: `0 0 12px ${selected.color}` }} />
            <span className="auth-word-chip__word">{selected.text}</span>
            <span className="auth-word-chip__lang">{selected.lang}</span>
            <span className="auth-word-chip__mean">{selected.mean}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="auth-scene__hint">тяни сферу · кликни по слову</div>
    </div>
  )
}
