"use client"

/* ---------------------------------------------------------------------------
 * HeroAura :: a WebGL atmospheric layer that lives behind the hero's aether
 * plate. The hero's existing CSS / SVG composition gives it geometric
 * structure; HeroAura adds the slow, breathing volumetric depth that pure
 * CSS gradients can't reach — copper + teal nebula clouds drifting on a
 * 3-octave FBM noise field, with a cursor-tracked bright lens that pulls
 * highlights toward the pointer, and chromatic aberration that ramps with
 * scroll velocity.
 *
 * Why vanilla WebGL (no Three.js)
 *   The whole effect is a single fullscreen-quad fragment shader. Three's
 *   value is in the scenegraph + camera + lighting; we have one quad and
 *   no camera. Pulling in 600 KB of Three would be a bundle hit for zero
 *   benefit. The vanilla path keeps HeroAura in the same performance
 *   class as ParticleFieldGL and DividerFluid.
 *
 * Performance gates (matches the policy from PR #10 / #12)
 *   - Fine pointer only :: skip mounting on touch / coarse pointers, the
 *     hero already looks complete without this layer on mobile.
 *   - IntersectionObserver :: only run rAF while the canvas is on-screen
 *     (rootMargin 100px buys a frame of warm-up).
 *   - 32ms × 3 frame budget :: three consecutive blown frames suspend
 *     the loop permanently for that mount.
 *   - DPR cap 1.25 :: retina screens don't quadruple the fragment cost.
 *   - Reduced motion :: render a single static frame, no rAF, no
 *     listeners attached.
 * ------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"

type Props = {
  className?: string
}

const VERT = /* glsl */ `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = (a_pos + 1.0) * 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/* The fragment shader does three things:
   1. 3-octave FBM (fractional brownian motion) value-noise field. Two
      colour ramps — copper at high density, teal at the troughs —
      produce a slow nebula that breathes with `u_time`.
   2. Cursor-tracked light :: a soft additive disc whose centre tracks
      mouse position (smoothed client-side so the shader sees damped
      input). Adds a sense of inhabited depth — the room reacts to the
      visitor.
   3. Velocity-driven chromatic aberration :: the red and blue channels
      sample at slightly offset UVs along the velocity vector. Idles to
      0 when scroll is still, ramps up briefly when the hero is being
      scrolled past.
   Output is multiplied by a vertical mask so the layer fades out at
   the bottom edge of the hero (where the existing aether plate already
   provides density). */
const FRAG = /* glsl */ `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform vec2  u_mouse;     // smoothed 0..1, encoded -1 when missing
uniform float u_velocity;  // 0..1 scroll-velocity proxy
uniform float u_aspect;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

vec3 sampleNebula(vec2 uv, float t) {
  // Slow drift in two directions so the field doesn't feel like a wipe.
  vec2 q = vec2(uv.x * u_aspect, uv.y);
  q.x += t * 0.018;
  q.y -= t * 0.012;
  float n = fbm(q * 1.4);
  // A second, perturbed sample shapes the high-density pockets into
  // streaks rather than blobs.
  float n2 = fbm(q * 2.6 + vec2(t * 0.04, -t * 0.03));
  float density = smoothstep(0.30, 0.70, n + n2 * 0.35);

  // Two-tone palette :: copper highlights against deep teal-black.
  vec3 copper = vec3(0.85, 0.50, 0.27);
  vec3 teal   = vec3(0.05, 0.10, 0.13);
  vec3 col = mix(teal, copper, density);

  // Subtle cool wash over the troughs to keep the nebula from going
  // monochrome at low density.
  col += vec3(0.02, 0.04, 0.06) * (1.0 - density);
  return col;
}

