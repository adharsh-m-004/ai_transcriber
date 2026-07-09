# ai_transcriber

# AI Live Transcriber & Emotion Detector

A Chrome extension that captures **live tab audio**, streams it to a FastAPI backend, and returns a **real-time transcript** (via `faster-whisper`) plus an **emotion classification** (via a Wav2Vec2 speech-emotion model) for each audio chunk — displayed live in the extension popup.

---

## How it works

```
Chrome tab audio
      │  (tabCapture)
      ▼
offscreen.js  ──chunks (webm)──▶  background.js  ──▶  backend/main.py (FastAPI)
      ▲                                                       │
      │                                                       ▼
popup.js  ◀── TRANSCRIPT_RESULT / TRANSCRIPT_ERROR   faster-whisper (transcription)
  (live UI)                                          wav2vec2-superb-er (emotion)
```

1. **`extensions/manifest.json`** — Manifest V3 Chrome extension ("AI Live Translator") requesting `tabCapture`, `offscreen`, `scripting`, `storage`.
2. **`extensions/popup.js` / `popup.html`** — the UI: Start/Stop/Clear buttons, live transcript feed, and per-chunk emotion + confidence display.
3. **`extensions/background.js`** — the service worker. On `START_RECORDING`, grabs a `tabCapture` media stream ID for the active tab and spins up an offscreen document to actually record audio (Manifest V3 service workers can't access media APIs directly).
4. **`extensions/offscreen.js` / `offscreen.html`** — records tab audio in chunks and posts each chunk to the FastAPI backend, relaying results back to the popup.
5. **`backend/main.py`** — FastAPI server exposing `POST /audio`:
   - Accepts an uploaded audio chunk (`.webm`), writes it to a temp file.
   - Runs `faster-whisper` (`tiny` model) to transcribe it.
   - Runs a Hugging Face `audio-classification` pipeline (`superb/wav2vec2-base-superb-er`) to classify emotion.
   - Returns `{ "text": "...", "emotion": { "label": "hap", "score": 0.93 } }`.
   - Cleans up the temp file after each request.
6. **`backend/transcribe.py`** — standalone/dev helper script for transcription outside the API flow.
7. **`backend/chunks/`** — sample/recorded audio chunks (`.webm` + converted `.wav`) generated during testing; safe to delete/regenerate.
8. **`frontend/`** — a standalone `capture.js` / `index.html` for testing audio capture and transcription in a plain browser tab, independent of the extension.

### Emotion labels
`ang` Angry · `hap` Happy · `neu` Neutral · `sad` Sad · `fea` Fear · `dis` Disgust

---

## Dependencies

**Backend** (`ai-trans/requirements.txt`):

| Package            | Purpose                                            |
|---------------------|-----------------------------------------------------|
| fastapi             | Backend API framework                              |
| uvicorn[standard]   | ASGI server to run FastAPI                         |
| faster-whisper      | Fast Whisper-based speech-to-text                  |
| transformers        | Hugging Face pipeline for emotion classification   |
| torch               | Backend for both `faster-whisper` and `transformers` |

No versions are pinned in the current `requirements.txt` — pin them once you've confirmed a working combination in your environment (see note below).

> **GPU note:** `main.py` currently hardcodes `device="cuda"` for Whisper and `device=0` for the emotion pipeline. You need an NVIDIA GPU with CUDA + a matching `torch` build for this to work as-is. For CPU-only machines, change:
> ```python
> whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
> emotion_model = pipeline("audio-classification", model="superb/wav2vec2-base-superb-er", device=-1)
> ```

**Frontend / Extension:** No build step or npm dependencies — plain HTML/CSS/JS, loaded directly by Chrome as an unpacked extension.

**System dependency:** `faster-whisper` requires `ffmpeg` on the host for audio decoding.
```bash
# Debian/Ubuntu
sudo apt install ffmpeg
# macOS
brew install ffmpeg
```

---

## Setup & running locally

### 1. Backend

```bash
cd ai-trans/backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r ../requirements.txt

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be live at `http://localhost:8000`, with the transcription+emotion endpoint at `POST /audio`.

First run will download the Whisper `tiny` model and the `superb/wav2vec2-base-superb-er` model from Hugging Face — expect a delay and disk usage on first start.

### 2. Chrome extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `ai-trans/extensions/` folder
4. Pin the extension, open a tab with audio (e.g. a video call or YouTube), click the extension icon, then **Start**

By default `offscreen.js` should point at your local backend (`http://localhost:8000/audio`) — update the URL there if you deploy the backend elsewhere.

### 3. Standalone frontend (optional, for testing without the extension)

```bash
cd ai-trans/frontend
# serve index.html with any static server, e.g.:
python -m http.server 5500
```
Open `http://localhost:5500` — `capture.js` handles mic/audio capture and posts to the same backend.

---

## Deployment

This project has two independently deployable pieces:

### Backend (FastAPI)

Deploy anywhere that supports long-running Python processes with GPU access if you want real-time performance (e.g. a GPU VM on AWS/GCP/Lambda Labs, or a Docker container on a GPU-enabled host — CPU-only hosting works but will be noticeably slower per chunk).


### Chrome extension

For personal/dev use, "Load unpacked" (above) is enough. To distribute:

1. Zip the `ai-trans/extensions/` folder contents
2. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Update `background.js` / `offscreen.js` to point at your deployed backend URL instead of `localhost`
4. Submit for review (Manifest V3, `tabCapture` permission will need a clear justification in your store listing)

---

## Project structure

```
ai_transcriber-main/
└── ai-trans/
    ├── backend/
    │   ├── main.py           # FastAPI app: /audio endpoint (Whisper + emotion model)
    │   ├── transcribe.py      # standalone transcription helper
    │   └── chunks/             # sample recorded audio chunks (test artifacts)
    ├── extensions/
    │   ├── manifest.json       # Chrome extension manifest (MV3)
    │   ├── background.js       # service worker: tabCapture + offscreen orchestration
    │   ├── offscreen.js/.html  # actual audio recording + chunk upload
    │   └── popup.js/.html      # extension popup UI
    ├── frontend/
    │   ├── capture.js          # standalone browser audio capture (non-extension)
    │   └── index.html
    └── requirements.txt
```

---
