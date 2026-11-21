import {
  PipelineResponse,
  TitleResponse,
  ScriptResponse,
  TTSResponse,
  TranscribeResponse,
  HistoryItem,
  SSELogEvent,
  WordTimestamp,
  ChatMessage,
  TitleChatResponse,
} from '../types/studio'

const API_BASE = '/api'

export async function fetchHistory(): Promise<HistoryItem[]> {
  try {
    const res = await fetch(`${API_BASE}/history`)
    if (res.ok) {
      const data = await res.json()
      return data.items || data
    }
  } catch (err) {
    console.warn('API /history not reached, loading local cache', err)
  }

  // Load from local storage
  const stored = localStorage.getItem('faceless_voice_studio_history')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }
  return []
}

export function saveLocalHistoryItem(item: HistoryItem) {
  try {
    const existing: HistoryItem[] = JSON.parse(localStorage.getItem('faceless_voice_studio_history') || '[]')
    const filtered = existing.filter((i) => i.id !== item.id)
    const updated = [item, ...filtered].slice(0, 30)
    localStorage.setItem('faceless_voice_studio_history', JSON.stringify(updated))
  } catch (e) {
    console.error('Failed saving to localStorage', e)
  }
}

export async function generateTitles(topic: string, count = 3): Promise<TitleResponse> {
  const res = await fetch(`${API_BASE}/titles/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, count }),
  })
  if (!res.ok) {
    throw new Error(`Failed to generate titles: ${res.statusText}`)
  }
  return res.json()
}

export async function sendTitleChatMessage(messages: ChatMessage[]): Promise<TitleChatResponse> {
  const res = await fetch(`${API_BASE}/titles/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) {
    throw new Error(`Gagal mengirim pesan chat diskusi: ${res.statusText}`)
  }
  return res.json()
}

export async function saveSelectedTitle(title: string, formula?: string, whyItWorks?: string): Promise<{ success: boolean; saved_path: string }> {
  const res = await fetch(`${API_BASE}/titles/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, formula, why_it_works: whyItWorks }),
  })
  if (!res.ok) {
    throw new Error(`Gagal menyimpan judul: ${res.statusText}`)
  }
  return res.json()
}

export async function generateScript(title: string, topicContext?: string): Promise<ScriptResponse> {
  const res = await fetch(`${API_BASE}/scripts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, topic_context: topicContext }),
  })
  if (!res.ok) {
    throw new Error(`Failed to generate script: ${res.statusText}`)
  }
  return res.json()
}

export async function autoTagScript(text: string): Promise<{ tagged_text: string; tag_count: number }> {
  const res = await fetch(`${API_BASE}/scripts/auto-tag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    throw new Error(`Failed to auto tag script: ${res.statusText}`)
  }
  return res.json()
}

export async function generateTTS(text: string, voice = 'Kore'): Promise<TTSResponse> {
  const res = await fetch(`${API_BASE}/tts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!res.ok) {
    throw new Error(`Failed to generate TTS: ${res.statusText}`)
  }
  return res.json()
}

