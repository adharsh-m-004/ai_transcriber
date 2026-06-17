from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from faster_whisper import WhisperModel
from transformers import pipeline

import tempfile
import os
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ONCE at startup
whisper_model = WhisperModel(
    "tiny",
    device="cuda",      # or "cpu"
    compute_type="float16"
)

emotion_model = pipeline(
    "audio-classification",
    model="superb/wav2vec2-base-superb-er",
    device=0            # GPU
)


def process_audio(temp_path: str):
    # Whisper transcription
    segments, _ = whisper_model.transcribe(
        temp_path,
        beam_size=1
    )

    text = " ".join(segment.text for segment in segments).strip()

    # Emotion classification
    emotion_results = emotion_model(temp_path)

    return text, emotion_results[0]


@app.post("/audio")
async def receive_audio(file: UploadFile):

    data = await file.read()

    # Temporary file only for this request
    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".webm"
    ) as temp_file:

        temp_file.write(data)
        temp_path = temp_file.name

    try:
        loop = asyncio.get_running_loop()

        text, emotion = await loop.run_in_executor(
            None,
            process_audio,
            temp_path
        )

        return {
            "text": text,
            "emotion": emotion
        }

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)