import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bounds, Edges, OrbitControls, useGLTF } from '@react-three/drei'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three'

// Real-world sizes in metres
const STEP_DEPTH = 0.32
const LANDING_DEPTH = 1.5
const RAMP_WIDTH = 1.2
const DOOR_HEIGHT = 2.1
const WALL_HEIGHT = 4.6
const HANDRAIL_HEIGHT = 0.9
/** Height of the see-through block drawn where the steps are unknown. */
const UNKNOWN_HEIGHT = 0.45

// Materials of a Kraków tenement: plaster, stone plinth and steps, oak door
const PLASTER = '#e8dcc8'
const PLINTH = '#b3a998'
const STONE = '#cfc8ba'
const STONE_DARK = '#b9b1a2'
const WOOD = '#7a4b2a'
const WOOD_DARK = '#5f3920'
const METAL = '#3e444d'
const GLASS = '#a9cfe6'
const RAMP = '#74b394'

/** What we know about an entrance. Unknown measurements are drawn with a typical value and labelled "?". */
export type EntranceData = {
  /** Null when no source says: drawn as a see-through block marked "?", never as a step-free entrance. */
  steps: number | null
  /** OpenStreetMap summary tag, named on the "?" block. */
  summary: 'yes' | 'limited' | 'no' | null
  stepHeightCm: number | null
  handrail: boolean | null
  ramp: boolean
  rampSlopePct: number | null
  platformLift: boolean
  doorWidthCm: number | null
  automaticDoor: boolean
  tactilePaving: boolean
  cobblestone: boolean
}

export type EntranceLabels = {
  door: string
  steps: string
  level: string
  ramp: string | null
  lift: string
  cobblestones: string
}

type Vec3 = [number, number, number]
type LabelSpec = { key: string; text: string; position: Vec3 }

/** Sizes of the drawn entrance, shared by the 3D model and its labels. */
function geometry(e: EntranceData) {
  const rise = (e.stepHeightCm ?? 15) / 100
  const steps = e.steps ?? 0
  const height = steps * rise
  const stairsDepth = steps * STEP_DEPTH
  const doorWidth = Math.min(4, (e.doorWidthCm ?? 90) / 100)
  // The landing is as wide as the door needs; the stairs take its middle
  const landingWidth = Math.max(3, doorWidth + 0.9)
  const stairsWidth = Math.max(2, doorWidth + 0.4)
  const rampLength = e.ramp && height > 0 ? height / ((e.rampSlopePct ?? 8) / 100) : 0
  const rampStartX = landingWidth / 2
  const frontZ = LANDING_DEPTH + stairsDepth
  return { steps, rise, height, stairsDepth, rampLength, rampStartX, frontZ, doorWidth, landingWidth, stairsWidth }
}

function labelSpecs(e: EntranceData, labels: EntranceLabels): LabelSpec[] {
  const g = geometry(e)
  const specs: LabelSpec[] = [{ key: 'door', text: labels.door, position: [0, g.height + DOOR_HEIGHT + 0.75, 0.3] }]
  if (e.steps === null) specs.push({ key: 'steps', text: labels.steps, position: [0, UNKNOWN_HEIGHT + 0.35, LANDING_DEPTH + 0.2] })
  else if (e.steps > 0) specs.push({ key: 'steps', text: labels.steps, position: [-g.stairsWidth / 2 + 0.3, g.height + 0.4, LANDING_DEPTH + g.stairsDepth / 2] })
  else specs.push({ key: 'level', text: labels.level, position: [0, 0.15, 1.5] })
  if (g.rampLength > 0 && labels.ramp)
    specs.push({ key: 'ramp', text: labels.ramp, position: [g.rampStartX + g.rampLength * 0.6, g.height * 0.4 + HANDRAIL_HEIGHT + 0.35, RAMP_WIDTH] })
  // A ramp is known but its height is not: named next to the "?" block, not drawn
  else if (e.steps === null && labels.ramp) specs.push({ key: 'ramp', text: labels.ramp, position: [g.rampStartX + 0.9, 0.5, RAMP_WIDTH / 2] })
  if (e.platformLift) specs.push({ key: 'lift', text: labels.lift, position: [-(g.landingWidth / 2 + 0.7), g.height + 1.75, 0.8] })
  if (e.cobblestone) specs.push({ key: 'cobblestones', text: labels.cobblestones, position: [-g.landingWidth / 2 - 0.2, 0.05, g.frontZ + 2.2] })
  return specs
}

