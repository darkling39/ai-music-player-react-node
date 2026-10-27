"""HTTP sidecar around the transcription pipeline. The NestJS API is the only intended client."""

import os
import shutil
import tempfile
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile

from transcription import FFMPEG, TranscriptionError, transcribe

app = FastAPI(title="Piano transcriber")


@app.get("/health")
def health():
    return {"status": "ok", "ffmpeg": shutil.which(FFMPEG) is not None}


@app.post("/transcribe")
def transcribe_file(file: UploadFile = File(...)):
    """Accepts audio or video (wav, mp3, m4a, mp4, ...) and returns the detected notes."""
    suffix = Path(file.filename or "").suffix or ".bin"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
    try:
        return transcribe(Path(tmp.name))
    except TranscriptionError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    finally:
        os.unlink(tmp.name)


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=int(os.environ.get("PORT", "8001")), app_dir=str(Path(__file__).parent))
