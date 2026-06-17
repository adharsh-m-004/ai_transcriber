from faster_whisper import WhisperModel
from transformers import pipeline
import torch

print("CUDA Available:", torch.cuda.is_available())
print("GPU:", torch.cuda.get_device_name(0))

# Emotion Recognition on GPU
emotion_model = pipeline(
    "audio-classification",
    model="superb/wav2vec2-base-superb-er",
    device=0  # First GPU
)

emotion_result = emotion_model("chunks/chunk_1.wav")

print("Emotion:", emotion_result[0]["label"])
print("Confidence:", emotion_result[0]["score"])

# Faster Whisper on GPU
model = WhisperModel(
    "tiny",
    device="cuda",
    compute_type="float16"
)

segments, info = model.transcribe(
    "chunks/chunk_1.wav",
    beam_size=5
)

print("Language:", info.language)

for segment in segments:
    print(segment.text)