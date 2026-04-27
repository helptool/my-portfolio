"use client"

import Image, { type ImageProps } from "next/image"
import { useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { SHIMMER } from "@/lib/shimmer"
import { useFinePointer } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/* ---------------------------------------------------------------------------
 * RevealImage :: cursor-driven porthole reveal.
 *
 * Stack
 *   bottom layer :: the visible image (current state)
 *   top layer    :: an "alternate" image (desaturated past, dimmer realm,
 *                   or a wholly different src), masked by a radial-gradient
 *                   centered on the cursor. The mask only reveals a circle
 *                   ~140px around the pointer.
 *
 * Behavior
 *   - On pointer enter, top layer fades in and the mask follows the cursor.
 *   - On pointer leave, top layer fades out.
 *   - Inside the masked area the cursor reads `data-cursor="view"` so the
 *     CustomCursor switches to its viewing chrome (pre-existing behavior).
 *
 * Reduced motion
 *   The reveal layer never mounts; visitor sees a normal image.
 *
 * SEO
 *   Both images render in the DOM at all times so crawlers see both.
 * ------------------------------------------------------------------------- */

type Props = Omit<ImageProps, "placeholder" | "blurDataURL"> & {
  /** Alternate image source revealed inside the cursor porthole. May be the
      same as the base src — in that case revealClassName supplies the
      visual difference (e.g., a CSS filter for a "past memory" look). */
  revealSrc: string
  /** Alt text for the alternate image. Empty string = decorative. */
  revealAlt?: string
  /** Diameter of the porthole in pixels. Default 220. */
  portholeSize?: number
  /** Optional caption shown beside the cursor inside the masked area. */
  revealLabel?: string
  /** ClassName applied to the reveal-layer Image. If omitted, falls back
      to className. Use this to layer CSS filters on the alternate. */
  revealClassName?: string
}

export function RevealImage({
  revealSrc,
  revealAlt = "",
  portholeSize = 220,
  revealLabel,
  revealClassName,
  className,
  alt,
  ...imageProps
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const reduced = useReducedMotion()
  /* Cursor porthole on a desktop pointer is the headline interaction.
     On a touch device the pointermove path obviously can't fire, but
     we don't want the porthole to vanish entirely — the user reported
     "many features missing from mobile". So on touch we still mount
     the reveal layer and bind it to `pointerdown` instead: tap-and-
     hold on the image opens the porthole at the touch point, lifting
     the finger closes it. Same affordance, just gesture-driven. */
  const finePointer = useFinePointer()
  const desktopEnabled = !reduced && finePointer
  const touchEnabled = !reduced && !finePointer
  const enabled = desktopEnabled || touchEnabled

  const writePos = (clientX: number, clientY: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const x = ((clientX - r.left) / r.width) * 100
    const y = ((clientY - r.top) / r.height) * 100
    ref.current!.style.setProperty("--cx", `${x}%`)
    ref.current!.style.setProperty("--cy", `${y}%`)
  }
  const updatePosition = (e: React.PointerEvent<HTMLDivElement>) =>
    writePos(e.clientX, e.clientY)

  return (
    <div
      ref={ref}
      data-cursor={desktopEnabled ? "view" : undefined}
      data-cursor-label={desktopEnabled ? revealLabel || "Untold" : undefined}
      onPointerEnter={desktopEnabled ? () => setActive(true) : undefined}
      /* `onPointerLeave` is wired for both paths. On desktop it closes
         the porthole when the cursor leaves the element. On touch it
         closes the porthole when the finger drags off the element —
         without this, dragging horizontally across realm slides leaves
         the porthole stuck visible because `pointerup` never fires
         inside the element. (We deliberately don't use
         `setPointerCapture` because that would prevent the parent
         carousel from receiving the swipe gesture.) */
      onPointerLeave={enabled ? () => setActive(false) : undefined}
      onPointerMove={desktopEnabled ? updatePosition : undefined}
      onPointerDown={
        touchEnabled
          ? (e) => {
              writePos(e.clientX, e.clientY)
              setActive(true)
            }
          : undefined
      }
      onPointerUp={touchEnabled ? () => setActive(false) : undefined}
      onPointerCancel={touchEnabled ? () => setActive(false) : undefined}
      className={cn("relative overflow-hidden", className)}
      style={
        {
          "--cx": "50%",
          "--cy": "50%",
          "--porthole": `${portholeSize}px`,
          /* Stop the browser from treating the image as a draggable
             element on touch — without this, a tap-hold on iOS triggers
             the system image preview popover and steals the gesture. */
          touchAction: touchEnabled ? "manipulation" : undefined,
          WebkitTouchCallout: touchEnabled ? "none" : undefined,
        } as React.CSSProperties
      }
    >
      {/* Base layer :: the current image. className is destructured out
          of imageProps so we have to forward it explicitly here, otherwise
          callers' `object-cover` (etc.) is dropped on the base layer. */}
      <Image
        {...imageProps}
        alt={alt}
        className={className}
        placeholder="blur"
        blurDataURL={SHIMMER}
      />

      {/* Reveal layer :: the alternate, masked to a soft circle. */}
      {enabled && (
        <div
          aria-hidden={!active}
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
          style={{
            opacity: active ? 1 : 0,
            // The mask is a radial gradient centered on the cursor. Inside
            // the porthole alpha is 1; it ramps to 0 over ~30% of the radius
            // for a soft edge.
            WebkitMaskImage: `radial-gradient(circle var(--porthole) at var(--cx) var(--cy), black 35%, transparent 70%)`,
            maskImage: `radial-gradient(circle var(--porthole) at var(--cx) var(--cy), black 35%, transparent 70%)`,
          }}
        >
          <Image
            src={revealSrc}
            alt={revealAlt}
            fill={imageProps.fill}
            width={imageProps.fill ? undefined : imageProps.width}
            height={imageProps.fill ? undefined : imageProps.height}
            sizes={imageProps.sizes}
            className={revealClassName ?? className}
            placeholder="blur"
            blurDataURL={SHIMMER}
          />
        </div>
      )}

      {/* Cursor-following hint ring :: a thin copper outline traces the
          porthole edge on the active state. Pointer-events:none so it
          never interferes with hover. */}
      {enabled && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            opacity: active ? 1 : 0,
            background: `radial-gradient(circle calc(var(--porthole) * 0.5) at var(--cx) var(--cy), transparent 78%, oklch(0.74 0.15 52 / 0.55) 80%, transparent 84%)`,
          }}
        />
      )}
    </div>
  )
}
