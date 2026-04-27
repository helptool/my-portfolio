"use client"

/* ---------------------------------------------------------------------------
 * ShaderImage :: vanilla WebGL displacement + chromatic aberration overlay.
 *
 * Renders a fullscreen-of-its-container canvas that samples the source image
 * as a texture and:
 *   - displaces UVs by simplex-noise driven by uMouse + uTime
 *   - splits R/G/B channels by a small offset (chromatic aberration) that
 *     ramps with mouse-distance and scroll-velocity
 *   - applies fragment-grain so the result reads filmic, not plasticky
 *
 * Why vanilla WebGL and not Three.js
 *   Three.js + r3f would add ~600 KB to the initial bundle. This shader is
 *   one program, ~120 lines of GLSL, ~5 KB minified including the JS host.
 *
 * SSR fallback :: a plain <Image> renders first (so SEO/og crawlers see the
 *   image, and visitors see something during hydration). After mount the
 *   canvas takes over and the image is hidden but kept in the DOM as the
 *   texture source.
 *
 * Reduced motion :: canvas never mounts; visitor stays on the plain image.
 * ------------------------------------------------------------------------- */

import Image, { type ImageProps } from "next/image"
import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { SHIMMER } from "@/lib/shimmer"
import { useFinePointer } from "@/lib/hooks"
import { cn } from "@/lib/utils"

type Props = Omit<ImageProps, "placeholder" | "blurDataURL" | "onLoad"> & {
  /** Strength of the displacement at rest (0..1). Default 0.04. */
  baseWarp?: number
  /** Extra warp added on hover within the canvas. */
  hoverWarp?: number
  /** RGB split max in normalized UV. Default 0.012. */
  chromaticAberration?: number
  /** When true, hovering animates BOTH warp and chromatic aberration toward
      0 instead of toward `baseWarp + hoverWarp`. Idle = full effect, hover
      = clean. Used by the manifesto portrait so the visitor can "see
      through" the shader pass by hovering. */
  clearOnHover?: boolean
}

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = (a_pos + 1.0) * 0.5;
  v_uv.y = 1.0 - v_uv.y; // image y is flipped vs gl convention
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_warp;
uniform float u_aberration;
uniform float u_aspect; // image aspect / container aspect

// 2D simplex-ish noise (cheap, good enough for displacement)
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// "object-cover" UV remap so the image fills the canvas without distortion.
// aspect = imgAspect / containerAspect.
//   aspect > 1 :: image is wider than container shape — crop the width by
//                 sampling a narrower x range (divide, since aspect > 1).
//   aspect < 1 :: image is taller than container shape — crop the height
//                 (multiply, since aspect < 1 shrinks |c.y|).
vec2 coverUV(vec2 uv, float aspect) {
  vec2 c = uv - 0.5;
  if (aspect > 1.0) {
    c.x /= aspect;
  } else {
    c.y *= aspect;
  }
  return c + 0.5;
}

void main() {
  vec2 uv = coverUV(v_uv, u_aspect);

  // Distance from mouse to current pixel (UV space).
  vec2 m = u_mouse;
  float dist = distance(v_uv, m);

  // Displacement field :: low-freq simplex noise plus a soft mouse falloff.
  float n1 = noise(uv * 3.4 + u_time * 0.05);
  float n2 = noise(uv * 7.8 - u_time * 0.07);
  float field = n1 * 0.55 + n2 * 0.45;
  float falloff = exp(-dist * 4.5);
  vec2 disp = vec2(
    field * 0.6 + falloff * (m.x - v_uv.x) * 0.8,
    field * 0.6 + falloff * (m.y - v_uv.y) * 0.8
  );
  vec2 warpedUV = uv + disp * u_warp;

  // Sample R/G/B with offsets for chromatic aberration. Strength scales
  // with mouse-distance falloff so the splitting blooms around the cursor.
  float chroma = u_aberration * (0.4 + falloff * 1.6);
  vec2 dir = normalize(disp + vec2(0.0001));
  float r = texture2D(u_image, warpedUV + dir * chroma).r;
  float g = texture2D(u_image, warpedUV).g;
  float b = texture2D(u_image, warpedUV - dir * chroma).b;
  float a = texture2D(u_image, warpedUV).a;

  vec3 color = vec3(r, g, b);

  // Subtle warm fragment grain.
  float grain = (hash2(v_uv * u_resolution + u_time).x) * 0.04;
  color += vec3(grain * 0.9, grain * 0.7, grain * 0.5);

  gl_FragColor = vec4(color, a);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, source)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh)
    return null
  }
  return sh
}

