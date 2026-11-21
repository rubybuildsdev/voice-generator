import * as React from "react"
import {
  Clock,
  Download,
  FileAudio,
  FileText,
  FolderOpen,
  MessageSquare,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { AVAILABLE_VOICES } from "../constants/voices"
import type {
  ChatSession,
  HealthResponse,
  HistoryItem,
  MosaicAccent,
  StudioSettings,
} from "../types/studio"

type HubTab = "assets" | "chats" | "settings"
type AssetFilter = "all" | "audio" | "script" | "title"

const ACCENT_OPTIONS: { id: MosaicAccent; label: string; color: string }[] = [
  { id: "ice", label: "Ice", color: "#5fb2f2" },
  { id: "ember", label: "Ember", color: "#e07a45" },
  { id: "lime", label: "Lime", color: "#8fcf2e" },
]

export function StudioHubModal({
  open,
  initialTab = "assets",
  assets,
  chats,
  settings,
  health,
  onClose,
  onSelectAsset,
  onDeleteAsset,
  onRefreshAssets,
  onResumeChat,
  onDeleteChat,
  onUpdateSettings,
  onRefreshHealth,
}: {
  open: boolean
  initialTab?: HubTab
  assets: HistoryItem[]
  chats: ChatSession[]
  settings: StudioSettings
  health: HealthResponse | null
  onClose: () => void
  onSelectAsset: (item: HistoryItem) => void
  onDeleteAsset: (item: HistoryItem) => Promise<void>
  onRefreshAssets: () => void
  onResumeChat: (session: ChatSession) => void
  onDeleteChat: (sessionId: string) => void
  onUpdateSettings: (next: StudioSettings) => void
  onRefreshHealth: () => void
}) {
  const [tab, setTab] = React.useState<HubTab>(initialTab)
  const [assetFilter, setAssetFilter] = React.useState<AssetFilter>("all")
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [voiceMenuOpen, setVoiceMenuOpen] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setTab(initialTab)
      setConfirmDeleteId(null)
    }
  }, [open, initialTab])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const filteredAssets =
    assetFilter === "all" ? assets : assets.filter((a) => a.type === assetFilter)

  const handleConfirmDelete = async (item: HistoryItem) => {
    setDeletingId(item.id)
    try {
      await onDeleteAsset(item)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div
      className="mvs-hub-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Studio Hub"
    >
      <section className="mvs-hub-modal mpt-glass" onClick={(e) => e.stopPropagation()}>
        <div className="mvs-hub-head">
          <div className="mvs-tabs" role="tablist" aria-label="Menu Studio Hub">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "assets"}
              className="mvs-tab"
              onClick={() => setTab("assets")}
            >
              <FolderOpen size={13} /> History Assets ({assets.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "chats"}
              className="mvs-tab"
              onClick={() => setTab("chats")}
            >
              <MessageSquare size={13} /> History Chat ({chats.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "settings"}
              className="mvs-tab"
              onClick={() => setTab("settings")}
            >
              <Settings size={13} /> Pengaturan
            </button>
          </div>

          <button type="button" className="mvs-icon-btn" onClick={onClose} aria-label="Tutup Studio Hub">
            <X size={18} />
          </button>
        </div>

        <div className="mvs-hub-body">
          {tab === "assets" && (
            <div className="mvs-hub-pane">
              <div className="mvs-pane-toolbar">
                <div className="mvs-filter-pills">
                  {(["all", "audio", "script", "title"] as AssetFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className="mpt-chip"
                      aria-checked={assetFilter === f}
                      onClick={() => setAssetFilter(f)}
                    >
                      <span>{f === "all" ? "Semua" : f === "audio" ? "Audio WAV" : f === "script" ? "Script" : "Title"}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="mvs-icon-btn" onClick={onRefreshAssets} title="Muat ulang daftar aset">
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="mvs-hub-list">
                {filteredAssets.length === 0 ? (
                  <p className="mvs-empty">Belum ada aset tersimpan di kategori ini.</p>
                ) : (
                  filteredAssets.map((item) => (
                    <div key={item.id} className="mvs-hist-item">
                      <button
                        type="button"
                        className="mvs-hist-main"
                        onClick={() => {
                          onSelectAsset(item)
                          onClose()
                        }}
                      >
                        <span className="mvs-hist-icon">
                          {item.type === "audio" ? (
                            <FileAudio size={16} />
                          ) : item.type === "script" ? (
                            <FileText size={16} />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </span>
                        <div className="mvs-hist-copy">
                          <strong>{item.title}</strong>
                          <small>
                            <span className="mvs-type-badge">{item.type.toUpperCase()}</span>
                            <Clock size={11} />
                            {item.type === "audio" && item.duration_sec
                              ? `${item.duration_sec}s`
                              : `${Math.max(1, Math.round(item.file_size_bytes / 1024))} KB`}
                            {item.has_transcript ? " · VTT + JSON" : ""}
                          </small>
                        </div>
                      </button>

                      {item.audio_url && (
                        <a
                          href={item.audio_url}
                          download={item.name}
                          className="mvs-icon-btn"
                          aria-label={`Unduh ${item.name}`}
                          title="Unduh WAV"
                        >
                          <Download size={14} />
                        </a>
                      )}

                      {confirmDeleteId === item.id ? (
                        <div className="mvs-confirm-del">
                          <button
                            type="button"
                            className="mvs-del-yes"
                            disabled={deletingId === item.id}
                            onClick={() => void handleConfirmDelete(item)}
                          >
                            {deletingId === item.id ? "..." : "Yakin?"}
                          </button>
                          <button
                            type="button"
                            className="mvs-del-no"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="mvs-icon-btn"
                          onClick={() => setConfirmDeleteId(item.id)}
                          aria-label={`Hapus ${item.name}`}
                          title="Hapus file"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "chats" && (
            <div className="mvs-hub-list">
              {chats.length === 0 ? (
                <p className="mvs-empty">
                  Belum ada riwayat chat. Klik <strong>Brainstorm Ide</strong> di composer utama untuk mulai diskusi judul.
                </p>
              ) : (
                chats.map((c) => (
                  <div key={c.id} className="mvs-hist-item">
                    <button
                      type="button"
                      className="mvs-hist-main"
                      onClick={() => {
                        onResumeChat(c)
                        onClose()
                      }}
                    >
                      <span className="mvs-hist-icon">
                        <MessageSquare size={16} />
                      </span>
                      <div className="mvs-hist-copy">
                        <strong>{c.title}</strong>
                        <small>
                          {c.messages.length} pesan · {c.suggestions.length} saran judul ·{" "}
                          {new Date(c.updatedAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="mvs-icon-btn"
                      onClick={() => onDeleteChat(c.id)}
                      aria-label={`Hapus sesi ${c.title}`}
                      title="Hapus riwayat chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "settings" && (
            <div className="mvs-settings-grid">
              <div className="mvs-setting-card">
                <div>
                  <strong>Tema Aksen Studio</strong>
                  <p>Mengubah warna sorotan tombol, WebGL sky, dan highlight karaoke.</p>
                </div>
                <div className="mvs-accent-swatches">
                  {ACCENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="mpt-chip"
                      aria-checked={settings.accent === opt.id}
                      onClick={() => onUpdateSettings({ ...settings, accent: opt.id })}
                    >
                      <span className="mvs-swatch-dot" style={{ background: opt.color }} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mvs-setting-card">
                <div>
                  <strong>Default Voice Studio</strong>
                  <p>Suara awal yang otomatis terpilih saat studio dibuka.</p>
                </div>
                <div className="mpt-model-wrap">
                  <button
                    type="button"
                    className="mpt-chip"
                    onClick={() => setVoiceMenuOpen((o) => !o)}
                  >
                    <span>{settings.defaultVoice}</span>
                  </button>
                  {voiceMenuOpen && (
                    <div className="mpt-menu mvs-settings-voice-menu" role="menu">
                      {AVAILABLE_VOICES.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={settings.defaultVoice === v.id}
                          className="mpt-menu-item"
                          onClick={() => {
                            onUpdateSettings({ ...settings, defaultVoice: v.id })
                            setVoiceMenuOpen(false)
                          }}
                        >
                          <span>{v.name}</span>
                          <small>{v.tone}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mvs-setting-card mvs-setting-row">
                <div>
                  <strong>Auto-Tag Default (Mode Script)</strong>
                  <p>Sisipkan 16 inline vocal tags Gemini otomatis saat menyusun naskah.</p>
                </div>
                <button
                  type="button"
                  className="mpt-chip"
                  role="switch"
                  aria-checked={settings.defaultAutoTag}
                  onClick={() =>
                    onUpdateSettings({ ...settings, defaultAutoTag: !settings.defaultAutoTag })
                  }
                >
                  <span>{settings.defaultAutoTag ? "Aktif" : "Nonaktif"}</span>
                </button>
              </div>

              <div className="mvs-setting-card">
                <div className="mvs-setting-row" style={{ width: "100%" }}>
                  <div>
                    <strong>Status Backend & Model Aktif</strong>
                    <p>
                      {health
                        ? `Text: ${health.detected_model.text_model} · TTS: ${health.detected_model.tts_model}`
                        : "Belum terhubung ke server FastAPI"}
                    </p>
                  </div>
                  <button type="button" className="mpt-ghost mvs-sm-btn" onClick={onRefreshHealth}>
                    <RefreshCw size={13} /> Cek Ulang
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
