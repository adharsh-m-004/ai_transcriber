const EMOTION_LABELS = {
  ang: 'Angry', hap: 'Happy',
  neu: 'Neutral', sad: 'Sad',
  fea: 'Fear', dis: 'Disgust'
};

document.getElementById('btn-start').addEventListener('click', startCapture);
document.getElementById('btn-stop').addEventListener('click', stopCapture);
document.getElementById('btn-clear').addEventListener('click', clearAll);

// Listen for results from offscreen
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RECORDING_STARTED') {
    setRecording(true);
  }
  if (msg.type === 'RECORDING_STOPPED') {
    setRecording(false);
  }
  if (msg.type === 'TRANSCRIPT_RESULT') {
    const res = msg.data;
    document.getElementById('status-label').textContent = 'Recording...';
    const chunks = parseInt(document.getElementById('stat-chunks').textContent) + 1;
    document.getElementById('stat-chunks').textContent = chunks;
    if (res.text) appendTranscript(res.text, res.emotion, chunks);
    if (res.emotion) updateEmotion(res.emotion);
  }
  if (msg.type === 'TRANSCRIPT_ERROR') {
    document.getElementById('status-label').textContent = 'Recording...';
    appendError('Error: ' + msg.error);
  }
});

function setRecording(on) {
  const dot = document.getElementById('dot');
  dot.style.background = on ? '#e24b4a' : '#ccc';
  dot.style.animation = on ? 'pulse 1.5s ease-in-out infinite' : 'none';
  document.getElementById('status-label').textContent = on ? 'Recording...' : 'Idle';
  document.getElementById('btn-start').disabled = on;
  document.getElementById('btn-stop').disabled = !on;
}

async function startCapture() {
  document.getElementById('status-label').textContent = 'Starting...';
  chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (res) => {
    if (!res?.ok) appendError('Could not start recording');
  });
}

function stopCapture() {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
}

function clearAll() {
  document.getElementById('transcript-box').innerHTML =
    '<span class="placeholder">Transcript will appear here...</span>';
  resetStats();
}

function resetStats() {
  document.getElementById('stat-chunks').textContent = '0';
  document.getElementById('stat-emotion').textContent = '-';
  document.getElementById('stat-emotion').style.color = '#aaa';
  document.getElementById('stat-conf').textContent = '-';
  document.getElementById('stat-conf').style.color = '#aaa';
}

function appendTranscript(text, emotion, chunkNum) {
  if (!text?.trim()) return;
  const box = document.getElementById('transcript-box');
  const label = emotion ? (EMOTION_LABELS[emotion.label] || emotion.label) : '';
  const div = document.createElement('div');
  div.className = 'chunk-entry';
  div.innerHTML = `
    <div class="chunk-meta">Chunk ${chunkNum} ${label}</div>
    <div>${text.trim()}</div>
  `;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function appendError(msg) {
  const box = document.getElementById('transcript-box');
  const div = document.createElement('div');
  div.className = 'error-entry';
  div.textContent = msg;
  box.appendChild(div);
}

function updateEmotion(emotion) {
  if (!emotion) return;
  document.getElementById('stat-emotion').textContent = EMOTION_LABELS[emotion.label] || emotion.label;
  document.getElementById('stat-emotion').style.color = '#222';
  document.getElementById('stat-conf').textContent = Math.round(emotion.score * 100) + '%';
  document.getElementById('stat-conf').style.color = '#222';
}