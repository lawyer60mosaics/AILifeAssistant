export type AudioRecorder = {
  start: () => Promise<void>;
  stop: () => void;
  isSupported: boolean;
};

export function createAudioRecorder(onChunk: (chunk: Blob) => void): AudioRecorder {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;

  return {
    isSupported: "MediaRecorder" in window && "mediaDevices" in navigator,
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";

      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          onChunk(event.data);
        }
      };
      recorder.start(250);
    },
    stop() {
      recorder?.stop();
      stream?.getTracks().forEach((track) => track.stop());
      recorder = null;
      stream = null;
    },
  };
}

