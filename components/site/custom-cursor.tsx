"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

type CursorMode = "default" | "hover" | "view" | "drag" | "enter"

export function CustomCursor() {
  const [mode, setMode] = useState<CursorMode>("default")
  const [label, setLabel] = useState<string>("")
  const [enabled, setEnabled] = useState(false)
  const [pressed, setPressed] = useState(false)

  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const ringX = useSpring(x, { stiffness: 260, damping: 26, mass: 0.6 })
  const ringY = useSpring(y, { stiffness: 260, damping: 26, mass: 0.6 })
  const dotX = useSpring(x, { stiffness: 900, damping: 40, mass: 0.25 })
  const dotY = useSpring(y, { stiffness: 900, damping: 40, mass: 0.25 })

  const ringSize = useMotionValue(40)
  const ringScale = useSpring(ringSize, { stiffness: 220, damping: 22 })
  const ringOpacity = useTransform(ringScale, [40, 120], [0.55, 0.1])

  const raf = useRef<number | null>(null)
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)")
    setEnabled(mql.matches)
    const onChange = () => setEnabled(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      if (raf.current == null) {
        raf.current = requestAnimationFrame(() => {
          x.set(mouse.current.x)
          y.set(mouse.current.y)
          raf.current = null
        })
      }
    }

    /* Spurious re-render guard :: detect fires on EVERY mouseover (every
       child element entered). Without this guard, hovering across a paragraph
       full of links would trigger one React re-render per character. We
       remember the last committed (mode, label) tuple in a ref and only call
       setState when it actually changes. The motion-value ringSize.set is
       cheap and idempotent so we don't bother guarding it. */
    let lastMode: CursorMode = "default"
    let lastLabel = ""
    const commitMode = (next: CursorMode, lbl: string) => {
      if (next !== lastMode) {
        lastMode = next
        setMode(next)
      }
      if (lbl !== lastLabel) {
        lastLabel = lbl
        setLabel(lbl)
      }
    }

    const detect = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      const el = t.closest<HTMLElement>("[data-cursor]")
      if (el) {
        const c = (el.dataset.cursor as CursorMode) || "hover"
        const lbl = el.dataset.cursorLabel || ""
        commitMode(c, lbl)
        if (c === "view" || c === "enter") ringSize.set(120)
        else if (c === "drag") ringSize.set(96)
        else ringSize.set(64)
      } else {
        commitMode("default", "")
        ringSize.set(40)
      }
    }

    const onDown = () => setPressed(true)
    const onUp = () => setPressed(false)
    const onLeave = () => { x.set(-200); y.set(-200) }

    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mouseover", detect, { passive: true })
    window.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("mouseleave", onLeave)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseover", detect)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("mouseleave", onLeave)
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }
  }, [enabled, x, y, ringSize])

  if (!enabled) return null

  const showLabel = mode !== "default" && label.length > 0

  return (
    <>
      {/* trailing ring */}
      <motion.div
        aria-hidden
        style={{
          x: ringX,
          y: ringY,
          width: ringScale,
          height: ringScale,
          opacity: ringOpacity,
        }}
        className="pointer-events-none fixed left-0 top-0 z-[100] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[oklch(0.72_0.14_50_/_0.9)] mix-blend-difference"
      >
        <div
          className="absolute inset-0 rounded-full transition-[background] duration-300"
          style={{
            background:
              mode === "view" || mode === "enter"
                ? "oklch(0.72 0.14 50 / 0.18)"
                : mode === "hover" || mode === "drag"
                ? "oklch(0.72 0.14 50 / 0.08)"
                : "transparent",
          }}
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center font-hud text-[9px] tracking-[0.3em] text-[oklch(0.94_0.015_80)]"
          animate={{ opacity: showLabel ? 1 : 0 }}
          transition={{ duration: 0.18 }}
        >
          {label}
        </motion.div>
      </motion.div>

      {/* center dot */}
      <motion.div
        aria-hidden
        style={{ x: dotX, y: dotY }}
        className="pointer-events-none fixed left-0 top-0 z-[101] -translate-x-1/2 -translate-y-1/2"
      >
        <motion.div
          className="rounded-full bg-[oklch(0.72_0.14_50)] mix-blend-difference"
          animate={{
            width: pressed ? 14 : mode === "default" ? 6 : 3,
            height: pressed ? 14 : mode === "default" ? 6 : 3,
            opacity: mode === "default" ? 1 : 0.55,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        />
      </motion.div>

      {/* crosshair lines on precision modes */}
      <motion.div
        aria-hidden
        style={{ x: ringX, y: ringY }}
        animate={{ opacity: mode === "drag" ? 0.35 : 0 }}
        transition={{ duration: 0.25 }}
        className="pointer-events-none fixed left-0 top-0 z-[99] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="relative h-[140px] w-[140px]">
          <div className="absolute left-1/2 top-0 h-[20px] w-px -translate-x-1/2 bg-[oklch(0.72_0.14_50)]" />
          <div className="absolute bottom-0 left-1/2 h-[20px] w-px -translate-x-1/2 bg-[oklch(0.72_0.14_50)]" />
          <div className="absolute left-0 top-1/2 h-px w-[20px] -translate-y-1/2 bg-[oklch(0.72_0.14_50)]" />
          <div className="absolute right-0 top-1/2 h-px w-[20px] -translate-y-1/2 bg-[oklch(0.72_0.14_50)]" />
        </div>
      </motion.div>
    </>
  )
}
