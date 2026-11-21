import * as React from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Layers, Sparkles } from "lucide-react"

import { BrainstormPanel } from "./components/BrainstormPanel"
import { KaraokePlayer } from "./components/KaraokePlayer"
import { MosaicSky, type SkyMixState } from "./components/MosaicSky"
import {
  PixelIcon,
  PixelText,
  StudioMark,
  layoutPixels,
  type MosaicIconName,
} from "./components/PixelFont"
import { ScriptViewer } from "./components/ScriptViewer"
import { StudioHubModal } from "./components/StudioHubModal"
import { AVAILABLE_VOICES, STUDIO_PROMPTS } from "./constants/voices"
import { useStudioPipeline } from "./hooks/useStudioPipeline"
import {
  deleteChatSession,
  deleteHistoryAsset,
  fetchHealth,
  fetchHistory,
  fetchHistoryAssetContent,
  fetchTranscriptWords,
  loadChatSessions,
  loadStudioSettings,
  saveChatSession,
  saveStudioSettings,
} from "./services/api"
import type {
  ChatSession,
  HistoryItem,
  IntentType,
  MosaicAccent,
  StudioSettings,
} from "./types/studio"

const ACCENTS: Record<
  MosaicAccent,
  { a1: string; a2: string; a3: string; glow: string; ink: string; gl: [number, number, number] }
> = {
  ice: { a1: "#e8f6ff", a2: "#a9dcff", a3: "#5fb2f2", glow: "rgba(95,178,242,.42)", ink: "#06233a", gl: [0.55, 0.78, 1.0] },
  ember: { a1: "#fcc8a6", a2: "#f49d70", a3: "#e07a45", glow: "rgba(224,122,69,.42)", ink: "#3a1606", gl: [1.0, 0.62, 0.4] },
  lime: { a1: "#efffc4", a2: "#c4f26a", a3: "#8fcf2e", glow: "rgba(143,207,46,.38)", ink: "#1c2a05", gl: [0.72, 0.95, 0.38] },
}

const MODE_OPTIONS: { id: IntentType; label: string; desc: string; icon: MosaicIconName }[] = [
  { id: "auto", label: "Auto", desc: "Deteksi otomatis dari prompt", icon: "spark" },
  { id: "title", label: "Title", desc: "Riset 3 judul + thumbnail", icon: "chat" },
  { id: "script", label: "Script", desc: "Naskah H-A-M-P terstruktur", icon: "code" },
  { id: "voice_only", label: "Voice", desc: "Sintesis suara 24 kHz WAV", icon: "wave" },
  { id: "transcribe", label: "Transcribe", desc: "WAV ke VTT & JSON karaoke", icon: "eye" },
]

const STEP_LABELS: Record<string, string> = {
  title: "Meriset formula judul viral & konsep thumbnail",
  script: "Menyusun naskah H-A-M-P + vocal tags",
  tts: "Mensintesis audio studio 24 kHz Mono WAV",
  transcribe: "Mengekstrak word-level timestamps & WebVTT",
}

const FEATURES: { icon: MosaicIconName; title: string; body: string }[] = [
  { icon: "spark", title: "Brainstorm Inline", body: "Diskusi formula judul langsung di kartu composer utama lengkap dengan riwayat sesi chat yang tersimpan." },
  { icon: "code", title: "Kerangka H-A-M-P", body: "Naskah dibagi otomatis ke Hook, Agitasi, Mekanisme, dan Payoff lengkap dengan visual receipt dan Auto-Tag." },
  { icon: "wave", title: "31 Suara Studio Gemini", body: "Sintesis 24 kHz Mono WAV dengan 16 inline vocal tags seperti <short pause>, <breath>, dan <emphasis>." },
  { icon: "eye", title: "Karaoke Word-Level", body: "Setiap kata dipetakan presisi dan dikalibrasi terhadap durasi WAV asli dalam format JSON dan WebVTT." },
  { icon: "chat", title: "Studio Hub Terpusat", body: "Kelola History Assets (Audio, Script, Title), History Chat, dan Pengaturan tema dalam satu modal glass." },
  { icon: "rocket", title: "Siap Produksi & Aman", body: "Pipeline SSE non-blocking, nama file unik anti-kolisi, dan perlindungan path traversal pada seluruh endpoint." },
]

const HEADLINE = ["Describe a video", "We'll voice it"]

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  useIsoLayoutEffect(() => {
    if (typeof matchMedia !== "function") return
    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return reduced
}

function createNewChatSession(): ChatSession {
  const now = new Date().toISOString()
  return {
    id: `chat-${Date.now()}`,
    title: "Sesi Brainstorm Baru",
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        role: "assistant",
        content: "Tulis topik video yang lagi lu incar — gua bantu racik opsi judul ber-CTR tinggi.",
      },
    ],
    suggestions: [],
  }
}

