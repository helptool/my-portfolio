"use client"

import type React from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { useRef } from "react"
import { useFinePointer } from "@/lib/hooks"

type Props = {
  children: React.ReactNode
  strength?: number
  className?: string
}

export function Magnetic({ children, strength = 0.35, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const finePointer = useFinePointer()
  // Hooks have to be called in the same order every render, so the
  // motion-value primitives stay declared. They just don't subscribe to
  // anything when we render the pass-through wrapper below.
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.35 })
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.35 })

  // Touch / coarse pointer :: skip the motion wrapper entirely. There is no
  // mouseMove on touch and the spring would burn one frame's worth of
  // interpolation per render for nothing.
  if (!finePointer) {
    return <div ref={ref} className={className}>{children}</div>
  }

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    x.set((e.clientX - cx) * strength)
    y.set((e.clientY - cy) * strength)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
