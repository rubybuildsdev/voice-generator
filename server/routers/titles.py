from fastapi import APIRouter, HTTPException
from server.schemas import (
    TitleRequest,
    TitleResponse,
    TitleChatRequest,
    TitleChatResponse,
    SaveTitleRequest,
)
from server.services import gemini_service

router = APIRouter(prefix="/api/titles", tags=["Titles"])

@router.post("/generate", response_model=TitleResponse)
async def generate_titles_endpoint(req: TitleRequest):
    """
    Riset & Hasilkan Rekomendasi Judul (44-54 Karakter)
    Mengekstrak fakta terkuat menjadi 3 rekomendasi judul video pendek berstandar retensi tinggi
    dan konsep thumbnail pelengkap sesuai 5 Formula Teruji.
    """
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topik atau data riset tidak boleh kosong.")
    try:
        result = gemini_service.generate_titles(req.topic, req.count)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat", response_model=TitleChatResponse)
async def chat_titles_endpoint(req: TitleChatRequest):
    """
    Obrolan Santai Diskusi Judul & Brainstorming Ide Hook
    Berfungsi sebagai chatbot ideation partner tanpa langsung membuat file ke disk.
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="Pesan obrolan tidak boleh kosong.")
    try:
        result = gemini_service.chat_title_discussion(req.messages)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save")
async def save_title_endpoint(req: SaveTitleRequest):
    """
    Menyimpan judul terpilih ke content/titles/ hanya saat pengguna sudah setuju.
    """
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Judul tidak boleh kosong.")
    try:
        saved_path = gemini_service.save_title_selection(
            title=req.title,
            formula=req.formula or "Curiosity Gap",
            why_it_works=req.why_it_works,
            topic=req.topic
        )
        return {"success": True, "saved_path": saved_path, "title": req.title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
