import React from 'react'
import { HistoryItem } from '../types/studio'
import {
  X,
  History,
  Clock,
  Mic,
  Play,
  RotateCcw,
  Trash2,
  ExternalLink,
  Film,
} from 'lucide-react'

interface HistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: HistoryItem[]
  onSelect: (item: HistoryItem) => void
  onDelete?: (id: string) => void
}

export function HistoryDrawer({
  isOpen,
  onClose,
  items,
  onSelect,
  onDelete,
}: HistoryDrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#121216] border-l border-white/10 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#5fb2f2]" />
              <h3 className="font-semibold text-white text-base">Riwayat Produksi Studio</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                {items.length}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of items */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {items.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Belum ada riwayat pembuatan voice-over.</p>
                <p className="text-xs text-white/30 mt-1">
                  Hasil generate akan tersimpan otomatis di sini.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                      {item.title || item.name}
                    </h4>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(item.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 p-1 transition-opacity"
                        title="Hapus riwayat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50 mb-3">
                    {item.voice && (
                      <span className="flex items-center gap-1 text-[#5fb2f2]">
                        <Mic className="w-3 h-3" />
                        {item.voice}
                      </span>
                    )}
                    {item.duration_sec && (
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {item.duration_sec.toFixed(1)}s
                      </span>
                    )}
                    {item.duration_sec && (
                      <span className="flex items-center gap-1 font-mono text-white/40">
                        <Film className="w-3 h-3" />
                        {Math.ceil(item.duration_sec * 30)}f
                      </span>
                    )}
                    <span className="text-white/30">•</span>
                    <span>{item.created_at || 'Hari ini'}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] text-white/40 font-mono">
                      {item.type || 'Voice Over'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(item)
                        onClose()
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#06233a] bg-[#5fb2f2] hover:brightness-110 active:scale-95 transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Muat ke Studio</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
