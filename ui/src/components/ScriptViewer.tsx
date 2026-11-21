import * as React from "react"
import { Check, Copy } from "lucide-react"
import type { ScriptResponse } from "../types/studio"

export function ScriptViewer({ script }: { script: ScriptResponse }) {
  const [mode, setMode] = React.useState<"tagged" | "clean" | "hamp">("hamp")
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    const content =
      mode === "clean"
        ? script.clean_text
        : mode === "tagged"
          ? script.tagged_text
          : script.markdown_table
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="mvs-script-box mpt-enter">
      <div className="mvs-script-head">
        <div className="mvs-tabs" role="tablist" aria-label="Tampilan naskah">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "hamp"}
            className="mvs-tab"
            onClick={() => setMode("hamp")}
          >
            H-A-M-P
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "tagged"}
            className="mvs-tab"
            onClick={() => setMode("tagged")}
          >
            Vocal Tags
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "clean"}
            className="mvs-tab"
            onClick={() => setMode("clean")}
          >
            Clean
          </button>
        </div>

        <button type="button" className="mvs-copy-btn" onClick={handleCopy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Disalin" : "Salin"}</span>
        </button>
      </div>

      {mode === "hamp" ? (
        <div className="mvs-segments">
          {script.breakdown.map((seg, i) => (
            <div key={`${seg.segment}-${i}`} className="mvs-segment">
              <div className="mvs-seg-top">
                <strong>{seg.segment}</strong>
                <span>{seg.time_range}</span>
              </div>
              <p>{seg.narration}</p>
              <small>Visual: {seg.visual_receipt} · SFX: {seg.sfx}</small>
            </div>
          ))}
        </div>
      ) : (
        <pre className="mvs-pre">
          {mode === "tagged" ? script.tagged_text : script.clean_text}
        </pre>
      )}
    </div>
  )
}
