"use client"

import { motion, useScroll, useSpring, useTransform } from "framer-motion"

export function ScrollArc() {
  const { scrollYProgress } = useScroll()
  const scale = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const pct = useTransform(scrollYProgress, (v) => Math.round(v * 100))

  return (
    <>
      <motion.div
        aria-hidden
        style={{ scaleX: scale }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-px origin-left bg-primary"
      />
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] hidden items-center gap-2 font-hud text-muted-foreground md:flex md:bottom-6 md:right-6">
        <span className="h-[6px] w-[6px] rounded-full bg-primary animate-pulse-soft" />
        <motion.span className="tabular-nums text-foreground/70">{pct}</motion.span>
        <span>%</span>
      </div>
    </>
  )
}
