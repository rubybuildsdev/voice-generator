import os
from pathlib import Path
from dotenv import load_dotenv

# Define root paths
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from workspace root
ENV_FILE = BASE_DIR / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
else:
    load_dotenv()

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# App directories
CONTENT_DIR = BASE_DIR / "content"
CONTENT_TITLES_DIR = CONTENT_DIR / "titles"
CONTENT_SCRIPTS_DIR = CONTENT_DIR / "scripts"

OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_AUDIO_DIR = OUTPUT_DIR / "audio"
OUTPUT_TRANSCRIPTS_DIR = OUTPUT_DIR / "transcripts"

DOCS_DIR = BASE_DIR / "docs"

# Ensure all vital directories exist
for directory in [
    CONTENT_TITLES_DIR,
    CONTENT_SCRIPTS_DIR,
    OUTPUT_AUDIO_DIR,
    OUTPUT_TRANSCRIPTS_DIR,
    DOCS_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)

# AI Models configuration
TEXT_MODEL = "gemini-3.5-flash-lite"
TEXT_MODEL_FALLBACK = "gemini-4-hydrogen"
TTS_MODEL = "gemini-3.8-flash-tts"
TRANSCRIBE_MODEL = "gemini-3.5-transcribe"

# Supported Gemini Voice Profiles (All 30+ Official Studio Voices)
AVAILABLE_VOICES = [
    {
        "id": "Kore",
        "name": "Kore",
        "gender": "Pria",
        "category": "Populer",
        "tone": "Tegas & Edukatif",
        "style": "energetic, natural tech educator, conversational style",
        "description": "Suara lugas, authoritative, dan terpercaya. Karakter terbaik untuk video edukasi faceless.",
        "recommended": True
    },
    {
        "id": "Fola",
        "name": "Fola",
        "gender": "Wanita",
        "category": "Populer",
        "tone": "Jernih & Ramah",
        "style": "warm, friendly, clear and articulate, welcoming educator",
        "description": "Suara hangat, jernih, dan bersahabat. Cocok untuk topik literasi digital, tips produktivitas, dan tutorial.",
        "recommended": False
    },
    {
        "id": "Puck",
        "name": "Puck",
        "gender": "Pria",
        "category": "Populer",
        "tone": "Energik & Dinamis",
        "style": "young, dynamic, snappy pacing, fast-paced shorts creator",
        "description": "Artikulasi cepat, punchy, dan penuh energi. Terbaik untuk hook dramatis 3 detik dan shorts bertempo cepat.",
        "recommended": False
    },
    {
        "id": "Zephyr",
        "name": "Zephyr",
        "gender": "Pria",
        "category": "Populer",
        "tone": "Tenang & Sinematik",
        "style": "smooth, calm, cinematic storytelling, warm pacing",
        "description": "Intonasi santai, halus, dan reflektif. Mengalir santai seperti mengobrol di cafe.",
        "recommended": False
    },
    {
        "id": "Aoede",
        "name": "Aoede",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Ekspresif & Naratif",
        "style": "expressive, engaging, lively storytelling",
        "description": "Elegan, kaya ekspresi vokal dan intonasi. Sangat cocok untuk storytelling dan essay video.",
        "recommended": False
    },
    {
        "id": "Charon",
        "name": "Charon",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Dalam & Misterius",
        "style": "deep, reflective, atmospheric, documentary style",
        "description": "Bass berat ala dokumenter. Cocok untuk topik misteri teknologi, deep dive, atau dark tech.",
        "recommended": False
    },
    {
        "id": "Fenrir",
        "name": "Fenrir",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Berat & Intens",
        "style": "deep, serious, impactful, investigative tone",
        "description": "Vokal tebal berbobot. Memberikan kesan urgency, investigasi scam, atau peringatan darurat.",
        "recommended": False
    },
    {
        "id": "Leda",
        "name": "Leda",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Cerah & Optimis",
        "style": "bright, curious, upbeat, innovative tone",
        "description": "Suara ceria dan antusias, membangkitkan rasa penasaran penonton terhadap inovasi masa depan.",
        "recommended": False
    },
    {
        "id": "Orus",
        "name": "Orus",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Lugas & Berbobot",
        "style": "steady, articulate, news anchor style",
        "description": "Gaya presenter berita teknologi formal namun tetap luwes didengar di media sosial.",
        "recommended": False
    },
    {
        "id": "Callirrhoe",
        "name": "Callirrhoe",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Santai & Luwes",
        "style": "easy-going, relaxed, approachable conversational tone",
        "description": "Artikulasi lembut dan natural, cocok untuk konten lifestyle dan tips santai.",
        "recommended": False
    },
    {
        "id": "Autonoe",
        "name": "Autonoe",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Cerah & Menarik",
        "style": "bright, lively, crisp educational narration",
        "description": "Suara cerah dan renyah, sangat menarik perhatian sejak detik pertama.",
        "recommended": False
    },
    {
        "id": "Enceladus",
        "name": "Enceladus",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Breathy & Intimate",
        "style": "breathy, soft, atmospheric narration",
        "description": "Intonasi bernafas lembut dan mendalam, cocok untuk narasi misteri atau filosofis.",
        "recommended": False
    },
    {
        "id": "Iapetus",
        "name": "Iapetus",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Jernih & Artikulatif",
        "style": "clear, well-enunciated, technical explainer",
        "description": "Pengucapan sangat jernih dan terstruktur, ideal untuk bedah kode atau spesifikasi hardware.",
        "recommended": False
    },
    {
        "id": "Umbriel",
        "name": "Umbriel",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Luwes & Netral",
        "style": "easy-going, steady, balanced narrative style",
        "description": "Gaya tutur santai yang tidak monoton, cocok untuk video durasi menengah.",
        "recommended": False
    },
    {
        "id": "Algieba",
        "name": "Algieba",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Halus & Teratur",
        "style": "smooth, calm, measured professional pace",
        "description": "Suara lembut dengan tempo teratur, sangat nyaman didengar berulang kali.",
        "recommended": False
    },
    {
        "id": "Despina",
        "name": "Despina",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Lembut & Melodis",
        "style": "smooth, soothing, clear and melodic voice",
        "description": "Vokal wanita yang menenangkan, cocok untuk tutorial pengantar atau meditasi teknologi.",
        "recommended": False
    },
    {
        "id": "Erinome",
        "name": "Erinome",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Bersih & Lugas",
        "style": "clear, direct, modern professional narrator",
        "description": "Suara wanita modern yang to-the-point, sangat cocok untuk format short-form reels.",
        "recommended": False
    },
    {
        "id": "Algenib",
        "name": "Algenib",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Serak Berbobot",
        "style": "gravelly, textured, distinct dramatic character",
        "description": "Karakter vokal serak yang khas, memberikan nuansa sinematik teater yang kuat.",
        "recommended": False
    },
    {
        "id": "Rasalgethi",
        "name": "Rasalgethi",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Informatif & Ilmiah",
        "style": "informative, scholarly, articulate science speaker",
        "description": "Pembawaan akademis yang mudah dipahami, terbaik untuk topik sains dan AI mendalam.",
        "recommended": False
    },
    {
        "id": "Laomedeia",
        "name": "Laomedeia",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Ceria & Gesit",
        "style": "upbeat, brisk, enthusiastic voice",
        "description": "Tempo lincah dan antusias, bagus untuk rangkuman berita teknologi harian.",
        "recommended": False
    },
    {
        "id": "Achernar",
        "name": "Achernar",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Lembut & Menyejukkan",
        "style": "soft, serene, contemplative storytelling",
        "description": "Intonasi tenang berbisik yang cocok untuk cerita latar belakang atau renungan.",
        "recommended": False
    },
    {
        "id": "Alnilam",
        "name": "Alnilam",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Pasti & Berwibawa",
        "style": "firm, confident, decisive executive narration",
        "description": "Kesan kepemimpinan dan ketegasan, sangat pas untuk konten bisnis teknologi.",
        "recommended": False
    },
    {
        "id": "Schedar",
        "name": "Schedar",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Seimbang & Stabil",
        "style": "even, stable, neutral and consistent",
        "description": "Ritme bicara konsisten tanpa lonjakan emosi berlebih, enak untuk narasi panduan.",
        "recommended": False
    },
    {
        "id": "Gacrux",
        "name": "Gacrux",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Matang & Berpengalaman",
        "style": "mature, seasoned, resonant voice",
        "description": "Vokal pria senior berpengalaman, cocok untuk analogi sejarah dan ulasan pakar.",
        "recommended": False
    },
    {
        "id": "Pulcherrima",
        "name": "Pulcherrima",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Tegas & Berani",
        "style": "forward, assertive, impactful female voice",
        "description": "Vokal wanita yang berani dan percaya diri, menarik perhatian audiens secara instan.",
        "recommended": False
    },
    {
        "id": "Achird",
        "name": "Achird",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Bersahabat & Ramah",
        "style": "friendly, welcoming, conversational narrator",
        "description": "Gaya teman mengobrol yang ramah dan menyenangkan, cocok untuk tips sehari-hari.",
        "recommended": False
    },
    {
        "id": "Zubenelgenubi",
        "name": "Zubenelgenubi",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Santai & Natural",
        "style": "casual, laid-back, modern youth conversationalist",
        "description": "Pembawaan kasual khas anak muda, sangat relevan untuk video reaction atau unboxing.",
        "recommended": False
    },
    {
        "id": "Vindemiatrix",
        "name": "Vindemiatrix",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Lembut & Penuh Perhatian",
        "style": "gentle, compassionate, warm educator",
        "description": "Intonasi mengayomi dan sabar, ideal untuk panduan pemula.",
        "recommended": False
    },
    {
        "id": "Sadachbia",
        "name": "Sadachbia",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Bersemangat & Dinamis",
        "style": "lively, animated, engaging fast pace",
        "description": "Penuh semangat dan ekspresi dinamis, pas untuk konten challenge teknologi.",
        "recommended": False
    },
    {
        "id": "Sadaltager",
        "name": "Sadaltager",
        "gender": "Pria",
        "category": "Pria",
        "tone": "Berpengetahuan Luas",
        "style": "knowledgeable, insightful, tech analyst",
        "description": "Gaya analis industri teknologi yang berbobot dan sarat fakta penting.",
        "recommended": False
    },
    {
        "id": "Sulafat",
        "name": "Sulafat",
        "gender": "Wanita",
        "category": "Wanita",
        "tone": "Hangat & Bersahaja",
        "style": "warm, comforting, down-to-earth tone",
        "description": "Vokal wanita yang hangat dan membumi, cocok untuk cerita inspiratif inovator.",
        "recommended": False
    }
]

