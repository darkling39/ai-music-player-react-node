# Transcriber

Python sidecar that turns audio (or video) into piano notes. The NestJS API calls it; nothing else should.

- **Model:** Spotify [Basic Pitch](https://github.com/spotify/basic-pitch), run with ONNX Runtime. TensorFlow is deliberately not installed (the default `basic-pitch` install pulls it on Windows), which keeps the environment smaller.
- **Decoding:** `ffmpeg` converts any container (wav, mp3, m4a, mp4, ...) to mono 22.05 kHz WAV and drops video streams. It must be on `PATH`, or set `FFMPEG_BIN`.
- **Tuning:** note range limited to the piano (A0-C8), notes shorter than 80 ms are dropped.

## Run

```bash
npm run setup:asr   # once: creates transcriber/.venv (Python 3.11) and installs dependencies
npm run dev:asr     # starts on http://127.0.0.1:8001
```

## API

| Method | Path          | Description                                                          |
| ------ | ------------- | -------------------------------------------------------------------- |
| GET    | `/health`     | `{ status, ffmpeg }`                                                 |
| POST   | `/transcribe` | multipart `file` -> `{ notes: [{ pitch, onset, duration, velocity }], durationSec }` |

`pitch` is a MIDI number, `onset`/`duration` are seconds, `velocity` is 0..1 detector confidence. Undecodable files return `422`.
