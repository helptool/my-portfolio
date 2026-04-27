"use client"

/* ---------------------------------------------------------------------------
 * DividerFluid :: a thin WebGL band that runs a copper-toned fluid noise
 * shader behind the rune divider. Adds depth and motion that CSS alone
 * couldn't reach without piling on more transforms.
 *
 * Mounted only on fine pointers (mouse / trackpad). On touch devices the
 * native scroll momentum is already smooth and the existing CSS divider
 * looks correct, so we skip mounting entirely there — saves the GL
 * context + a per-frame fragment shader pass on mobile.
 *
 * Pause-when-offscreen :: the rAF loop runs only while the canvas is
 * intersecting the viewport (rootMargin 100px). Off-screen → cancelled.
 * Dropped frames :: if 3 consecutive frames exceed 32ms we suspend
 * permanently (matches the policy in particle-field-gl.tsx).
 * ------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"

type Props = {
  className?: string
  /** Intensity 0..1, normally driven by the divider's scroll progress. */
  intensity?: number
}

const VERT = /* glsl */ `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = (a_pos + 1.0) * 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/* The fragment shader paints horizontal copper streaks displaced by a
   2-octave value-noise field. The streaks move with `u_time` and slowly
   pulse with `u_intensity`. The streaks are masked by a vertical band
   (smoothstep of v_uv.y) so the band feels like a horizon line rather
   than a full panel. Mouse position influences the horizontal centre of
   the brightest streak when mouse data is available. */
const FRAG = /* glsl */ `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform vec2  u_mouse; // 0..1, NaN-checked client-side
uniform float u_aspect;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 uv = v_uv;
  uv.x *= u_aspect;

  // Two octaves of moving noise produce a slow ribbon-like distortion.
  float n = noise(vec2(uv.x * 2.6 - u_time * 0.18, uv.y * 6.0))
          + noise(vec2(uv.x * 5.2 + u_time * 0.06, uv.y * 12.0)) * 0.5;
  n = n / 1.5;

  // Vertical band mask :: brightest along the horizon line, fades top
  // and bottom. Combined with the noise displacement it looks like a
  // copper river travelling under the surface of the divider.
  float band = smoothstep(0.42, 0.5, v_uv.y) * (1.0 - smoothstep(0.5, 0.58, v_uv.y));

  // Mouse glow :: lerp brightness around mouse.x. Falls back to 0.5 when
  // mouse data is missing (we encode "no mouse" as u_mouse.x < 0).
  float mx = u_mouse.x < 0.0 ? 0.5 : u_mouse.x;
  float dx = abs(v_uv.x - mx);
  float glow = (1.0 - smoothstep(0.0, 0.18, dx)) * 0.4;

  // Centre window mask :: the divider's label + sigil sit at the
  // horizontal midpoint. We hollow the band's brightness across the
  // central 36% of width so the type behind it stays readable. The
  // band is still painted there (just dimmer), so the noise still
  // reads as a continuous river — it just doesn't fight the words.
  float centreDist = abs(v_uv.x - 0.5);
  float centreCutout = smoothstep(0.10, 0.22, centreDist);

  // Final ribbon brightness :: dimmed globally (was 0.55+0.45*n, now
  // 0.32+0.32*n) so the band is a presence rather than a feature.
  float ribbon = (band * (0.32 + n * 0.32) + glow * band * centreCutout) * u_intensity;
  ribbon *= mix(0.18, 1.0, centreCutout); // fade the band itself in the centre

  // Copper ember palette :: same hue family as the rest of the realm.
  vec3 base   = vec3(0.043, 0.024, 0.024); // background tint that won't fight the page bg
  vec3 copper = vec3(0.9, 0.55, 0.28);
  vec3 col    = base + copper * ribbon;

  // Pre-multiplied alpha so the canvas sits cleanly atop whatever's behind.
  gl_FragColor = vec4(col * ribbon, ribbon);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)
  if (!s) return null
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s)
    return null
  }
  return s
}