/**
 * Moves the HTML labels (rendered by React DOM next to the canvas) to where their 3D points are on screen.
 * Plain DOM updates every frame: no extra React roots inside the scene, so unmounting stays clean.
 */
function LabelProjector({ specs, onProject }: { specs: LabelSpec[]; onProject: (key: string, x: number, y: number, visible: boolean) => void }) {
  const v = useRef(new Vector3())
  useFrame(({ camera, size }) => {
    for (const spec of specs) {
      v.current.set(...spec.position).project(camera)
      onProject(spec.key, ((v.current.x + 1) / 2) * size.width, ((1 - v.current.y) / 2) * size.height, v.current.z < 1)
    }
  })
  return null
}

/** Small repeating picture drawn in code: paving, setts, tactile studs. Nothing is downloaded. */
function useTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeatX: number, repeatY: number) {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    draw(canvas.getContext('2d')!, size)
    const texture = new CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(repeatX, repeatY)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    return texture
  }, [draw, repeatX, repeatY])
}

/** The same "random" shade for the same stone every time. */
const shade = (i: number) => ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1

function drawSlabs(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = '#d3d6d8'
  ctx.fillRect(0, 0, size, size)
  const n = 4
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const c = 205 + Math.round(shade(x + y * n) * 16)
      ctx.fillStyle = `rgb(${c}, ${c + 2}, ${c + 4})`
      ctx.fillRect((x * size) / n + 1.5, (y * size) / n + 1.5, size / n - 3, size / n - 3)
    }
}

function drawSetts(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = '#7d7265'
  ctx.fillRect(0, 0, size, size)
  const rows = 8
  const cols = 6
  for (let y = 0; y < rows; y++)
    for (let x = -1; x < cols; x++) {
      const c = 150 + Math.round(shade(x * 7 + y * 31) * 45)
      ctx.fillStyle = `rgb(${c + 12}, ${c + 2}, ${c - 14})`
      const w = size / cols
      const h = size / rows
      ctx.beginPath()
      ctx.roundRect((x + (y % 2 ? 0.5 : 0)) * w + 2, y * h + 2, w - 4, h - 4, 5)
      ctx.fill()
    }
}

function drawStuds(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = '#f2c500'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#c99c00'
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      ctx.beginPath()
      ctx.arc((x + 0.5) * (size / 4), (y + 0.5) * (size / 4), size / 13, 0, Math.PI * 2)
      ctx.fill()
    }
}

/** Box tilted so that it connects two heights: used for ramps and handrails. */
function Slope({ from, to, size, color }: { from: Vec3; to: Vec3; size: [number, number]; color: string }) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const dz = to[2] - from[2]
  const alongX = Math.abs(dx) > Math.abs(dz)
  const run = alongX ? dx : dz
  const length = Math.hypot(run, dy)
  const angle = Math.atan2(dy, Math.abs(run))
  const center: Vec3 = [from[0] + dx / 2, from[1] + dy / 2, from[2] + dz / 2]
  return alongX ? (
    <mesh position={center} rotation-z={Math.sign(dx) * angle} castShadow receiveShadow>
      <boxGeometry args={[length, size[0], size[1]]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  ) : (
    <mesh position={center} rotation-x={-Math.sign(dz) * angle} castShadow receiveShadow>
      <boxGeometry args={[size[1], size[0], length]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}

function Box({ at, size, color, roughness = 0.85, shadow = true }: { at: Vec3; size: Vec3; color: string; roughness?: number; shadow?: boolean }) {
  return (
    <mesh position={at} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  )
}

/** A handrail: the sloping or level rail and the posts that carry it. */
function Handrail({ from, to }: { from: Vec3; to: Vec3 }) {
  const posts = Math.max(2, Math.round(Math.hypot(to[0] - from[0], to[2] - from[2]) / 1.1) + 1)
  return (
    <>
      <Slope from={from} to={to} size={[0.05, 0.05]} color={METAL} />
      {Array.from({ length: posts }, (_, i) => {
        const k = i / (posts - 1)
        const top = from[1] + (to[1] - from[1]) * k
        return (
          <mesh key={i} position={[from[0] + (to[0] - from[0]) * k, top - HANDRAIL_HEIGHT / 2, from[2] + (to[2] - from[2]) * k]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, HANDRAIL_HEIGHT, 8]} />
            <meshStandardMaterial color={METAL} roughness={0.5} metalness={0.4} />
          </mesh>
        )
      })}
    </>
  )
}

function Window({ at, width, height }: { at: Vec3; width: number; height: number }) {
  return (
    <group position={at}>
      <Box at={[0, 0, 0]} size={[width + 0.16, height + 0.16, 0.08]} color="#f4efe6" shadow={false} />
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[width, height, 0.04]} />
        <meshStandardMaterial color="#6f8fa6" roughness={0.15} metalness={0.3} />
      </mesh>
      <Box at={[0, 0, 0.06]} size={[0.05, height, 0.03]} color="#f4efe6" shadow={false} />
      <Box at={[0, height * 0.18, 0.06]} size={[width, 0.05, 0.03]} color="#f4efe6" shadow={false} />
      <Box at={[0, -height / 2 - 0.1, 0.08]} size={[width + 0.3, 0.07, 0.18]} color={STONE} />
    </group>
  )
}