export function ShaderImage({
  baseWarp = 0.04,
  hoverWarp = 0.06,
  chromaticAberration = 0.012,
  clearOnHover = false,
  className,
  alt,
  ...imageProps
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [shaderActive, setShaderActive] = useState(false)
  const reduced = useReducedMotion()
  // The displacement is a hover/proximity reaction. On a touch device
  // there's no cursor to displace toward, the shader just runs the
  // ambient simplex warp — which is invisible to most users but burns a
  // continuous rAF loop, an extra GPU pass, and one full-viewport canvas
  // composite per frame. Skip the shader entirely on coarse pointers and
  // let the underlying <Image> render flat.
  const finePointer = useFinePointer()
  const shaderEnabled = !reduced && finePointer

  /* Boot the shader once the source image has loaded AND reduced-motion is
     not requested AND WebGL is supported AND we have a fine pointer. */
  useEffect(() => {
    if (!shaderEnabled || !imgLoaded) return
    const canvas = canvasRef.current
    const container = containerRef.current
    const img = imgRef.current
    if (!canvas || !container || !img) return

    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: true })
    if (!gl) return

    /* Track every GL resource we allocate so we can dispose any partial
       state if a later step fails. Without this, a CORS or link failure
       would leak shaders/program/buffer/texture until the WebGL context
       is GC'd with the canvas — which only happens when the component
       unmounts. */
    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vert || !frag) {
      if (vert) gl.deleteShader(vert)
      if (frag) gl.deleteShader(frag)
      return
    }
    const program = gl.createProgram()!
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      return
    }

    /* Fullscreen quad. Two triangles, four vertices. */
    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const aPos = gl.getAttribLocation(program, "a_pos")
    const uImage = gl.getUniformLocation(program, "u_image")
    const uResolution = gl.getUniformLocation(program, "u_resolution")
    const uMouse = gl.getUniformLocation(program, "u_mouse")
    const uTime = gl.getUniformLocation(program, "u_time")
    const uWarp = gl.getUniformLocation(program, "u_warp")
    const uAberration = gl.getUniformLocation(program, "u_aberration")
    const uAspect = gl.getUniformLocation(program, "u_aspect")

    /* Texture bound from the <img> element directly. */
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    } catch {
      /* CORS may block uploading the image to the GPU. Dispose every
         resource allocated above and bail — the visitor sees the plain
         <Image> fallback instead. */
      gl.deleteTexture(tex)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      return
    }

    let mouseX = 0.5
    let mouseY = 0.5
    let targetMouseX = 0.5
    let targetMouseY = 0.5
    /* Idle vs hover targets :: when `clearOnHover` is true, the idle
       state IS the visible effect (warp + aberration both at full)
       and hovering animates them toward zero. When false (default),
       the original behaviour holds: idle is calm, hovering ramps the
       warp up. */
    const idleWarp = clearOnHover ? baseWarp : baseWarp
    const idleAberration = chromaticAberration
    const hoverWarpTarget = clearOnHover ? 0 : baseWarp + hoverWarp
    const hoverAberrationTarget = clearOnHover ? 0 : chromaticAberration

    let warp = idleWarp
    let targetWarp = idleWarp
    let aberration = idleAberration
    let targetAberration = idleAberration
    let dpr = Math.min(2, window.devicePixelRatio || 1)
    let rafId = 0
    let aspect = 1

    const resize = () => {
      const r = container.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.floor(r.width * dpr))
      canvas.height = Math.max(1, Math.floor(r.height * dpr))
      canvas.style.width = `${r.width}px`
      canvas.style.height = `${r.height}px`
      const imgAspect = (img.naturalWidth || 1) / (img.naturalHeight || 1)
      const containerAspect = r.width / Math.max(1, r.height)
      aspect = imgAspect / containerAspect
    }
    resize()

    const onMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect()
      targetMouseX = (e.clientX - r.left) / r.width
      targetMouseY = (e.clientY - r.top) / r.height
      targetWarp = hoverWarpTarget
      targetAberration = hoverAberrationTarget
    }
    const onLeave = () => {
      targetMouseX = 0.5
      targetMouseY = 0.5
      targetWarp = idleWarp
      targetAberration = idleAberration
    }

    container.addEventListener("pointermove", onMove)
    container.addEventListener("pointerleave", onLeave)
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    /* IntersectionObserver pause :: the manifesto portrait is below the
       fold; on a long scroll most of the time the canvas is offscreen.
       Idling the rAF saves ~1ms of GPU + JS per frame. Resume on re-enter. */
    let inView = true
    const start = performance.now()
    const render = () => {
      if (!inView) {
        rafId = 0
        return
      }
      const t = (performance.now() - start) / 1000
      // Smooth mouse + warp toward target — feels less twitchy than raw input.
      mouseX += (targetMouseX - mouseX) * 0.08
      mouseY += (targetMouseY - mouseY) * 0.08
      warp += (targetWarp - warp) * 0.06
      aberration += (targetAberration - aberration) * 0.06

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(uImage, 0)
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform2f(uMouse, mouseX, mouseY)
      gl.uniform1f(uTime, t)
      gl.uniform1f(uWarp, warp)
      gl.uniform1f(uAberration, aberration)
      gl.uniform1f(uAspect, aspect)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      rafId = requestAnimationFrame(render)
    }
    rafId = requestAnimationFrame(render)
    setShaderActive(true)

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inView = entry.isIntersecting
          if (inView && !rafId) {
            rafId = requestAnimationFrame(render)
          } else if (!inView && rafId) {
            cancelAnimationFrame(rafId)
            rafId = 0
          }
        }
      },
      { rootMargin: "100px" },
    )
    io.observe(container)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      io.disconnect()
      ro.disconnect()
      container.removeEventListener("pointermove", onMove)
      container.removeEventListener("pointerleave", onLeave)
      gl.deleteTexture(tex)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      setShaderActive(false)
    }
  }, [shaderEnabled, imgLoaded, baseWarp, hoverWarp, chromaticAberration, clearOnHover])

  return (
    <div
      ref={containerRef}
      /* `relative` is the default positioning context for the inner canvas;
         caller can override with `absolute inset-0` etc. via className —
         Tailwind's `relative` will be cancelled by the later utility. We
         don't put position in inline style because that would beat the
         caller's class. `overflow-hidden` stays inline because it's never
         overridden in practice. */
      className={cn("relative", className)}
      style={{ overflow: "hidden" }}
    >
      {/* Hidden source image — stays in DOM for SEO/crawlers and as the
          WebGL texture source. We let next/image handle responsive sizing,
          formats, and the LQIP swap-up via the shimmer placeholder. */}
      <Image
        {...imageProps}
        alt={alt}
        ref={imgRef as never}
        placeholder="blur"
        blurDataURL={SHIMMER}
        onLoad={() => setImgLoaded(true)}
        // crossOrigin needed for CORS-safe texture uploads on some hosts.
        crossOrigin="anonymous"
        style={{
          ...(imageProps.style || {}),
          // Hide the underlying image once the canvas is rendering.
          opacity: shaderActive ? 0 : 1,
          transition: "opacity 240ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />
      {/* Canvas overlay, painted on top of the image once shader is live. */}
      {shaderEnabled && (
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: shaderActive ? 1 : 0,
            transition: "opacity 320ms cubic-bezier(0.16,1,0.3,1)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  )
}
