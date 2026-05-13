import { Audio } from "expo-av";

type NativeAudioStreamerOptions = {
  onChunk: (chunk: ArrayBuffer) => void;
  onState: (state: RecordingState) => void;
  onError: (message: string) => void;
};

export type RecordingState = "idle" | "requesting_permission" | "recording" | "stopping";

export class NativeAudioStreamer {
  private recording: Audio.Recording | null = null;
  private mockTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: NativeAudioStreamerOptions) {}

  async start() {
    try {
      this.options.onState("requesting_permission");
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        this.options.onState("idle");
        this.options.onError("没有麦克风权限。");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      this.recording = recording;
      this.options.onState("recording");

      this.startMockFrames();
    } catch (error) {
      this.options.onState("idle");
      this.options.onError(error instanceof Error ? error.message : "录音启动失败。");
    }
  }

  async stop() {
    this.options.onState("stopping");
    this.stopMockFrames();

    try {
      await this.recording?.stopAndUnloadAsync();
    } finally {
      this.recording = null;
      this.options.onState("idle");
    }
  }

  private startMockFrames() {
    this.stopMockFrames();
    this.mockTimer = setInterval(() => {
      const frame = new Uint8Array([1, 2, 3, Date.now() % 255]);
      this.options.onChunk(frame.buffer);
    }, 250);
  }

  private stopMockFrames() {
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
  }
}