/** The door in its frame: one oak leaf, two for a wide gate, or sliding glass when it opens by itself. */
function Door({ width, automatic }: { width: number; automatic: boolean }) {
  const leaves = width > 1.4 ? 2 : 1
  const leaf = width / leaves
  return (
    <group>
      {/* Frame and the light above the door */}
      <Box at={[0, DOOR_HEIGHT / 2 + 0.2, 0.03]} size={[width + 0.24, DOOR_HEIGHT + 0.52, 0.1]} color={automatic ? METAL : WOOD_DARK} shadow={false} />
      <mesh position={[0, DOOR_HEIGHT + 0.22, 0.09]}>
        <boxGeometry args={[width, 0.3, 0.03]} />
        <meshStandardMaterial color="#6f8fa6" roughness={0.15} metalness={0.3} />
      </mesh>
      {Array.from({ length: leaves }, (_, i) => {
        const x = -width / 2 + leaf * (i + 0.5)
        return automatic ? (
          <mesh key={i} position={[x, DOOR_HEIGHT / 2, 0.09]}>
            <boxGeometry args={[leaf - 0.05, DOOR_HEIGHT - 0.04, 0.03]} />
            <meshStandardMaterial color={GLASS} transparent opacity={0.6} roughness={0.08} metalness={0.2} />
          </mesh>
        ) : (
          <group key={i} position={[x, DOOR_HEIGHT / 2, 0.09]}>
            <Box at={[0, 0, 0]} size={[leaf - 0.04, DOOR_HEIGHT - 0.03, 0.05]} color={WOOD} roughness={0.6} shadow={false} />
            <Box at={[0, 0.5, 0.03]} size={[leaf * 0.62, 0.62, 0.02]} color={WOOD_DARK} roughness={0.6} shadow={false} />
            <Box at={[0, -0.42, 0.03]} size={[leaf * 0.62, 0.8, 0.02]} color={WOOD_DARK} roughness={0.6} shadow={false} />
            <mesh position={[(i === 0 && leaves === 2 ? 1 : leaves === 2 ? -1 : 1) * (leaf / 2 - 0.12), -0.05, 0.07]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.025, 0.025, 0.1, 10]} />
              <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        )
      })}
      {automatic && <Box at={[0, DOOR_HEIGHT + 0.42, 0.12]} size={[0.5, 0.08, 0.1]} color="#20242b" shadow={false} />}
      {/* Canopy */}
      <Box at={[0, DOOR_HEIGHT + 0.62, 0.42]} size={[width + 1, 0.07, 0.9]} color={METAL} roughness={0.5} />
    </group>
  )
}

