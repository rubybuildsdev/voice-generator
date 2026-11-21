from fastapi import APIRouter, HTTPException
from server.schemas import TitleRequest, TitleResponse
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