# Official Gemini Inline Vocal Tags
OFFICIAL_VOCAL_TAGS = [
    {"tag": "<short pause>", "label": "Short Pause", "category": "timing", "desc": "Jeda dramatis atau sebelum fakta penting"},
    {"tag": "<long pause>", "label": "Long Pause", "category": "timing", "desc": "Jeda pergantian babak narasi"},
    {"tag": "<breath>", "label": "Breath", "category": "breathing", "desc": "Tarikan nafas sebelum kalimat teknis/panjang"},
    {"tag": "<heavy breath>", "label": "Heavy Breath", "category": "breathing", "desc": "Nafas berat penekanan tensi masalah"},
    {"tag": "<sigh>", "label": "Sigh", "category": "emotion", "desc": "Helaan nafas frustrasi pada masalah audiens"},
    {"tag": "<gasp>", "label": "Gasp", "category": "emotion", "desc": "Tersentak kaget saat angka/fakta anomali terungkap"},
    {"tag": "<chuckle>", "label": "Chuckle", "category": "emotion", "desc": "Tawa kecil saat membongkar mitos lucu atau keliru"},
    {"tag": "<snicker>", "label": "Snicker", "category": "emotion", "desc": "Kekeh sinis saat membahas kebiasaan konyol"},
    {"tag": "<pff>", "label": "Pff", "category": "emotion", "desc": "Ungkapan sepele atau ejekan pada klaim palsu"},
    {"tag": "<phew>", "label": "Phew", "category": "emotion", "desc": "Lega saat solusi di Payoff dipaparkan"},
    {"tag": "<exhales>", "label": "Exhales", "category": "breathing", "desc": "Hembusan nafas panjang meredakan ketegangan"},
    {"tag": "<whispers>", "label": "Whispers", "category": "tone", "desc": "Bisikan rahasia atau tips tersembunyi"},
    {"tag": "<throat-clearing>", "label": "Throat Clearing", "category": "filler", "desc": "Deheman sebelum masuk topik serius"},
    {"tag": "<tsk>", "label": "Tsk", "category": "emotion", "desc": "Decakan lidah kekecewaan atas kesalahan umum"},
    {"tag": "<groan>", "label": "Groan", "category": "emotion", "desc": "Keluhan atas dampak buruk suatu masalah"},
    {"tag": "<cheer>", "label": "Cheer", "category": "emotion", "desc": "Sorakan semangat ajakan bertindak (CTA)"}
]