/** Entrance built from the place's data, used until a real 3D model exists. */
function ProceduralEntrance({ e }: { e: EntranceData }) {
  const { steps, rise, height, rampLength, rampStartX, frontZ, doorWidth, landingWidth, stairsWidth } = geometry(e)
  const studs = useTexture(drawStuds, stairsWidth / 0.4, 1)
  const rampEnd = rampStartX + rampLength

  return (
    <group>
      <group position={[0, height, 0]}>
        <Door width={doorWidth} automatic={e.automaticDoor} />
      </group>

      {height > 0 && (
        <>
          <Box at={[0, height / 2, LANDING_DEPTH / 2]} size={[landingWidth, height, LANDING_DEPTH]} color={STONE} />
          <Box at={[0, height - 0.02, LANDING_DEPTH - 0.03]} size={[landingWidth + 0.04, 0.04, 0.08]} color={STONE_DARK} shadow={false} />
        </>
      )}

      {height === 0 && e.steps !== null && <Box at={[0, 0.012, 0.55]} size={[doorWidth + 0.5, 0.024, 0.9]} color="#5d6570" roughness={1} shadow={false} />}

      {e.steps === null && (
        <mesh position={[0, UNKNOWN_HEIGHT / 2, LANDING_DEPTH / 2]}>
          <boxGeometry args={[landingWidth, UNKNOWN_HEIGHT, LANDING_DEPTH]} />
          <meshStandardMaterial color="#7d8794" transparent opacity={0.28} depthWrite={false} />
          <Edges color="#3e444d" />
        </mesh>
      )}

      {Array.from({ length: steps }, (_, i) => {
        // Each step is a block from the ground up to its tread; the first one continues the landing
        const stepHeight = height - i * rise
        const z = LANDING_DEPTH + (i + 0.5) * STEP_DEPTH
        return (
          <group key={i}>
            <Box at={[0, stepHeight / 2, z]} size={[stairsWidth, stepHeight, STEP_DEPTH]} color={i % 2 ? STONE_DARK : STONE} />
            {/* The edge of each step is marked, as it should be on real stairs */}
            <Box at={[0, stepHeight - 0.012, z + STEP_DEPTH / 2 - 0.03]} size={[stairsWidth, 0.03, 0.06]} color="#8d8576" shadow={false} />
          </group>
        )
      })}

      {steps > 0 &&
        e.handrail &&
        [-1, 1].map((side) => (
          <Handrail
            key={side}
            from={[(side * stairsWidth) / 2, height + HANDRAIL_HEIGHT, LANDING_DEPTH - 0.1]}
            to={[(side * stairsWidth) / 2, HANDRAIL_HEIGHT, frontZ + 0.1]}
          />
        ))}

      {rampLength > 0 && (
        <>
          <Slope from={[rampStartX, height - 0.05, RAMP_WIDTH / 2 + 0.15]} to={[rampEnd, -0.05, RAMP_WIDTH / 2 + 0.15]} size={[0.1, RAMP_WIDTH]} color={RAMP} />
          {/* Kerb and rail on the open side, so a wheel cannot slip off */}
          <Slope from={[rampStartX, height + 0.03, RAMP_WIDTH + 0.12]} to={[rampEnd, 0.03, RAMP_WIDTH + 0.12]} size={[0.1, 0.06]} color={STONE_DARK} />
          <Handrail from={[rampStartX, height + HANDRAIL_HEIGHT, RAMP_WIDTH + 0.12]} to={[rampEnd, HANDRAIL_HEIGHT, RAMP_WIDTH + 0.12]} />
        </>
      )}

      {e.platformLift && (
        <group position={[-(landingWidth / 2 + 0.7), 0, 0.8]}>
          <Box at={[0, 0.05, 0]} size={[1.1, 0.1, 1.4]} color={METAL} roughness={0.5} />
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.52, (height + 1.1) / 2 + 0.1, 0]}>
              <boxGeometry args={[0.03, height + 1.1, 1.36]} />
              <meshStandardMaterial color={GLASS} transparent opacity={0.45} roughness={0.1} />
            </mesh>
          ))}
          <Box at={[0, (height + 1.3) / 2 + 0.1, -0.66]} size={[1.1, height + 1.3, 0.08]} color={METAL} roughness={0.5} />
          <Box at={[0.38, 1.0, -0.6]} size={[0.14, 0.22, 0.06]} color="#1f6feb" shadow={false} />
        </group>
      )}

      {e.tactilePaving && (
        <mesh position={[0, 0.012, frontZ + 0.45]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[stairsWidth, 0.4]} />
          <meshStandardMaterial map={studs} roughness={0.9} />
        </mesh>
      )}

      {/* Keeps the camera from zooming in on a bare door: about a person's reach around the entrance */}
      <mesh visible={false} position={[0, (height + DOOR_HEIGHT + 0.9) / 2, 1.2]}>
        <boxGeometry args={[landingWidth + 1.2, height + DOOR_HEIGHT + 0.9, 3.2]} />
      </mesh>
    </group>
  )
}

