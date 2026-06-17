async function captureTabAudio() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        const audioTracks = stream.getAudioTracks();

        if (audioTracks.length === 0) {
            console.log("No audio track found");
            return;
        }

        console.log("Audio captured!");

        const audioStream = new MediaStream(audioTracks);

        const recorder = new MediaRecorder(audioStream);

        recorder.ondataavailable = async (event) => {
            const blob = event.data;

            // Send blob to backend
            const formData = new FormData();
            formData.append("audio", blob);

            await fetch("http://localhost:8000/transcribe", {
                method: "POST",
                body: formData
            });
        };

        recorder.start(1000); // 1-second chunks

    } catch (err) {
        console.error(err);
    }
}

captureTabAudio();