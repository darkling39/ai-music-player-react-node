"""Audio -> note events, using Spotify's Basic Pitch (ONNX backend)."""

import logging
import os
import subprocess
import tempfile
from pathlib import Path

from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.inference import Model, predict

logging.getLogger().setLevel(logging.ERROR)  # basic-pitch warns about optional TF/CoreML backends

FFMPEG = os.environ.get("FFMPEG_BIN", "ffmpeg")
SAMPLE_RATE = 22050  # Basic Pitch's native rate
PIANO_MIN_HZ = 27.5  # A0
PIANO_MAX_HZ = 4186.0  # C8

_model = Model(ICASSP_2022_MODEL_PATH)


class TranscriptionError(Exception):
    pass


def to_wav(source: Path, target: Path) -> None:
    """Decode any audio/video container to mono WAV; also strips the video stream."""
    result = subprocess.run(
        [FFMPEG, "-y", "-i", str(source), "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE), str(target)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        reason = result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "unknown error"
        raise TranscriptionError(f"Could not decode the file as audio or video ({reason.split(': ')[-1]})")


def transcribe(source: Path) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "audio.wav"
        to_wav(source, wav)
        _, _, note_events = predict(
            str(wav),
            _model,
            onset_threshold=0.5,
            frame_threshold=0.3,
            minimum_note_length=80,  # ms: drops spurious blips
            minimum_frequency=PIANO_MIN_HZ,
            maximum_frequency=PIANO_MAX_HZ,
            melodia_trick=True,
        )

    notes = sorted(
        (
            {
                "pitch": int(pitch),
                "onset": round(float(start), 4),
                "duration": round(float(end - start), 4),
                "velocity": round(float(amplitude), 3),
            }
            for start, end, pitch, amplitude, _bends in note_events
        ),
        key=lambda note: (note["onset"], note["pitch"]),
    )
    return {"notes": notes, "durationSec": round(max((n["onset"] + n["duration"] for n in notes), default=0.0), 4)}
