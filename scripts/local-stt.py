"""Loopback-only speech recognition. Audio and transcripts are not logged."""
import io
import os
import secrets
import threading
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile, Request
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

ROOT = Path(__file__).resolve().parent.parent
TOKEN = os.environ.get("STT_TOKEN", "")
if len(TOKEN) < 32:
    raise RuntimeError("STT_TOKEN is required")
model = WhisperModel(str(ROOT / '.tooling/models/whisper-small'), device="cpu",
                     compute_type="int8", cpu_threads=6, local_files_only=True)
gate = threading.Lock()
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
LIMIT = 12 * 1024 * 1024


@app.middleware("http")
async def guard(request: Request, call_next):
    if request.headers.get("origin") or not secrets.compare_digest(
            request.headers.get("authorization", ""), "Bearer " + TOKEN):
        return JSONResponse({"error": "unauthorized"}, status_code=401)
    try:
        if int(request.headers.get("content-length", "0")) > LIMIT + 65536:
            return JSONResponse({"error": "too large"}, status_code=413)
    except ValueError:
        return JSONResponse({"error": "invalid length"}, status_code=400)
    return await call_next(request)


@app.get("/health")
def health():
    return {"ok": True, "model": "whisper-small", "local": True}


@app.post("/v1/audio/transcriptions")
def transcribe(file: UploadFile = File(...)):
    if not gate.acquire(blocking=False):
        raise HTTPException(503, "busy")
    try:
        raw = file.file.read(LIMIT + 1)
        if not raw or len(raw) > LIMIT:
            raise HTTPException(413, "invalid audio size")
        try:
            audio = decode_audio(io.BytesIO(raw), sampling_rate=16000)
        except Exception:
            raise HTTPException(400, "invalid audio")
        if len(audio) > 65 * 16000:
            raise HTTPException(413, "audio exceeds 65 seconds")
        segments, _ = model.transcribe(audio, language="ko", beam_size=5,
                                       vad_filter=True, condition_on_previous_text=False)
        text = " ".join(s.text.strip() for s in segments).strip()
        return {"text": text[:4000]}
    finally:
        file.file.close()
        gate.release()


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=18000, access_log=False, limit_concurrency=8)