export default function App() {
  const reduced = useReducedMotion()
  const [settings, setSettings] = React.useState<StudioSettings>(() => loadStudioSettings())
  const tone = ACCENTS[settings.accent] || ACCENTS.ice

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const headerRef = React.useRef<HTMLElement | null>(null)
  const heroRef = React.useRef<HTMLElement | null>(null)
  const featuresRef = React.useRef<HTMLElement | null>(null)
  const voicesRef = React.useRef<HTMLElement | null>(null)
  const cardRef = React.useRef<HTMLFormElement | null>(null)
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null)

  const modeBtnRef = React.useRef<HTMLButtonElement | null>(null)
  const modeMenuRef = React.useRef<HTMLDivElement | null>(null)
  const voiceBtnRef = React.useRef<HTMLButtonElement | null>(null)
  const voiceMenuRef = React.useRef<HTMLDivElement | null>(null)
  const wavBtnRef = React.useRef<HTMLButtonElement | null>(null)
  const wavMenuRef = React.useRef<HTMLDivElement | null>(null)

  const linksRef = React.useRef<HTMLDivElement | null>(null)
  const pillRef = React.useRef<HTMLSpanElement | null>(null)
  const prevHeight = React.useRef(0)
  const mixRef = React.useRef<SkyMixState>({ a: 0, b: 0, ptr: [0.5, 0.5], ptrOn: 0, dirty: true })

  const {
    phase,
    logs,
    progress,
    plannedSteps,
    completedSteps,
    activeStep,
    result,
    error,
    history,
    health,
    startPipeline,
    stopPipeline,
    resetStudio,
    setResult,
    setPhase,
  } = useStudioPipeline()

  const [prompt, setPrompt] = React.useState("")
  const [intent, setIntent] = React.useState<IntentType>("auto")
  const [voice, setVoice] = React.useState(settings.defaultVoice)
  const [autoTag, setAutoTag] = React.useState(settings.defaultAutoTag)
  const [modeMenuOpen, setModeMenuOpen] = React.useState(false)
  const [voiceMenuOpen, setVoiceMenuOpen] = React.useState(false)
  const [wavMenuOpen, setWavMenuOpen] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  const [focused, setFocused] = React.useState(false)
  const [nudge, setNudge] = React.useState(false)
  const [activeNav, setActiveNav] = React.useState<"home" | "features" | "voices">("home")
  const [voiceTab, setVoiceTab] = React.useState<0 | 1 | 2>(0)
  const [sheet, setSheet] = React.useState(false)

  const [hubOpen, setHubOpen] = React.useState(false)
  const [hubTab, setHubTab] = React.useState<"assets" | "chats" | "settings">("assets")
  const [chatSessions, setChatSessions] = React.useState<ChatSession[]>(() => loadChatSessions())
  const [activeChat, setActiveChat] = React.useState<ChatSession>(() => createNewChatSession())
  const [localAssets, setLocalAssets] = React.useState<HistoryItem[] | null>(null)
  const [localHealth, setLocalHealth] = React.useState(health)
  const [previewDoc, setPreviewDoc] = React.useState<{ title: string; content: string } | null>(null)

  const assets = localAssets ?? history
  const activeHealth = localHealth ?? health
  const activeMode = MODE_OPTIONS.find((m) => m.id === intent) ?? MODE_OPTIONS[0]
  const showAutoTag = intent === "script"
  const showVoice = intent === "auto" || intent === "voice_only"
  const wavHistory = React.useMemo(() => assets.filter((h) => h.type === "audio" && h.name.endsWith(".wav")), [assets])

  const headWidth = React.useMemo(
    () => Math.max(...HEADLINE.map((l) => layoutPixels(l).width + 1)),
    [],
  )

  const go = React.useCallback(
    (where: "home" | "features" | "voices", focusInput?: boolean) => {
      setSheet(false)
      const el =
        where === "home"
          ? rootRef.current
          : where === "features"
            ? featuresRef.current
            : voicesRef.current
      if (!el) return
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY,
        behavior: reduced ? "auto" : "smooth",
      })
      if (focusInput) {
        window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), reduced ? 0 : 600)
      }
    },
    [reduced],
  )

  const refreshAssets = React.useCallback(async () => {
    try {
      const next = await fetchHistory()
      setLocalAssets(next)
    } catch {
      // ignore
    }
  }, [])

  const refreshHealth = React.useCallback(async () => {
    try {
      const next = await fetchHealth(true)
      setLocalHealth(next)
    } catch {
      // ignore
    }
  }, [])

  const handleUpdateSettings = (next: StudioSettings) => {
    setSettings(next)
    saveStudioSettings(next)
    setVoice(next.defaultVoice)
    setAutoTag(next.defaultAutoTag)
  }

  const openBrainstorm = (sessionToOpen?: ChatSession) => {
    if (cardRef.current) prevHeight.current = cardRef.current.offsetHeight
    setPreviewDoc(null)
    if (sessionToOpen) {
      setActiveChat(sessionToOpen)
    } else if (activeChat.messages.length <= 1) {
      setActiveChat(createNewChatSession())
    }
    setPhase("brainstorm")
    go("home")
  }

  const handleUpdateChatSession = (updated: ChatSession) => {
    setActiveChat(updated)
    const nextList = saveChatSession(updated)
    setChatSessions(nextList)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (phase === "brainstorm") return
    const clean = prompt.trim()
    if (!clean) {
      setNudge(true)
      window.setTimeout(() => setNudge(false), 500)
      inputRef.current?.focus()
      return
    }
    setPreviewDoc(null)
    if (cardRef.current) prevHeight.current = cardRef.current.offsetHeight
    void startPipeline({
      intent,
      prompt: clean,
      voice,
      auto_tag: intent === "script" ? autoTag : false,
      auto_proceed: false,
    }).then(() => {
      void refreshAssets()
    })
  }

  const handleRefine = (keepPrompt: boolean) => {
    if (cardRef.current) prevHeight.current = cardRef.current.offsetHeight
    setPreviewDoc(null)
    if (!keepPrompt) setPrompt("")
    resetStudio()
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 40)
  }

  const handleSelectAsset = async (item: HistoryItem) => {
    if (item.type === "audio") {
      if (intent === "transcribe") {
        setPrompt(item.name)
        setPhase("idle")
        return
      }
      if (!item.audio_url) return
      let words = [] as { text: string; startSec: number; endSec: number }[]
      if (item.json_url) {
        try {
          words = await fetchTranscriptWords(item.json_url)
        } catch {
          words = []
        }
      }
      if (cardRef.current) prevHeight.current = cardRef.current.offsetHeight
      setPreviewDoc(null)
      setResult({
        intent: "history",
        execution_time_sec: 0,
        tts_data: {
          filename: item.name,
          audio_url: item.audio_url,
          voice: item.voice || settings.defaultVoice,
          duration_sec: item.duration_sec || 0,
          duration_frames: Math.round((item.duration_sec || 0) * 30),
          file_size_bytes: item.file_size_bytes,
          sample_rate: 24000,
          primary_path: `output/audio/${item.name}`,
        },
        transcribe_data:
          words.length > 0 && item.vtt_url && item.json_url
            ? {
                filename: item.name,
                words,
                vtt_content: "",
                vtt_url: item.vtt_url,
                json_url: item.json_url,
                word_count: words.length,
                duration_sec: item.duration_sec || 0,
              }
            : null,
      })
      setPhase("done")
      go("home")
      return
    }

    try {
      const doc = await fetchHistoryAssetContent(item.type, item.name)
      if (cardRef.current) prevHeight.current = cardRef.current.offsetHeight
      setPreviewDoc({ title: item.title, content: doc.content })
      setResult({ intent: item.type, execution_time_sec: 0 })
      setPhase("done")
      go("home")
    } catch {
      // ignore
    }
  }

  const handleDeleteAsset = async (item: HistoryItem) => {
    await deleteHistoryAsset(item.type, item.name)
    await refreshAssets()
  }

  useIsoLayoutEffect(() => {
    const card = cardRef.current
    if (!card || !prevHeight.current) return
    const from = prevHeight.current
    prevHeight.current = 0
    if (reduced) return
    const kids = card.querySelectorAll(".mpt-enter")
    const tw = gsap.fromTo(
      card,
      { height: from },
      { height: card.offsetHeight, duration: 0.55, ease: "expo.out", clearProps: "height" },
    )
    const tk = gsap.fromTo(
      kids,
      { opacity: 0, y: 12, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.04, ease: "power3.out", clearProps: "filter,transform" },
    )
    return () => {
      tw.kill()
      tk.kill()
    }
  }, [phase, reduced])

  React.useEffect(() => {
    if (reduced) {
      setTyped(STUDIO_PROMPTS[0])
      return
    }
    let i = 0
    let n = 0
    let back = false
    let id = 0
    const tick = () => {
      const full = STUDIO_PROMPTS[i % STUDIO_PROMPTS.length]
      if (!back) {
        n++
        setTyped(full.slice(0, n))
        if (n >= full.length) {
          back = true
          id = window.setTimeout(tick, 2200)
          return
        }
        id = window.setTimeout(tick, 26 + Math.random() * 36)
      } else {
        n = Math.max(0, n - 3)
        setTyped(full.slice(0, n))
        if (n === 0) {
          back = false
          i++
          id = window.setTimeout(tick, 380)
          return
        }
        id = window.setTimeout(tick, 14)
      }
    }
    id = window.setTimeout(tick, 800)
    return () => window.clearTimeout(id)
  }, [reduced])

  React.useEffect(() => {
    if (!modeMenuOpen && !voiceMenuOpen && !wavMenuOpen) return
    const down = (e: PointerEvent) => {
      const target = e.target as Node
      if (modeMenuOpen && !modeMenuRef.current?.contains(target) && !modeBtnRef.current?.contains(target)) {
        setModeMenuOpen(false)
      }
      if (voiceMenuOpen && !voiceMenuRef.current?.contains(target) && !voiceBtnRef.current?.contains(target)) {
        setVoiceMenuOpen(false)
      }
      if (wavMenuOpen && !wavMenuRef.current?.contains(target) && !wavBtnRef.current?.contains(target)) {
        setWavMenuOpen(false)
      }
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModeMenuOpen(false)
        setVoiceMenuOpen(false)
        setWavMenuOpen(false)
      }
    }
    document.addEventListener("pointerdown", down)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("pointerdown", down)
      document.removeEventListener("keydown", key)
    }
  }, [modeMenuOpen, voiceMenuOpen, wavMenuOpen])

  useIsoLayoutEffect(() => {
    const root = rootRef.current
    const hero = heroRef.current
    const featuresEl = featuresRef.current
    const voicesEl = voicesRef.current
    if (!root || !hero || !featuresEl || !voicesEl) return

    gsap.registerPlugin(ScrollTrigger)
    const state = mixRef.current

    const ctx = gsap.context((self) => {
      const q = gsap.utils.selector(root)

      ScrollTrigger.create({
        trigger: featuresEl,
        start: "top 85%",
        end: "top 20%",
        scrub: reduced ? false : 0.6,
        onUpdate: (st) => {
          state.a = st.progress
          state.dirty = true
        },
      })
      ScrollTrigger.create({
        trigger: voicesEl,
        start: "top 85%",
        end: "top 20%",
        scrub: reduced ? false : 0.6,
        onUpdate: (st) => {
          state.b = st.progress
          state.dirty = true
        },
      })

      ScrollTrigger.create({
        trigger: root,
        start: "top+=12 top",
        end: "bottom top",
        toggleClass: { targets: headerRef.current as Element, className: "is-scrolled" },
      })

      const mark = (name: "home" | "features" | "voices", el: Element) =>
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (st) => {
            if (st.isActive) setActiveNav(name)
          },
        })
      mark("home", hero)
      mark("features", featuresEl)
      mark("voices", voicesEl)

      if (!reduced) {
        const heroPx = q(".mpt-hero .mpt-px") as Element[]
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo(
            heroPx,
            {
              x: () => gsap.utils.random(-36, 36),
              y: () => gsap.utils.random(-24, 24),
              scale: () => gsap.utils.random(0, 2.2),
              opacity: 0,
              transformOrigin: "50% 50%",
            },
            { x: 0, y: 0, scale: 1, opacity: 1, duration: 1.4, stagger: { amount: 0.65, from: "random" } },
          )
          .fromTo(
            q(".mpt-composer"),
            { y: 36, opacity: 0, scale: 0.96, filter: "blur(10px)" },
            { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.0, clearProps: "filter,transform" },
            0.45,
          )

        const shimmer = () => {
          const lit = gsap.utils.shuffle(heroPx.slice()).slice(0, 7)
          lit.forEach((el, i) => {
            gsap.delayedCall(i * 0.09, () => el.classList.add("is-lit"))
            gsap.delayedCall(0.9 + i * 0.09, () => el.classList.remove("is-lit"))
          })
          gsap.delayedCall(gsap.utils.random(2.0, 3.4), shimmer)
        }
        gsap.delayedCall(2.0, shimmer)

        const svgs = q(".mpt-h1 .mpt-ptext") as unknown as SVGSVGElement[]
        const pts = svgs.map((svg) =>
          (Array.from(svg.querySelectorAll(".mpt-px")) as SVGRectElement[]).map((el) => ({
            el,
            x: +(el.dataset.x || 0),
            y: +(el.dataset.y || 0),
            off: false,
          })),
        )
        let pending = 0
        let last = { x: -1e4, y: -1e4 }
        const repel = () => {
          pending = 0
          svgs.forEach((svg, si) => {
            const r = svg.getBoundingClientRect()
            const unit = r.width / (svg.viewBox.baseVal.width || 1)
            const ux = (last.x - r.left) / unit - 0.5
            const uy = (last.y - r.top) / unit - 0.5
            pts[si].forEach((p) => {
              const dx = p.x + 0.44 - ux
              const dy = p.y + 0.44 - uy
              const d = Math.hypot(dx, dy)
              if (d < 3.4) {
                const push = (1 - d / 3.4) * 1.4
                p.off = true
                gsap.to(p.el, {
                  attr: { x: p.x + (d ? dx / d : 0) * push, y: p.y + (d ? dy / d : -1) * push },
                  duration: 0.35,
                  ease: "power3.out",
                  overwrite: "auto",
                })
              } else if (p.off) {
                p.off = false
                gsap.to(p.el, {
                  attr: { x: p.x, y: p.y },
                  duration: 0.85,
                  ease: "elastic.out(1,0.45)",
                  overwrite: "auto",
                })
              }
            })
          })
        }
        const h1 = q(".mpt-h1")[0] as HTMLElement | undefined
        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return
          last = { x: e.clientX, y: e.clientY }
          if (!pending) pending = requestAnimationFrame(repel)
        }
        const onLeave = () => {
          last = { x: -1e4, y: -1e4 }
          if (!pending) pending = requestAnimationFrame(repel)
        }
        h1?.addEventListener("pointermove", onMove)
        h1?.addEventListener("pointerleave", onLeave)
        self.add(() => () => {
          cancelAnimationFrame(pending)
          h1?.removeEventListener("pointermove", onMove)
          h1?.removeEventListener("pointerleave", onLeave)
        })
      }
    }, root)

    return () => ctx.revert()
  }, [reduced])

  useIsoLayoutEffect(() => {
    const links = linksRef.current
    const pill = pillRef.current
    if (!links || !pill) return
    const place = () => {
      const a = links.querySelector(`[data-nav="${activeNav}"]`) as HTMLElement | null
      if (!a) {
        pill.style.opacity = "0"
        return
      }
      pill.style.opacity = "1"
      pill.style.width = `${a.offsetWidth}px`
      pill.style.transform = `translateX(${a.offsetLeft}px)`
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(links)
    return () => ro.disconnect()
  }, [activeNav])

  const sheen = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    sheen(e)
    if (reduced || e.pointerType !== "mouse") return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    gsap.to(el, { rotateY: x * 7, rotateX: -y * 7, transformPerspective: 900, duration: 0.5, ease: "power3.out", overwrite: "auto" })
  }

  const untilt = (e: React.PointerEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, { rotateY: 0, rotateX: 0, duration: 0.7, ease: "elastic.out(1,0.6)", overwrite: "auto" })
  }

  const filteredVoices = React.useMemo(() => {
    if (voiceTab === 0) return AVAILABLE_VOICES.filter((v) => v.recommended)
    if (voiceTab === 1) return AVAILABLE_VOICES.filter((v) => v.gender === "Pria").slice(0, 6)
    return AVAILABLE_VOICES.filter((v) => v.gender === "Wanita").slice(0, 6)
  }, [voiceTab])

  const placeholderText =
    intent === "transcribe"
      ? "Masukkan nama file .wav atau pilih dari dropdown WAV di bawah..."
      : intent === "title"
        ? "Tulis topik video untuk dirisetkan 3 judul ber-CTR tinggi..."
        : intent === "script"
          ? "Tulis judul atau topik video untuk disusun jadi naskah H-A-M-P..."
          : intent === "voice_only"
            ? "Tempel naskah final yang siap disuarakan..."
            : typed

  const selectedWavLabel =
    wavHistory.find((w) => w.name === prompt.trim())?.name || "Pilih WAV"

  const latestLog = logs[logs.length - 1]?.message || "Menyiapkan proses..."
  const empty = !prompt.trim()

  const rootStyle = {
    "--mpt-a1": tone.a1,
    "--mpt-a2": tone.a2,
    "--mpt-a3": tone.a3,
    "--mpt-glow": tone.glow,
    "--mpt-ink": tone.ink,
  } as React.CSSProperties

  return (
    <div ref={rootRef} className="mpt-root" style={rootStyle} data-motion={reduced ? "reduced" : "full"}>
      <MosaicSky rootRef={rootRef} mixRef={mixRef} accentGl={tone.gl} reduced={reduced} />

      <header ref={headerRef} className="mpt-header">
        <div className="mpt-bar">
          <button type="button" className="mpt-brand" onClick={() => go("home", true)}>
            <StudioMark className="mpt-mark" />
            <span>Mosaic Voice</span>
          </button>

          <nav className="mpt-links" ref={linksRef} aria-label="Sections">
            <span ref={pillRef} className="mpt-pill" aria-hidden="true" />
            <button type="button" className="mpt-link" data-nav="features" aria-current={activeNav === "features" ? "true" : undefined} onClick={() => go("features")}>
              Features
            </button>
            <button type="button" className="mpt-link" data-nav="voices" aria-current={activeNav === "voices" ? "true" : undefined} onClick={() => go("voices")}>
              Voices
            </button>
          </nav>

          <div className="mpt-nav-actions">
            <button
              type="button"
              className="mpt-cta"
              onClick={() => {
                setHubTab("assets")
                setHubOpen(true)
                void refreshAssets()
              }}
            >
              <Layers size={14} /> Studio Hub ({assets.length})
            </button>
          </div>

          <button
            type="button"
            className="mpt-burger"
            aria-expanded={sheet}
            aria-label={sheet ? "Close menu" : "Open menu"}
            onClick={() => setSheet((s) => !s)}
          >
            <span />
            <span />
          </button>
        </div>

        <div className="mpt-sheet" data-open={sheet ? "true" : "false"}>
          <div className="mpt-sheet-inner">
            <div className="mpt-sheet-panel">
              <button type="button" className="mpt-link" onClick={() => go("features")}>Features</button>
              <button type="button" className="mpt-link" onClick={() => go("voices")}>Voices</button>
              <button
                type="button"
                className="mpt-cta"
                onClick={() => {
                  setSheet(false)
                  setHubTab("assets")
                  setHubOpen(true)
                }}
              >
                Studio Hub ({assets.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section ref={heroRef} className="mpt-hero">
          <h1 className="mpt-h1">
            <span className="mpt-sr">{HEADLINE.join(". ")}</span>
            {HEADLINE.map((line, i) => (
              <PixelText key={i} text={line} maxWidth={headWidth} />
            ))}
          </h1>

          <div className="mpt-composer-wrap">
            <form
              ref={cardRef}
              className="mpt-composer"
              data-phase={phase}
              data-nudge={nudge ? "true" : "false"}
              onSubmit={handleSubmit}
              onPointerMove={sheen}
              aria-label="Voice Studio Composer"
            >
              <span className="mpt-sheen" aria-hidden="true" />

              {phase === "idle" && (
                <>
                  <div className="mpt-field mpt-enter">
                    <label htmlFor="mvs-prompt" className="mpt-sr">
                      Tulis topik video, naskah, atau nama file audio
                    </label>
                    <textarea
                      ref={inputRef}
                      id="mvs-prompt"
                      className="mpt-input"
                      rows={2}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          handleSubmit(e)
                        }
                      }}
                    />
                    {!prompt && (
                      <span className="mpt-ph" aria-hidden="true">
                        {focused && intent === "auto"
                          ? "Tulis ide topik video pendek atau tempel naskah jadi..."
                          : placeholderText}
                        {!focused && intent === "auto" && <i className="mpt-caret" />}
                      </span>
                    )}
                  </div>

                  {error && <div className="mvs-error-banner mpt-enter" role="alert">{error}</div>}

                  <div className="mpt-tools mpt-enter">
                    <div className="mvs-tools-left">
                      <div className="mpt-model-wrap">
                        <button
                          ref={modeBtnRef}
                          type="button"
                          className="mpt-chip mvs-mode-trigger"
                          aria-checked="true"
                          aria-haspopup="menu"
                          aria-expanded={modeMenuOpen}
                          onClick={() => {
                            setVoiceMenuOpen(false)
                            setWavMenuOpen(false)
                            setModeMenuOpen((o) => !o)
                          }}
                        >
                          <PixelIcon name={activeMode.icon} />
                          <span>{activeMode.label}</span>
                          <svg className="mpt-chev" viewBox="0 0 10 6" aria-hidden="true">
                            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {modeMenuOpen && (
                          <div ref={modeMenuRef} className="mpt-menu mvs-mode-menu" role="menu" aria-label="Pilih Mode">
                            {MODE_OPTIONS.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={intent === opt.id}
                                className="mpt-menu-item"
                                onClick={() => {
                                  setIntent(opt.id)
                                  setModeMenuOpen(false)
                                  modeBtnRef.current?.focus()
                                }}
                              >
                                <span className="mvs-menu-label">
                                  <PixelIcon name={opt.icon} />
                                  {opt.label}
                                </span>
                                <small>{opt.desc}</small>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="mpt-chip mvs-brainstorm-chip"
                        onClick={() => openBrainstorm()}
                        title="Diskusi & racik ide judul bersama AI langsung di composer"
                      >
                        <Sparkles size={13} />
                        <span>Brainstorm Ide</span>
                      </button>
                    </div>

                    <div className="mpt-right">
                      {showAutoTag && (
                        <button
                          type="button"
                          className="mpt-chip"
                          aria-checked={autoTag}
                          role="switch"
                          onClick={() => setAutoTag((v) => !v)}
                          title="Sisipkan 16 inline vocal tags Gemini ke dalam naskah"
                        >
                          <span>Auto-Tag</span>
                        </button>
                      )}

                      {intent === "transcribe" && wavHistory.length > 0 && (
                        <div className="mpt-model-wrap">
                          <button
                            ref={wavBtnRef}
                            type="button"
                            className="mpt-model"
                            aria-haspopup="menu"
                            aria-expanded={wavMenuOpen}
                            onClick={() => {
                              setModeMenuOpen(false)
                              setVoiceMenuOpen(false)
                              setWavMenuOpen((o) => !o)
                            }}
                          >
                            <PixelIcon name="wave" />
                            <span className="mvs-wav-label">{selectedWavLabel}</span>
                            <svg className="mpt-chev" viewBox="0 0 10 6" aria-hidden="true">
                              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>

                          {wavMenuOpen && (
                            <div ref={wavMenuRef} className="mpt-menu mvs-wav-menu" role="menu" aria-label="Pilih File WAV">
                              {wavHistory.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={prompt.trim() === item.name}
                                  className="mpt-menu-item"
                                  onClick={() => {
                                    setPrompt(item.name)
                                    setWavMenuOpen(false)
                                    wavBtnRef.current?.focus()
                                  }}
                                >
                                  <span className="mvs-wav-item-name">{item.name}</span>
                                  <small>{item.duration_sec ? `${item.duration_sec}s` : "WAV"}</small>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {showVoice && (
                        <div className="mpt-model-wrap">
                          <button
                            ref={voiceBtnRef}
                            type="button"
                            className="mpt-model"
                            aria-haspopup="menu"
                            aria-expanded={voiceMenuOpen}
                            onClick={() => {
                              setModeMenuOpen(false)
                              setWavMenuOpen(false)
                              setVoiceMenuOpen((o) => !o)
                            }}
                          >
                            <PixelIcon name="bolt" />
                            <span>{voice}</span>
                            <svg className="mpt-chev" viewBox="0 0 10 6" aria-hidden="true">
                              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>

                          {voiceMenuOpen && (
                            <div ref={voiceMenuRef} className="mpt-menu" role="menu" aria-label="Pilih Suara Studio">
                              {AVAILABLE_VOICES.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={voice === v.id}
                                  className="mpt-menu-item"
                                  onClick={() => {
                                    setVoice(v.id)
                                    setVoiceMenuOpen(false)
                                    voiceBtnRef.current?.focus()
                                  }}
                                >
                                  <span>{v.name}</span>
                                  <small>{v.tone}</small>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <button type="submit" className="mpt-send" aria-label="Generate" data-ready={empty ? "false" : "true"}>
                        <PixelIcon name="arrow" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {phase === "brainstorm" && (
                <BrainstormPanel
                  session={activeChat}
                  onUpdateSession={handleUpdateChatSession}
                  onNewSession={() => setActiveChat(createNewChatSession())}
                  onBack={() => handleRefine(true)}
                  onUseTitle={(selected) => {
                    setPrompt(selected)
                    setIntent("script")
                    handleRefine(true)
                  }}
                />
              )}

              {phase === "building" && (
                <div className="mpt-build" role="status" aria-live="polite">
                  <div className="mpt-build-head mpt-enter">
                    <span className="mpt-build-title">
                      Memproses mode {activeMode.label}
                      {showVoice ? ` (${voice})` : ""}
                    </span>
                    <span className="mpt-build-pct">{progress}%</span>
                  </div>
                  <div className="mpt-progress mpt-enter" aria-hidden="true">
                    <span style={{ transform: `scaleX(${Math.max(0.04, progress / 100)})` }} />
                  </div>
                  <ol className="mpt-steps">
                    {plannedSteps.map((stepId) => {
                      const isDone = completedSteps.includes(stepId)
                      const isActive = !isDone && activeStep === stepId
                      return (
                        <li key={stepId} className="mpt-step mpt-enter" data-state={isDone ? "done" : isActive ? "active" : "todo"}>
                          <span className="mpt-step-mark" aria-hidden="true">
                            {isDone ? <PixelIcon name="check" /> : <i />}
                          </span>
                          <span>{STEP_LABELS[stepId] || stepId}</span>
                        </li>
                      )
                    })}
                  </ol>
                  <div className="mpt-build-foot mpt-enter">
                    <span className="mvs-live-msg">{latestLog}</span>
                    <button type="button" className="mpt-ghost" onClick={stopPipeline}>
                      Stop
                    </button>
                  </div>
                </div>
              )}

              {phase === "done" && result && (
                <div className="mpt-done-stack">
                  <div className="mpt-done-head mpt-enter">
                    <div>
                      <span className="mpt-done-kicker">
                        <PixelIcon name="check" /> Studio Output Ready
                        {result.execution_time_sec > 0 ? ` · ${result.execution_time_sec}s` : ""}
                      </span>
                      <p className="mpt-done-title">
                        {previewDoc?.title ||
                          result.script_data?.title ||
                          result.title_data?.recommendations?.[0]?.title ||
                          result.tts_data?.filename ||
                          result.transcribe_data?.filename ||
                          "Hasil Produksi"}
                      </p>
                    </div>
                    <div className="mpt-done-actions">
                      <button type="button" className="mpt-ghost" onClick={() => handleRefine(true)}>
                        Refine prompt
                      </button>
                      <button type="button" className="mpt-solid" onClick={() => handleRefine(false)}>
                        New session
                      </button>
                    </div>
                  </div>

                  {previewDoc && (
                    <pre className="mvs-pre mpt-enter">{previewDoc.content}</pre>
                  )}

                  {result.tts_data ? (
                    <KaraokePlayer tts={result.tts_data} transcribe={result.transcribe_data} />
                  ) : result.transcribe_data ? (
                    <KaraokePlayer
                      tts={{
                        filename: result.transcribe_data.filename,
                        audio_url: `/api/audio/${result.transcribe_data.filename}`,
                        voice: "WAV Audio",
                        duration_sec: result.transcribe_data.duration_sec,
                        duration_frames: Math.round(result.transcribe_data.duration_sec * 30),
                        file_size_bytes: 0,
                        sample_rate: 24000,
                        primary_path: `output/audio/${result.transcribe_data.filename}`,
                      }}
                      transcribe={result.transcribe_data}
                    />
                  ) : null}

                  {result.script_data && <ScriptViewer script={result.script_data} />}

                  {result.title_data && !result.script_data && (
                    <div className="mvs-sugg-list mpt-enter">
                      {result.title_data.recommendations.map((rec, i) => (
                        <button
                          key={`${rec.title}-${i}`}
                          type="button"
                          className="mvs-sugg-card"
                          onClick={() => {
                            setPrompt(rec.title)
                            setIntent("script")
                            handleRefine(true)
                          }}
                        >
                          <div className="mvs-sugg-top">
                            <span>{rec.formula}</span>
                            <small>{rec.char_count} chars</small>
                          </div>
                          <strong>{rec.title}</strong>
                          <p>{rec.why_it_works}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>

            <p className="mpt-hint">
              <span className="mvs-status-dot" data-ok={activeHealth?.gemini_api_configured ? "true" : "false"} />
              <span>
                {activeHealth
                  ? `${activeHealth.detected_model.display_name} · ${activeHealth.voices_count} voices`
                  : "Menunggu backend FastAPI..."}
              </span>
              <span aria-hidden="true">·</span>
              <kbd>Enter</kbd> generate <span aria-hidden="true">/</span> <kbd>Shift</kbd> + <kbd>Enter</kbd> baris baru
            </p>
          </div>

          <button type="button" className="mpt-cue" onClick={() => go("features")} aria-label="Scroll to features">
            <PixelIcon name="down" />
          </button>
        </section>

        <section ref={featuresRef} className="mpt-section mpt-features">
          <div className="mpt-inner">
            <div className="mpt-sec-head">
              <span className="mpt-kicker"><i /> Capabilities</span>
              <h2 className="mpt-h2">
                <span className="mpt-sr">Built to ship</span>
                <PixelText text="Built to ship" className="mpt-sec-title" />
              </h2>
              <p className="mpt-lede">
                Dari ide satu kalimat hingga WAV 24 kHz Mono dan subtitle word-level WebVTT/JSON yang langsung siap masuk timeline Remotion.
              </p>
            </div>

            <ul className="mpt-features-grid">
              {FEATURES.map((f, i) => (
                <li key={f.title} className="mpt-feature mpt-glass" onPointerMove={tilt} onPointerLeave={untilt}>
                  <span className="mpt-feature-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mpt-feature-icon"><PixelIcon name={f.icon} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section ref={voicesRef} className="mpt-section">
          <div className="mpt-inner">
            <div className="mpt-sec-head">
              <span className="mpt-kicker"><i /> Studio Voices</span>
              <h2 className="mpt-h2">
                <span className="mpt-sr">31 Gemini Voices</span>
                <PixelText text="31 Gemini Voices" className="mpt-sec-title" />
              </h2>
              <p className="mpt-lede">
                Pilih karakter suara yang paling pas dengan niche konten lu — klik salah satu kartu untuk langsung mengaktifkannya di composer.
              </p>
              <div className="mpt-cycle" role="group" aria-label="Filter suara" data-tab={voiceTab}>
                <span className="mpt-cycle-pill" aria-hidden="true" />
                <button type="button" aria-pressed={voiceTab === 0} onClick={() => setVoiceTab(0)}>Populer</button>
                <button type="button" aria-pressed={voiceTab === 1} onClick={() => setVoiceTab(1)}>Pria</button>
                <button type="button" aria-pressed={voiceTab === 2} onClick={() => setVoiceTab(2)}>Wanita</button>
              </div>
            </div>

            <ul className="mpt-plans">
              {filteredVoices.map((v) => {
                const isSelected = voice === v.id
                return (
                  <li
                    key={v.id}
                    className="mpt-plan mpt-glass"
                    data-featured={isSelected || v.recommended ? "true" : undefined}
                    onPointerMove={tilt}
                    onPointerLeave={untilt}
                  >
                    <div className="mpt-plan-head">
                      <h3>{v.name}</h3>
                      <span className="mpt-badge">{isSelected ? "Aktif" : v.tone}</span>
                    </div>
                    <p className="mpt-plan-blurb">{v.description}</p>
                    <button
                      type="button"
                      className={isSelected ? "mpt-solid mpt-plan-cta" : "mpt-ghost mpt-plan-cta"}
                      onClick={() => {
                        setVoice(v.id)
                        setIntent("voice_only")
                        go("home", true)
                      }}
                    >
                      {isSelected ? `Terpilih (${v.name})` : `Pakai suara ${v.name}`}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mpt-foot">
        <div className="mpt-inner">
          <div className="mpt-foot-mark" aria-hidden="true">
            <PixelText text="Mosaic Voice" />
          </div>
          <div className="mpt-foot-row">
            <span className="mpt-foot-brand">
              <StudioMark className="mpt-mark-sm" />
              AI Faceless Video Production Engine · v3.0
            </span>
            <span className="mpt-foot-links">
              <button type="button" onClick={() => go("features")}>Features</button>
              <button type="button" onClick={() => go("voices")}>Voices</button>
              <button type="button" onClick={() => go("home", true)}>Back to top</button>
            </span>
          </div>
        </div>
      </footer>

      <StudioHubModal
        open={hubOpen}
        initialTab={hubTab}
        assets={assets}
        chats={chatSessions}
        settings={settings}
        health={activeHealth}
        onClose={() => setHubOpen(false)}
        onSelectAsset={(item) => void handleSelectAsset(item)}
        onDeleteAsset={handleDeleteAsset}
        onRefreshAssets={() => void refreshAssets()}
        onResumeChat={(sess) => openBrainstorm(sess)}
        onDeleteChat={(id) => setChatSessions(deleteChatSession(id))}
        onUpdateSettings={handleUpdateSettings}
        onRefreshHealth={() => void refreshHealth()}
      />
    </div>
  )
}
