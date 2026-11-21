import { Clock, Download, FileAudio, X } from "lucide-react"
import type { HistoryItem } from "../types/studio"

export function HistoryDrawer({
  open,
  items,
  onClose,
  onSelect,
}: {
  open: boolean
  items: HistoryItem[]
  onClose: () => void
  onSelect: (item: HistoryItem) => void
}) {
  if (!open) return null

  return (
    <div className="mvs-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Riwayat Produksi">
      <aside className="mvs-drawer mpt-glass" onClick={(e) => e.stopPropagation()}>
        <div className="mvs-drawer-head">
          <div>
            <h3>Riwayat Studio</h3>
            <p>{items.length} aset audio tersimpan</p>
          </div>
          <button type="button" className="mvs-icon-btn" onClick={onClose} aria-label="Tutup riwayat">
            <X size={18} />
          </button>
        </div>

        <div className="mvs-drawer-list">
          {items.length === 0 ? (
            <p className="mvs-empty">Belum ada aset yang dihasilkan. Mulai dari composer di layar utama.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="mvs-hist-item">
                <button
                  type="button"
                  className="mvs-hist-main"
                  onClick={() => {
                    onSelect(item)
                    onClose()
                  }}
                >
                  <span className="mvs-hist-icon">
                    <FileAudio size={16} />
                  </span>
                  <div className="mvs-hist-copy">
                    <strong>{item.title}</strong>
                    <small>
                      <Clock size={11} /> {item.duration_sec ? `${item.duration_sec}s` : "-"} ·{" "}
                      {item.voice || "Studio"} · {item.has_transcript ? "VTT + JSON" : "Audio"}
                    </small>
                  </div>
                </button>
                {item.audio_url && (
                  <a
                    href={item.audio_url}
                    download={item.name}
                    className="mvs-icon-btn"
                    aria-label={`Unduh ${item.name}`}
                  >
                    <Download size={14} />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
