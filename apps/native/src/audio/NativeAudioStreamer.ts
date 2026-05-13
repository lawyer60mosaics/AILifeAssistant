import { Audio } from "expo-av";
import { DeviceEventEmitter, NativeModules, Platform } from "react-native";

type NativeAudioStreamerOptions = {
  onChunk: (chunk: ArrayBuffer) => void;
  onState: (state: RecordingState) => void;
  onError: (message: string) => void;
};

type AndroidChunkEvent = {
  base64: string;
  sampleRate: number;
  channels: number;
  format: "pcm_s16le";
};

type AndroidAudioModule = {
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
};

export type RecordingState = "idle" | "requesting_permission" | "recording" | "stopping";

const androidAudio = NativeModules.AiMinutesAudio as AndroidAudioModule | undefined;

export class NativeAudioStreamer {
  private recording: Audio.Recording | null = null;
  private mockTimer: ReturnType<typeof setInterval> | null = null;
  private androidSubscription: { remove: () => void } | null = null;

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

      if (Platform.OS === "android" && androidAudio) {
        await this.startAndroidPcm();
        return;
      }

      await this.startFallbackRecorder();
    } catch (error) {
      this.options.onState("idle");
      this.options.onError(error instanceof Error ? error.message : "录音启动失败。");
    }
  }

  async stop() {
    this.options.onState("stopping");
    this.stopMockFrames();
    this.androidSubscription?.remove();
    this.androidSubscription = null;

    try {
      if (Platform.OS === "android" && androidAudio) {
        await androidAudio.stop();
      }
      await this.recording?.stopAndUnloadAsync();
    } finally {
      this.recording = null;
      this.options.onState("idle");
    }
  }

  private async startAndroidPcm() {
    this.androidSubscription?.remove();
    this.androidSubscription = DeviceEventEmitter.addListener(
      "AiMinutesAudioChunk",
      (event: AndroidChunkEvent) => {
        this.options.onChunk(base64ToArrayBuffer(event.base64));
      },
    );
    await androidAudio?.start();
    this.options.onState("recording");
  }

  private async startFallbackRecorder() {
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

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