/**
 * The house front and the pavement. Kept outside <Bounds>, so the camera frames the entrance and the
 * wall simply runs out of the picture, as a street front does.
 */
function Setting({ e }: { e: EntranceData }) {
  const { height, rampLength, rampStartX, doorWidth, landingWidth } = geometry(e)
  const paving = useTexture(e.cobblestone ? drawSetts : drawSlabs, e.cobblestone ? 80 : 40, e.cobblestone ? 80 : 40)
  const left = -(landingWidth / 2 + 7)
  const right = Math.max(landingWidth / 2, rampStartX + rampLength) + 7
  const width = right - left
  const center = (left + right) / 2
  // Windows on both sides of the door, clear of its frame and canopy
  const windowX = Math.max(doorWidth / 2 + 1.55, landingWidth / 2 + 0.55)
  return (
    <group>
      <mesh position={[center, 0, 30]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial map={paving} roughness={0.95} />
      </mesh>
      <Box at={[center, (WALL_HEIGHT + height) / 2, -0.2]} size={[width, WALL_HEIGHT + height, 0.4]} color={PLASTER} roughness={0.95} />
      <Box at={[center, (height + 0.55) / 2, 0.03]} size={[width, height + 0.55, 0.08]} color={PLINTH} roughness={0.95} shadow={false} />
      <Box at={[center, WALL_HEIGHT + height - 0.12, 0.08]} size={[width, 0.24, 0.3]} color="#d8cbb4" roughness={0.9} />
      {[-3, -2, -1, 1, 2, 3].map((k) => (
        <Window key={k} at={[Math.sign(k) * (windowX + (Math.abs(k) - 1) * 2.3), height + 2.05, 0.02]} width={1.05} height={1.5} />
      ))}
    </group>
  )
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

export default function EntrancePreview({
  id,
  data,
  labels,
  model,
  hint,
}: {
  id: string
  data: EntranceData
  labels: EntranceLabels
  model?: string
  hint: string
}) {
  const specs = model ? [] : labelSpecs(data, labels)
  const spans = useRef<Record<string, HTMLSpanElement | null>>({})
  const project = (key: string, x: number, y: number, visible: boolean) => {
    const span = spans.current[key]
    if (!span) return
    span.style.visibility = visible ? 'visible' : 'hidden'
    if (visible) span.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
  }
  return (
    // The same information is listed as text above, so the drawing is hidden from screen readers
    <div className="entrance-preview" aria-hidden="true">
      <Canvas key={id} shadows="soft" frameloop="demand" dpr={[1, 2]} camera={{ position: [5.5, 3.6, 9], fov: 38 }}>
        {/* Daylight from the street side, a little warm, with the sky filling the shadows */}
        <hemisphereLight args={['#eaf2ff', '#b9a98c', 1.15]} />
        <directionalLight
          position={[6, 11, 9]}
          intensity={2.1}
          color="#fff3de"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
        />
        {!model && <Setting e={data} />}
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.3}>
            {model ? <GltfModel url={model} /> : <ProceduralEntrance e={data} />}
          </Bounds>
        </Suspense>
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.08} minAzimuthAngle={-Math.PI / 2.3} maxAzimuthAngle={Math.PI / 2.3} />
        <LabelProjector specs={specs} onProject={project} />
      </Canvas>
      <div className="scene-labels">
        {specs.map((spec) => (
          <span
            key={spec.key}
            className="scene-label"
            ref={(el) => {
              spans.current[spec.key] = el
            }}
          >
            {spec.text}
          </span>
        ))}
      </div>
      <div className="entrance-hint">{hint}</div>
    </div>
  )
}
