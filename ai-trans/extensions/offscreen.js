let recorder, chunkCount = 0, headerBlob = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'INIT_RECORDING') startRecording(msg.streamId);
  if (msg.type === 'STOP_RECORDING_OFFSCREEN') stopRecording();
});

async function startRecording(streamId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });

  // Re-play audio so user still hears it
  const audio = new Audio();
  audio.srcObject = stream;
  audio.play();

  recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  chunkCount = 0;
  headerBlob = null;

  recorder.ondataavailable = async (e) => {
    if (!e.data || e.data.size === 0) return;

    if (chunkCount === 0) headerBlob = e.data;
    chunkCount++;

    const blobToSend = chunkCount === 1
      ? e.data
      : new Blob([headerBlob, e.data], { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('file', blobToSend, 'audio.webm');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    try {
      const resp = await fetch('http://127.0.0.1:8000/audio', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeout);
      const res = await resp.json();

      // Send result to popup
      chrome.runtime.sendMessage({ type: 'TRANSCRIPT_RESULT', data: res });
    } catch (err) {
      clearTimeout(timeout);
      chrome.runtime.sendMessage({ type: 'TRANSCRIPT_ERROR', error: err.message });
    }
  };

  recorder.start(10000);
  chrome.runtime.sendMessage({ type: 'RECORDING_STARTED' });
}

function stopRecording() {
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED' });
}