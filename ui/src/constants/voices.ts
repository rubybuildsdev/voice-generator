import type { VoiceProfile } from "../types/studio"

export const DEFAULT_VOICE = "Kore"

export const STUDIO_PROMPTS: string[] = [
  "Kenapa GPU bisa melatih AI 100x lebih cepat daripada CPU modern...",
  "Cara kerja enkripsi end-to-end WhatsApp dalam 45 detik tanpa jargon ribet...",
  "Rahasia arsitektur Redis yang bikin jutaan request per detik tetap instan...",
  "Kenapa satelit Starlink tidak jatuh meski mengorbit sangat rendah...",
]

export const AVAILABLE_VOICES: VoiceProfile[] = [
  { id: "Kore", name: "Kore", gender: "Pria", category: "Populer", tone: "Tegas & Edukatif", style: "Authoritative", description: "Suara tegas dan jernih untuk konten edukasi teknologi faceless.", recommended: true },
  { id: "Fola", name: "Fola", gender: "Wanita", category: "Populer", tone: "Jernih & Ramah", style: "Conversational", description: "Artikulasi bersih dan hangat untuk explainer modern.", recommended: true },
  { id: "Puck", name: "Puck", gender: "Pria", category: "Populer", tone: "Energik & Dinamis", style: "Upbeat", description: "Cepat dan penuh energi, pas untuk hook Shorts & TikTok.", recommended: true },
  { id: "Zephyr", name: "Zephyr", gender: "Pria", category: "Populer", tone: "Tenang & Sinematik", style: "Cinematic", description: "Tenang dan dalam untuk storytelling serta dokumenter mini.", recommended: true },
  { id: "Aoede", name: "Aoede", gender: "Wanita", category: "Wanita", tone: "Ekspresif & Naratif", style: "Storyteller", description: "Kaya intonasi untuk narasi yang emosional.", recommended: false },
  { id: "Charon", name: "Charon", gender: "Pria", category: "Pria", tone: "Dalam & Misterius", style: "Deep", description: "Warna suara rendah untuk keamanan siber dan misteri.", recommended: false },
  { id: "Fenrir", name: "Fenrir", gender: "Pria", category: "Pria", tone: "Berat & Intens", style: "Dramatic", description: "Kuat dan intens untuk fakta mengejutkan.", recommended: false },
  { id: "Leda", name: "Leda", gender: "Wanita", category: "Wanita", tone: "Cerah & Optimis", style: "Bright", description: "Ringan dan positif untuk tips produktivitas.", recommended: false },
  { id: "Orus", name: "Orus", gender: "Pria", category: "Pria", tone: "Lugas & Berbobot", style: "Direct", description: "To the point untuk analisis bisnis & teknologi.", recommended: false },
  { id: "Callirrhoe", name: "Callirrhoe", gender: "Wanita", category: "Wanita", tone: "Santai & Luwes", style: "Casual", description: "Natural seperti ngobrol santai dengan penonton.", recommended: false },
  { id: "Autonoe", name: "Autonoe", gender: "Wanita", category: "Wanita", tone: "Cerah & Menarik", style: "Engaging", description: "Menarik perhatian sejak detik pertama.", recommended: false },
  { id: "Enceladus", name: "Enceladus", gender: "Pria", category: "Pria", tone: "Breathy & Intimate", style: "Intimate", description: "Dekat dan personal untuk cerita pendek.", recommended: false },
  { id: "Iapetus", name: "Iapetus", gender: "Pria", category: "Pria", tone: "Jernih & Artikulatif", style: "Clear", description: "Pelafalan presisi untuk istilah teknis.", recommended: false },
  { id: "Umbriel", name: "Umbriel", gender: "Pria", category: "Pria", tone: "Luwes & Netral", style: "Neutral", description: "Serbaguna untuk segala genre konten singkat.", recommended: false },
  { id: "Algieba", name: "Algieba", gender: "Pria", category: "Pria", tone: "Halus & Teratur", style: "Smooth", description: "Ritme stabil dan nyaman didengar lama.", recommended: false },
  { id: "Despina", name: "Despina", gender: "Wanita", category: "Wanita", tone: "Lembut & Melodis", style: "Gentle", description: "Lembut untuk konten edukasi santai.", recommended: false },
  { id: "Erinome", name: "Erinome", gender: "Wanita", category: "Wanita", tone: "Bersih & Lugas", style: "Crisp", description: "Profesional dan jelas untuk tutorial.", recommended: false },
  { id: "Algenib", name: "Algenib", gender: "Pria", category: "Pria", tone: "Serak Berbobot", style: "Gravelly", description: "Karakter khas yang kuat dan mudah diingat.", recommended: false },
  { id: "Rasalgethi", name: "Rasalgethi", gender: "Pria", category: "Pria", tone: "Informatif & Ilmiah", style: "Analytical", description: "Pas untuk penjelasan sains, AI, dan arsitektur.", recommended: false },
  { id: "Laomedeia", name: "Laomedeia", gender: "Wanita", category: "Wanita", tone: "Ceria & Gesit", style: "Lively", description: "Tempo lincah untuk listicle cepat.", recommended: false },
  { id: "Achernar", name: "Achernar", gender: "Pria", category: "Pria", tone: "Lembut & Menyejukkan", style: "Calm", description: "Tenang dan mudah dicerna.", recommended: false },
  { id: "Alnilam", name: "Alnilam", gender: "Pria", category: "Pria", tone: "Pasti & Berwibawa", style: "Confident", description: "Berwibawa untuk opini dan studi kasus.", recommended: false },
  { id: "Schedar", name: "Schedar", gender: "Pria", category: "Pria", tone: "Seimbang & Stabil", style: "Balanced", description: "Seimbang antara formal dan kasual.", recommended: false },
  { id: "Gacrux", name: "Gacrux", gender: "Pria", category: "Pria", tone: "Matang & Berpengalaman", style: "Mature", description: "Kesan mentor senior yang terpercaya.", recommended: false },
  { id: "Pulcherrima", name: "Pulcherrima", gender: "Wanita", category: "Wanita", tone: "Tegas & Berani", style: "Bold", description: "Vokal tegas untuk hook fakta tajam.", recommended: false },
  { id: "Achird", name: "Achird", gender: "Pria", category: "Pria", tone: "Bersahabat & Ramah", style: "Friendly", description: "Akrab dan mudah diterima audiens muda.", recommended: false },
  { id: "Zubenelgenubi", name: "Zubenelgenubi", gender: "Pria", category: "Pria", tone: "Santai & Natural", style: "Relaxed", description: "Gaya kasual seperti podcast pendek.", recommended: false },
  { id: "Vindemiatrix", name: "Vindemiatrix", gender: "Wanita", category: "Wanita", tone: "Lembut & Penuh Perhatian", style: "Warm", description: "Empatik dan menenangkan.", recommended: false },
  { id: "Sadachbia", name: "Sadachbia", gender: "Wanita", category: "Wanita", tone: "Bersemangat & Dinamis", style: "Energetic", description: "Penuh semangat untuk review produk dan fitur.", recommended: false },
  { id: "Sadaltager", name: "Sadaltager", gender: "Pria", category: "Pria", tone: "Berpengetahuan Luas", style: "Knowledgeable", description: "Gaya edukator yang terstruktur.", recommended: false },
  { id: "Sulafat", name: "Sulafat", gender: "Wanita", category: "Wanita", tone: "Hangat & Bersahaja", style: "Approachable", description: "Hangat dan natural untuk konten harian.", recommended: false },
]