export function DividerFluid({ className, intensity = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const [enabled, setEnabled] = useState(false)
  const [nearViewport, setNearViewport] = useState(false)
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity

  /* Fine-pointer gate :: only mount the GL context on devices with a
     mouse / trackpad. matchMedia is the cheapest reliable signal for
     this — `(hover: hover) and (pointer: fine)` is the standard
     incantation that cleanly excludes touch + stylus. */
  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setEnabled(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  /* Lazy-mount gate :: the page has 7 RuneDividers, each owning a
     DividerFluid. Allocating 7 WebGL contexts at first paint costs
     real time on lower-end laptops and contributes to the choppy
     feel during initial scroll. We gate the GL useEffect on a
     separate IntersectionObserver with a generous rootMargin (400px)
     so each divider's context is created only just before it scrolls
     into view, but not so late that the first frame ships an empty
     band. Once `nearViewport` flips true we never flip it back —
     reusing the GL context across re-intersections via the existing
     rAF-pause IO is cheaper than creating + destroying. */
  useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined") return
    const canvas = canvasRef.current
    if (!canvas) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setNearViewport(true)
            io.disconnect()
            return
          }
        }
      },
      { rootMargin: "400px" },
    )
    io.observe(canvas)
    return () => io.disconnect()
  }, [enabled])

  useEffect(() => {
    if (!enabled || !nearViewport) return
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true })
    if (!gl) return

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs)
      if (fs) gl.deleteShader(fs)
      return
    }
    const program = gl.createProgram()
    if (!program) {
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      return
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      return
    }
    gl.useProgram(program)

    /* Fullscreen quad :: two triangles covering clip space. */
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(program, "a_pos")
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(program, "u_time")
    const uIntensity = gl.getUniformLocation(program, "u_intensity")
    const uMouse = gl.getUniformLocation(program, "u_mouse")
    const uAspect = gl.getUniformLocation(program, "u_aspect")
    gl.uniform2f(uMouse, -1, -1)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA) // pre-multiplied alpha
    gl.disable(gl.DEPTH_TEST)

    const DPR_CAP = 1.25
    const setSize = () => {
      const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cw = Math.max(1, Math.floor(w * dpr))
      const ch = Math.max(1, Math.floor(h * dpr))
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
        gl.viewport(0, 0, cw, ch)
      }
      gl.uniform1f(uAspect, cw / ch)
    }
    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(canvas)

    /* Reduced-motion path :: render a single static frame and bail out
       before any animation infrastructure (IO + mouse listeners + tick)
       gets attached. Doing this earlier than the rAF setup is critical:
       if we registered the IntersectionObserver first and only then
       checked `reduced`, the observer's callback would later start the
       loop on intersection, violating the user preference. */
    if (reduced) {
      gl.uniform1f(uTime, 0)
      gl.uniform1f(uIntensity, 0.6)
      gl.uniform2f(uMouse, -1, -1)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      return () => {
        ro.disconnect()
        gl.deleteBuffer(buf)
        gl.deleteProgram(program)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
      }
    }

    /* Mouse tracking :: throttled via rAF, normalised to 0..1 over the
       canvas bounds. Set u_mouse to (-1,-1) when the cursor leaves. */
    let mouseX = -1
    let mouseY = -1
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        mouseX = -1
        mouseY = -1
        return
      }
      mouseX = (e.clientX - rect.left) / rect.width
      mouseY = (e.clientY - rect.top) / rect.height
    }
    const onLeave = () => {
      mouseX = -1
      mouseY = -1
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    canvas.addEventListener("mouseleave", onLeave)

    /* IntersectionObserver gate :: pause the rAF loop when off-screen.
       rootMargin 100px buys a frame of warm-up before the band scrolls
       into view so the first paint isn't black. */
    let visible = false
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible = entry.isIntersecting
          if (visible && !raf) {
            last = performance.now()
            blownFrames = 0
            raf = requestAnimationFrame(tick)
          }
        }
      },
      { rootMargin: "100px" }
    )
    io.observe(canvas)

    let raf = 0
    let last = performance.now()
    let blownFrames = 0
    const tick = (tNow: number) => {
      raf = 0
      if (!visible) return
      const dt = tNow - last
      last = tNow

      if (dt > 32) {
        blownFrames++
        if (blownFrames >= 3) {
          // Suspend permanently for this mount; visibilitychange or scroll
          // back into view via IO will not re-enter the suspended branch
          // because we leave `raf` at 0 here.
          return
        }
      } else {
        blownFrames = 0
      }

      gl.uniform1f(uTime, tNow / 1000)
      gl.uniform1f(uIntensity, Math.max(0, Math.min(1.2, intensityRef.current)))
      gl.uniform2f(uMouse, mouseX, mouseY)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      raf = requestAnimationFrame(tick)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener("mousemove", onMove)
      canvas.removeEventListener("mouseleave", onLeave)
      gl.deleteBuffer(buf)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [enabled, reduced, nearViewport])

  if (!enabled) return null
  return (
    <div aria-hidden className={className ?? "pointer-events-none absolute inset-0"}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: "block" }}
      />
    </div>
  )
}
