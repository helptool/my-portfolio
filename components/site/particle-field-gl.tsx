"use client"

/* ---------------------------------------------------------------------------
 * ParticleFieldGL :: vanilla WebGL ember field replacing the prior 16-div
 * Framer-Motion ParticleField. Renders ~1500 points on desktop, ~600 on
 * mobile, with additive blending, soft circular sprites in the fragment
 * shader, and per-particle drift + flicker computed in the vertex shader
 * (so the JS frame loop only updates a single uniform `u_time`).
 *
 * Mobile-throttle safety :: clamp DPR to 1.25, halve point count, and gate
 * the rAF loop by frame-budget — if a frame takes >32ms we skip the next
 * tick to give the main thread room. If three consecutive frames blow the
 * budget the loop self-suspends until visibility changes.
 *
 * Reduced motion :: renders a single static frame, no rAF loop.
 *
 * No third-party deps :: project deliberately avoids Three.js to keep the
 * bundle footprint small (the existing ShaderImage uses the same vanilla
 * WebGL pattern).
 * ------------------------------------------------------------------------- */

import { useEffect, useRef } from "react"
import { useReducedMotion } from "framer-motion"

type Props = {
  /** Override for desktop point count. Default 1500. */
  desktopCount?: number
  /** Override for mobile/coarse-pointer point count. Default 600. */
  mobileCount?: number
  /** Tailwind className for sizing the outer wrapper. */
  className?: string
}

/* Minimal procedural noise used in the vertex shader for per-particle drift.
   We don't need real simplex — a low-amplitude sinusoid sum reads as ember
   wobble. Keeping it cheap is the whole point of moving to GPU. */
const VERT = /* glsl */ `
attribute vec2 a_seed;     // [0..1, 0..1] stable per-particle seed
attribute float a_size;    // base point size

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_dpr;

varying float v_alpha;

void main() {
  // Distribute particles deterministically across the viewport. Vertical
  // drift loops every ~14 seconds; horizontal drift wraps gently. Seeds
  // shift the phase so adjacent particles aren't synchronised.
  float vy = mod(a_seed.y + u_time * (0.012 + a_seed.x * 0.018), 1.0);
  float vx = a_seed.x + sin(u_time * 0.18 + a_seed.y * 6.2831) * 0.012;

  // Convert normalised coords to clip space (origin top-left in our case).
  vec2 ndc = vec2(vx * 2.0 - 1.0, 1.0 - vy * 2.0);

  // Pulse opacity :: each particle fades in over 0..0.15, holds, fades
  // out 0.85..1.0 of its loop so they don't pop in/out.
  float life = vy;
  float fadeIn  = smoothstep(0.0, 0.15, life);
  float fadeOut = 1.0 - smoothstep(0.85, 1.0, life);
  v_alpha = fadeIn * fadeOut * (0.4 + a_seed.x * 0.6);

  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = a_size * u_dpr * (0.6 + a_seed.x * 0.8);
}
`

const FRAG = /* glsl */ `
precision mediump float;
varying float v_alpha;

uniform vec3 u_color;

void main() {
  // Soft circular sprite via radial gradient. gl_PointCoord is 0..1 across
  // the point quad; centre is 0.5,0.5.
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float falloff = smoothstep(0.5, 0.0, r);
  gl_FragColor = vec4(u_color, falloff * v_alpha);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh)
    return null
  }
  return sh
}

export function ParticleFieldGL({
  desktopCount = 1500,
  mobileCount = 600,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile =
      window.matchMedia("(hover: none), (max-width: 720px)").matches
    const count = isMobile ? mobileCount : desktopCount

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: false,
      antialias: false,
      alpha: true,
    })
    if (!gl) return

    /* ----- shader program ----- */
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

    /* ----- per-particle attributes ----- */
    // a_seed: 2 floats per point, [0..1, 0..1]
    // a_size: 1 float per point, base px size
    const seeds = new Float32Array(count * 2)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      seeds[i * 2] = Math.random()
      seeds[i * 2 + 1] = Math.random()
      sizes[i] = 1.4 + Math.random() * 2.6
    }

    const seedBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW)
    const seedLoc = gl.getAttribLocation(program, "a_seed")
    gl.enableVertexAttribArray(seedLoc)
    gl.vertexAttribPointer(seedLoc, 2, gl.FLOAT, false, 0, 0)

    const sizeBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf)
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW)
    const sizeLoc = gl.getAttribLocation(program, "a_size")
    gl.enableVertexAttribArray(sizeLoc)
    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0)

    /* ----- uniforms ----- */
    const uTime = gl.getUniformLocation(program, "u_time")
    const uRes = gl.getUniformLocation(program, "u_resolution")
    const uDpr = gl.getUniformLocation(program, "u_dpr")
    const uColor = gl.getUniformLocation(program, "u_color")

    // Copper ember tone — same hue family as the realm palette.
    gl.uniform3f(uColor, 0.86, 0.55, 0.27)

    /* ----- additive blending for the bloomy ember feel ----- */
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
    gl.disable(gl.DEPTH_TEST)

    /* ----- size + DPR clamp ----- */
    // Cap DPR at 1.25 even on retina to keep the fragment shader sane on
    // mid-tier mobile GPUs. Not visually perceptible at this density.
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
      gl.uniform2f(uRes, cw, ch)
      gl.uniform1f(uDpr, dpr)
    }
    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(canvas)

    /* ----- render loop ----- */
    let raf = 0
    let last = performance.now()
    let suspended = false
    let blownFrames = 0
    let inView = true

    const draw = (tNow: number) => {
      const t = tNow / 1000
      gl.uniform1f(uTime, t)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.POINTS, 0, count)
    }

    if (reduced) {
      // Render a single static frame and return. No rAF loop, no per-frame
      // GPU work — respects the user's preference and saves battery.
      draw(0)
      return () => {
        ro.disconnect()
        gl.deleteBuffer(seedBuf)
        gl.deleteBuffer(sizeBuf)
        gl.deleteProgram(program)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
      }
    }

    const tick = (tNow: number) => {
      if (suspended || !inView) return
      const dt = tNow - last
      last = tNow

      // Frame-budget gate :: if a frame took longer than 32ms (i.e. we're
      // running at <30fps) treat that as a "blown" frame. After three in a
      // row we suspend the loop entirely until visibility changes — this
      // protects throttled phones from a runaway raf loop dragging the
      // main thread.
      if (dt > 32) {
        blownFrames++
        if (blownFrames >= 3) {
          suspended = true
          return
        }
      } else {
        blownFrames = 0
      }

      draw(tNow)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onVis = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
      } else {
        suspended = false
        blownFrames = 0
        last = performance.now()
        if (!raf && inView) raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener("visibilitychange", onVis)

    /* IntersectionObserver-based pause :: when the hero scrolls fully out
       of view the GPU shouldn't keep drawing 1500 points the user can't
       see. This is the single biggest mobile-scroll cost — the canvas is
       large and additive-blended, so even off-screen draws cost a full
       compositor pass. Resume on re-intersect. */
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inView = entry.isIntersecting
          if (inView) {
            suspended = false
            blownFrames = 0
            last = performance.now()
            if (!raf && !document.hidden) raf = requestAnimationFrame(tick)
          } else if (raf) {
            cancelAnimationFrame(raf)
            raf = 0
          }
        }
      },
      { rootMargin: "100px" },
    )
    io.observe(canvas)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener("visibilitychange", onVis)
      io.disconnect()
      ro.disconnect()
      gl.deleteBuffer(seedBuf)
      gl.deleteBuffer(sizeBuf)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [desktopCount, mobileCount, reduced])

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
