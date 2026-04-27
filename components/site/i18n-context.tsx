"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { flushSync } from "react-dom"
import { LANGUAGES, lookup, type LangCode, type LanguageMeta } from "@/lib/i18n"

// Native View Transitions API :: type-safe accessor. Document.startViewTransition
// is widely shipped on Chromium 111+ and Safari 18; Firefox is still flagged.
// Falls back to a normal state update where unsupported.
type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => unknown
}

type Ctx = {
  lang: LangCode
  meta: LanguageMeta
  setLang: (l: LangCode) => void
  t: (key: string) => string
  languages: LanguageMeta[]
}

const I18nContext = createContext<Ctx | null>(null)

const STORAGE_KEY = "vaish.lang"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en")

  // Hydrate from localStorage once
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null
    if (stored && LANGUAGES.some((l) => l.code === stored)) {
      setLangState(stored)
    }
  }, [])

  // Sync html lang attribute
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang)
    }
  }, [lang])

  const setLang = useCallback((l: LangCode) => {
    // Use the native View Transitions API to crossfade the entire surface
    // when the language switches. Visible effect :: instead of strings
    // popping in place, the old layout fades out and the new one fades
    // in over ~300ms (configurable via ::view-transition-old/new in
    // globals.css). Massive perceived-quality win for ~15 lines of code.
    //
    // flushSync :: required because React 19 batches state updates
    // asynchronously by default. startViewTransition's callback must
    // commit the DOM synchronously so the browser can capture the
    // "after" snapshot, otherwise the transition fires against the
    // stale DOM and looks broken.
    const apply = () => {
      setLangState(l)
      if (typeof window !== "undefined") {
        try { localStorage.setItem(STORAGE_KEY, l) } catch {}
      }
    }
    if (typeof document !== "undefined") {
      const doc = document as ViewTransitionDoc
      if (doc.startViewTransition) {
        doc.startViewTransition(() => flushSync(apply))
        return
      }
    }
    apply()
  }, [])

  const meta = useMemo(
    () => LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0],
    [lang],
  )

  const t = useCallback((key: string) => lookup(lang, key), [lang])

  const value = useMemo<Ctx>(
    () => ({ lang, meta, setLang, t, languages: LANGUAGES }),
    [lang, meta, setLang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const v = useContext(I18nContext)
  if (!v) throw new Error("useI18n must be used inside I18nProvider")
  return v
}

export function useT() {
  return useI18n().t
}