void main() {
  vec2 uv = v_uv;

  // Velocity-driven chromatic aberration :: scale offsets by u_velocity
  // so a still hero is colour-neutral and a fast scroll-by smears.
  float ab = u_velocity * 0.012;
  vec2 dir = vec2(0.0, 1.0); // aberrate along the scroll axis
  vec3 col;
  col.r = sampleNebula(uv + dir * ab, u_time).r;
  col.g = sampleNebula(uv,            u_time).g;
  col.b = sampleNebula(uv - dir * ab, u_time).b;

  // Cursor-tracked highlight :: an additive copper bloom centred on
  // u_mouse. Encoded as -1 when no mouse data is available.
  if (u_mouse.x >= 0.0) {
    vec2 m = u_mouse;
    m.x *= u_aspect;
    vec2 p = vec2(uv.x * u_aspect, uv.y);
    float d = distance(p, m);
    float bloom = exp(-d * 5.0) * 0.55;
    col += vec3(0.95, 0.62, 0.34) * bloom;
  }

  // Vertical mask :: fade out the layer at the very top + bottom of
  // the hero so HeroAura sits inside the existing visual frame rather
  // than fighting the aether plate's gradient.
  float topFade    = smoothstep(0.0, 0.12, uv.y);
  float bottomFade = 1.0 - smoothstep(0.85, 1.0, uv.y);
  float mask = topFade * bottomFade;

  // Final alpha :: the layer is meant to live BEHIND the hero plate,
  // so we keep alpha modest. The layer's job is atmosphere, not
  // foreground.
  float alpha = 0.85 * mask;

  // Pre-multiplied alpha — composites cleanly atop whatever the page
  // background is.
  gl_FragColor = vec4(col * alpha, alpha);
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

export function HeroAura({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const [enabled, setEnabled] = useState(false)

  /* Fine-pointer gate :: keep the WebGL context off touch devices. The
     hero looks complete on mobile via the aether plate + CSS layers. */
  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setEnabled(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      antialias: false,
      alpha: true,
    })
    if (!gl) return

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      // If only one shader compiled, free the other so we don't leak
      // a WebGL shader object across the early return. compileShader
      // already deletes the failing one internally on its own error
      // path, so we only need to release the surviving handle here.
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

    /* Fullscreen quad. */
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(program, "a_pos")
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(program, "u_time")
    const uMouse = gl.getUniformLocation(program, "u_mouse")
    const uVelocity = gl.getUniformLocation(program, "u_velocity")
    const uAspect = gl.getUniformLocation(program, "u_aspect")
    gl.uniform2f(uMouse, -1, -1)
    gl.uniform1f(uVelocity, 0)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
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

    /* Reduced-motion path :: render one static frame and return early
       before any animation infrastructure is attached. */
    if (reduced) {
      gl.uniform1f(uTime, 0)
      gl.uniform2f(uMouse, -1, -1)
      gl.uniform1f(uVelocity, 0)
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

    /* Mouse smoothing :: target is set on every mousemove, smoothed
       value is what goes to the shader. Smoothing happens in the rAF
       tick below — a 0.08 lerp factor gives ~10-frame settling at
       60fps which feels like motion-blurred attention rather than a
       laser-tracked spotlight. */
    let targetX = -1
    let targetY = -1
    let smoothX = -1
    let smoothY = -1
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        targetX = -1
        targetY = -1
        return
      }
      // Y is flipped because the shader uses bottom-left origin via
      // (a_pos + 1) * 0.5, but DOM coordinates are top-left.
      targetX = (e.clientX - rect.left) / rect.width
      targetY = 1.0 - (e.clientY - rect.top) / rect.height
    }
    const onLeave = () => {
      targetX = -1
      targetY = -1
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    canvas.addEventListener("mouseleave", onLeave)

    /* Scroll velocity :: a low-pass filter on |scrollY change| per
       frame, normalised by the viewport. Lerps back to 0 when the page
       is still so the chromatic aberration only kicks in when the
       reader is actively scrolling. */
    let lastScrollY = window.scrollY
    let velocity = 0
    const onScroll = () => {
      // The scroll delta is sampled inside the tick below; nothing to
      // do here other than keep the listener alive so the browser
      // doesn't optimise it away.
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    /* IO gate. */
    let visible = false
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible = entry.isIntersecting
          if (visible && !raf) {
            last = performance.now()
            blownFrames = 0
            // Reset scroll-velocity baselines on resume :: while the
            // hero was off-screen `lastScrollY` froze, so the first
            // tick after re-intersection would otherwise compute the
            // entire distance scrolled during the paused window as a
            // single-frame delta and trigger a spurious aberration
            // burst. Anchor to current scroll + zero velocity instead.
            lastScrollY = window.scrollY
            velocity = 0
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
        if (blownFrames >= 3) return
      } else {
        blownFrames = 0
      }

      // Smooth mouse target.
      if (targetX < 0) {
        smoothX = -1
        smoothY = -1
      } else {
        if (smoothX < 0) {
          smoothX = targetX
          smoothY = targetY
        } else {
          smoothX += (targetX - smoothX) * 0.08
          smoothY += (targetY - smoothY) * 0.08
        }
      }

      // Sample scroll velocity.
      const sy = window.scrollY
      const dy = Math.abs(sy - lastScrollY)
      lastScrollY = sy
      const vh = Math.max(1, window.innerHeight)
      // Normalise: a 30px/frame delta on a 1000px viewport reads as
      // ~0.03; clamp at 1 so an aggressive flick still has a ceiling.
      const inst = Math.min(1, dy / (vh * 0.04))
      // Lerp toward instant value :: 0.18 up, 0.06 down → fast attack,
      // slow release so the aberration trails behind the scroll.
      const k = inst > velocity ? 0.18 : 0.06
      velocity += (inst - velocity) * k

      gl.uniform1f(uTime, tNow / 1000)
      gl.uniform2f(uMouse, smoothX, smoothY)
      gl.uniform1f(uVelocity, velocity)
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
      window.removeEventListener("scroll", onScroll)
      canvas.removeEventListener("mouseleave", onLeave)
      gl.deleteBuffer(buf)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [enabled, reduced])

  if (!enabled) return null
  return (
    <div aria-hidden className={className ?? "pointer-events-none absolute inset-0"}>
      <canvas ref={canvasRef} className="h-full w-full" style={{ display: "block" }} />
    </div>
  )
}
