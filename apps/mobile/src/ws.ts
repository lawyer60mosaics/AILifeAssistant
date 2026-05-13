export type HubEvent =
  | {
      type: "session_state";
      sessionId: string;
      privacyMode: "local_only" | "cloud_enabled";
      connectedClients: number;
    }
  | {
      type: "transcript_delta";
      segmentId: string;
      speaker: string;
      text: string;
      startMs: number;
      endMs: number;
      isFinal: boolean;
    }
  | {
      type: "analysis_update";
      summary: string;
      actionItems: Array<{ task: string; owner: string | null; due: string | null }>;
      decisions: string[];
    }
  | {
      type: "hub_status";
      message: string;
      connectedClients: number;
    }
  | {
      type: "error";
      code: string;
      message: string;
    };

export class HubClient {
  private socket: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly onEvent: (event: HubEvent) => void,
    private readonly onState: (state: "idle" | "connecting" | "open" | "closed") => void,
  ) {}

  connect() {
    this.onState("connecting");
    this.socket = new WebSocket(this.url);
    this.socket.binaryType = "arraybuffer";

    this.socket.onopen = () => {
      this.onState("open");
      this.sendJson({
        type: "client_hello",
        clientId: crypto.randomUUID(),
        role: "collector",
        audio: {
          mimeType: "audio/webm;codecs=opus",
          sampleRate: 48000,
          channels: 1,
        },
      });
    };

    this.socket.onmessage = (message) => {
      if (typeof message.data !== "string") {
        return;
      }
      this.onEvent(JSON.parse(message.data) as HubEvent);
    };

    this.socket.onclose = () => this.onState("closed");
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.onState("closed");
  }

  sendAudio(blob: Blob) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(blob);
  }

  private sendJson(payload: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}