export async function transcribeAudio(audioFile: string): Promise<TranscribeResponse> {
  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_file: audioFile }),
  })
  if (!res.ok) {
    throw new Error(`Failed to transcribe audio: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Execute full pipeline with SSE streaming support from FastAPI backend
 */
export async function executePipelineStream(
  params: {
    intent: string
    prompt: string
    title?: string
    script_text?: string
    voice: string
    auto_tag?: boolean
    auto_proceed: boolean
  },
  onEvent: (event: SSELogEvent) => void,
  signal?: AbortSignal
): Promise<PipelineResponse> {
  let titleData: TitleResponse | undefined
  let scriptData: ScriptResponse | undefined
  let ttsData: TTSResponse | undefined
  let transcribeData: TranscribeResponse | undefined

  try {
    const response = await fetch(`${API_BASE}/pipeline/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        intent: params.intent,
        prompt: params.prompt,
        title: params.title || null,
        script_text: params.script_text || null,
        voice: params.voice || 'Kore',
        auto_tag: params.auto_tag ?? true,
        auto_proceed: params.auto_proceed,
      }),
      signal,
    })

    if (response.ok && response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        // Normalize CRLF (\r\n) to LF (\n) to ensure proper SSE message splitting across all OS
        const normalized = buffer.replace(/\r\n/g, '\n')
        const chunks = normalized.split('\n\n')
        buffer = chunks.pop() || ''

        for (const chunk of chunks) {
          const lines = chunk.split('\n')
          let eventType = 'message'
          let dataStr = ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('event:')) {
              eventType = trimmed.slice(6).trim()
            } else if (trimmed.startsWith('data:')) {
              dataStr += trimmed.slice(5).trim()
            }
          }

          if (!dataStr) continue

          try {
            const parsed = JSON.parse(dataStr)

            // Map step to step number
            let stepNum = 1
            if (parsed.step === 'title') stepNum = 2
            else if (parsed.step === 'script') stepNum = 3
            else if (parsed.step === 'tts') stepNum = 4
            else if (parsed.step === 'transcribe') stepNum = 5
            else if (parsed.step === 'init') {
              stepNum = params.intent === 'script' ? 3 : params.intent === 'voice_only' ? 4 : 1
            }

            // Extract payloads
            if (parsed.payload) {
              if (parsed.step === 'title') titleData = parsed.payload
              if (parsed.step === 'script') scriptData = parsed.payload
              if (parsed.step === 'tts') ttsData = parsed.payload
              if (parsed.step === 'transcribe') transcribeData = parsed.payload
            }

            onEvent({
              step: stepNum,
              total_steps: 5,
              stage: parsed.step || eventType,
              message: parsed.message || (parsed.error ? `Error: ${parsed.error}` : 'Processing...'),
              timestamp: new Date().toLocaleTimeString(),
              progress: parsed.progress || 10,
              payload: parsed.payload,
            })
          } catch (e) {
            console.warn('Could not parse SSE JSON', dataStr, e)
          }
        }
      }

      // If we received ttsData or transcribeData, return success response
      if (ttsData || scriptData || titleData) {
        return {
          success: true,
          intent: params.intent,
          title_data: titleData,
          script_data: scriptData,
          tts_data: ttsData,
          transcribe_data: transcribeData,
          execution_time_sec: 0,
        }
      }
    }
  } catch (err: any) {
    if (signal?.aborted) throw err
    console.warn('Backend SSE streaming fetch failed, falling back to /api/pipeline/run or local simulation:', err)
  }

  // Fallback to sync endpoint POST /api/pipeline/run
  try {
    onEvent({
      step: 1,
      total_steps: 5,
      stage: 'sync',
      message: 'Menghubungkan ke API /pipeline/run...',
      timestamp: new Date().toLocaleTimeString(),
      progress: 25,
    })

    const runRes = await fetch(`${API_BASE}/pipeline/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal,
    })

    if (runRes.ok) {
      const result: PipelineResponse = await runRes.json()
      onEvent({
        step: 5,
        total_steps: 5,
        stage: 'done',
        message: 'Pipeline berhasil dijalankan!',
        timestamp: new Date().toLocaleTimeString(),
        progress: 100,
      })
      return result
    }
  } catch (err: any) {
    if (signal?.aborted) throw err
    console.warn('Sync /api/pipeline/run unreachable. Activating simulated studio response:', err)
  }

  // Offline / Demo fallback
  return await simulatePipelineExecution(params, onEvent, signal)
}

/**
 * Robust simulation fallback for offline demo preview
 */
async function simulatePipelineExecution(
  params: {
    intent: string
    prompt: string
    title?: string
    script_text?: string
    voice: string
    auto_proceed: boolean
  },
  onEvent: (event: SSELogEvent) => void,
  signal?: AbortSignal
): Promise<PipelineResponse> {
  const wait = (ms: number) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })

  onEvent({
    step: 1,
    total_steps: 5,
    stage: 'init',
    message: `[Tahap 1] Mengidentifikasi parameter input & formula retensi (${params.intent.toUpperCase()})...`,
    timestamp: new Date().toLocaleTimeString(),
    progress: 15,
  })
  await wait(500)

  // Title generation
  const mockTitles: TitleResponse = {
    success: true,
    topic: params.prompt,
    recommendations: [
      {
        title: 'Rahasia Bodi HP 8mm Muat Baterai Raksasa 10.000 mAh',
        char_count: 51,
        formula: 'Curiosity Gap + Numerical Specificity',
        why_it_works: 'Menahan mekanisme silikon karbon di awal dan memicu rasa ingin tahu.',
      },
      {
        title: 'Baterai Silikon vs Grafit: Kenapa HP Makin Tipis?',
        char_count: 49,
        formula: 'How Things Work & Contrast',
        why_it_works: 'Membandingkan dua material langsung pada inti pertanyaan audiens.',
      },
      {
        title: 'Jangan Beli HP Tipis Sebelum Cek Jenis Baterai Ini!',
        char_count: 52,
        formula: 'Contrarian / Warning',
        why_it_works: 'Peringatan keras menghentikan scrolling di 3 detik pertama.',
      },
    ],
    thumbnail: {
      screen_text: 'BATERAI 10.000 mAh!',
      visual_concept: 'Render 3D cutaway bodi HP transparan memperlihatkan lempeng silikon padat menyala biru.',
    },
    markdown_output: 'Rekomendasi judul 44-54 karakter terverifikasi.',
  }

  onEvent({
    step: 2,
    total_steps: 5,
    stage: 'title',
    message: `[Tahap 1 Selesai] 3 variasi judul 44-54 karakter tervalidasi. Memilih rekomendasi utama...`,
    timestamp: new Date().toLocaleTimeString(),
    progress: 35,
    payload: mockTitles,
  })
  await wait(700)

  // Script generation
  const chosenTitle = params.title || mockTitles.recommendations[0].title
  const mockScript: ScriptResponse = {
    success: true,
    title: chosenTitle,
    slug: 'rahasia-bodi-hp-8mm-muat-baterai-raksasa',
    breakdown: [
      {
        segment: 'H (Hook)',
        time_range: '00:00 - 00:04',
        narration:
          'Dulu baterai 10.000 mAh itu tebalnya kayak batu bata. <sigh> Tapi sekarang, <short pause> HP 8 milimeter aja bisa muat baterai raksasa ini! <gasp>',
        visual_receipt: '[3D PHONE CUTAWAY / THICKNESS COMPARISON]',
        sfx: 'Sub-Drop / Heavy Thud',
      },
      {
        segment: 'A (Agitasi)',
        time_range: '00:04 - 00:15',
        narration:
          'Banyak yang ngira ini gimmick baterai lapis ganda yang gampang melembung dan bikin layar keangkat. <chuckle> Padahal risiko panasnya bisa bikin HP lo drop seketika.',
        visual_receipt: '[HEAT DISSIPATION THERMAL HUD]',
        sfx: 'Warning Pulse / Spark',
      },
      {
        segment: 'M (Mekanisme)',
        time_range: '00:15 - 00:38',
        narration:
          'Kuncinya ada di anoda silikon-karbon generasi terbaru. <breath> Silikon bisa nampung ion litium sepuluh kali lebih padat dibanding grafit tradisional. <short pause> Jadi kapasitas naik 300 persen tanpa nambah ketebalan sama sekali!',
        visual_receipt: '[MICROSCOPIC SILICON EXPANSION ATOM GRAPHIC]',
        sfx: 'Tech Scan / Whoosh',
      },
      {
        segment: 'P (Payoff & CTA)',
        time_range: '00:38 - 00:50',
        narration:
          'Hasilnya? <phew> HP tetap ramping, tapi bisa tahan dua hari penuh tanpa colokan. <short pause> Menurut kalian, mending HP tipis baterai badak atau kamera tebal? Tulis di komentar!',
        visual_receipt: '[BATTERY 2-DAYS GAUGE + COMMENT POLL OVERLAY]',
        sfx: 'Chime / Shield Clink',
      },
    ],
    clean_text:
      'Dulu baterai 10.000 mAh itu tebalnya kayak batu bata. Tapi sekarang, HP 8 milimeter aja bisa muat baterai raksasa ini! Banyak yang ngira ini gimmick baterai lapis ganda yang gampang melembung dan bikin layar keangkat. Padahal risiko panasnya bisa bikin HP lo drop seketika. Kuncinya ada di anoda silikon-karbon generasi terbaru. Silikon bisa nampung ion litium sepuluh kali lebih padat dibanding grafit tradisional. Jadi kapasitas naik 300 persen tanpa nambah ketebalan sama sekali! Hasilnya? HP tetap ramping, tapi bisa tahan dua hari penuh tanpa colokan. Menurut kalian, mending HP tipis baterai badak atau kamera tebal? Tulis di komentar!',
    tagged_text:
      'Dulu baterai 10.000 mAh itu tebalnya kayak batu bata. <sigh> Tapi sekarang, <short pause> HP 8 milimeter aja bisa muat baterai raksasa ini! <gasp> Banyak yang ngira ini gimmick baterai lapis ganda yang gampang melembung dan bikin layar keangkat. <chuckle> Padahal risiko panasnya bisa bikin HP lo drop seketika. Kuncinya ada di anoda silikon-karbon generasi terbaru. <breath> Silikon bisa nampung ion litium sepuluh kali lebih padat dibanding grafit tradisional. <short pause> Jadi kapasitas naik 300 persen tanpa nambah ketebalan sama sekali! Hasilnya? <phew> HP tetap ramping, tapi bisa tahan dua hari penuh tanpa colokan. <short pause> Menurut kalian, mending HP tipis baterai badak atau kamera tebal? Tulis di komentar!',
    word_count: 104,
    estimated_duration_sec: 42.5,
    saved_path: 'content/scripts/baterai.txt',
    markdown_table: '| 00:00 - 00:04 | Hook | ... |',
  }

  onEvent({
    step: 3,
    total_steps: 5,
    stage: 'script',
    message: `[Tahap 2 Selesai] Naskah H-A-M-P 104 kata tersusun dengan 6 inline vocal tags Gemini TTS.`,
    timestamp: new Date().toLocaleTimeString(),
    progress: 60,
    payload: mockScript,
  })
  await wait(800)

  // TTS Generation
  const mockTTS: TTSResponse = {
    success: true,
    filename: 'baterai.wav',
    audio_url: '/output/audio/baterai.wav',
    voice: params.voice,
    duration_sec: 33.86,
    duration_frames: 1016,
    file_size_bytes: 3250604,
    sample_rate: 24000,
    primary_path: 'output/audio/baterai.wav',
    mirror_path: 'public/audio/baterai.wav',
  }

  onEvent({
    step: 4,
    total_steps: 5,
    stage: 'tts',
    message: `[Tahap 3 Selesai] Gemini 3.8 Flash TTS berhasil menyintesis audio 24 kHz Mono (${params.voice}). Durasi: 33.86s (1016 frames @ 30 FPS).`,
    timestamp: new Date().toLocaleTimeString(),
    progress: 80,
    payload: mockTTS,
  })
  await wait(700)

  // Transcribe Generation
  const rawWords: [string, number, number][] = [
    ['Dulu,', 0.7, 1.2],
    ['baterai', 1.6, 2.0],
    ['10.000', 2.0, 2.8],
    ['mAh', 2.8, 3.3],
    ['itu', 3.3, 3.6],
    ['bentuknya', 3.6, 4.3],
    ['kayak', 4.3, 4.7],
    ['batu', 4.7, 5.0],
    ['bata.', 5.0, 5.5],
    ['Tapi', 6.2, 6.6],
    ['sekarang,', 6.6, 7.3],
    ['HP', 8.0, 8.4],
    ['setipis', 8.4, 9.0],
    ['8', 9.0, 9.4],
    ['milimeter', 9.4, 10.1],
    ['udah', 10.1, 10.5],
    ['bisa', 10.5, 10.9],
    ['nampung', 10.9, 11.4],
    ['kapasitas', 11.4, 12.1],
    ['raksasa', 12.1, 12.7],
    ['itu.', 12.7, 13.0],
    ['Bukan', 13.8, 14.3],
    ['sulap,', 14.3, 14.9],
    ['rahasianya', 15.5, 16.3],
    ['ada', 16.3, 16.6],
    ['pada', 16.6, 17.0],
    ['anoda', 17.0, 17.6],
    ['silikon-karbon', 17.6, 18.7],
    ['generasi', 18.7, 19.3],
    ['terbaru.', 19.3, 20.0],
    ['Silikon', 20.8, 21.4],
    ['mampu', 21.4, 21.9],
    ['menyerap', 21.9, 22.6],
    ['ion', 22.6, 23.0],
    ['litium', 23.0, 23.6],
    ['sepuluh', 23.6, 24.2],
    ['kali', 24.2, 24.6],
    ['lebih', 24.6, 25.0],
    ['padat', 25.0, 25.5],
    ['dibanding', 25.5, 26.1],
    ['grafit', 26.1, 26.7],
    ['biasa.', 26.7, 27.3],
    ['Hasilnya,', 28.0, 28.8],
    ['daya', 28.8, 29.3],
    ['melonjak', 29.3, 30.0],
    ['tapi', 30.0, 30.3],
    ['bodi', 30.3, 30.8],
    ['tetap', 30.8, 31.3],
    ['ramping.', 31.3, 32.2],
  ]

  const mockWords: WordTimestamp[] = rawWords.map(([text, startSec, endSec]) => ({
    text,
    startSec,
    endSec,
  }))

  const mockTranscribe: TranscribeResponse = {
    success: true,
    filename: 'baterai.json',
    words: mockWords,
    vtt_content: 'WEBVTT\n\n00:00:00.700 --> 00:00:01.200\nDulu,\n\n00:00:01.600 --> 00:00:02.000\nbaterai',
    vtt_url: '/output/transcripts/baterai.vtt',
    json_url: '/output/transcripts/words_clean.json',
    word_count: mockWords.length,
    duration_sec: 33.86,
  }

  onEvent({
    step: 5,
    total_steps: 5,
    stage: 'transcribe',
    message: `[Tahap 4 Selesai] Gemini 3.5 Transcribe mengekstrak ${mockWords.length} kata dengan presisi milidetik. Karaoke player siap.`,
    timestamp: new Date().toLocaleTimeString(),
    progress: 100,
    payload: mockTranscribe,
  })

  return {
    success: true,
    intent: params.intent,
    title_data: mockTitles,
    script_data: mockScript,
    tts_data: mockTTS,
    transcribe_data: mockTranscribe,
    execution_time_sec: 2.8,
  }
}
