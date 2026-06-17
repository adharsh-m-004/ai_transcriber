let offscreenCreated = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'START_RECORDING') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        const streamId = await new Promise((resolve, reject) => {
          chrome.tabCapture.getMediaStreamId(
            { targetTabId: tabs[0].id },
            (id) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve(id);
            }
          );
        });

        console.log('Got streamId:', streamId);

        // Close existing offscreen doc if any
        const existing = await chrome.offscreen.hasDocument().catch(() => false);
        if (existing) {
          await chrome.offscreen.closeDocument().catch(() => {});
        }

        await chrome.offscreen.createDocument({
          url: chrome.runtime.getURL('offscreen.html'),
          reasons: ['AUDIO_PLAYBACK'],   // <-- fixed reason
          justification: 'Recording tab audio'
        });

        console.log('Offscreen created, sending INIT_RECORDING');

        setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'INIT_RECORDING', streamId });
        }, 500);

        sendResponse({ ok: true });

      } catch (err) {
        console.error('START_RECORDING error:', err.message);
        sendResponse({ ok: false, error: err.message });
      }
    });
    return true;
  }

  if (msg.type === 'STOP_RECORDING') {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING_OFFSCREEN' });
    sendResponse({ ok: true });
    return true;
  }

});