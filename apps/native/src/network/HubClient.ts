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
      type: "transcript_edited";
      segmentId: string;
      text: string;
    }
  | {
      type: "analysis_update";
      summary: string;
      actionItems: Array<{ task: string; owner: string | null; due: string | null }>;
      decisions: string[];
    }
  | {
      type: "qa_response";
      question: string;
      answer: string;
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

type ConnectionState = "idle" | "connecting" | "open" | "closed";

export class HubClient {
  private socket: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly onEvent: (event: HubEvent) => void,
    private readonly onState: (state: ConnectionState) => void,
  ) {}

  connect() {
    this.onState("connecting");
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.onState("open");
      this.sendJson({
        type: "client_hello",
        clientId: `native-${Date.now()}`,
        role: "collector",
        audio: {
          mimeType: "audio/pcm;format=s16le",
          sampleRate: 16000,
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

    this.socket.onerror = () => {
      this.onEvent({
        type: "error",
        code: "WEBSOCKET_ERROR",
        message: "无法连接到 Hub，请确认手机与 PC 在同一局域网。",
      });
    };

    this.socket.onclose = () => this.onState("closed");
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.onState("closed");
  }

  sendAudio(chunk: ArrayBuffer) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(chunk);
    }
  }

  sendTranscriptEdit(segmentId: string, text: string) {
    this.sendJson({ type: "transcript_edit", segmentId, text });
  }

  askQuestion(question: string) {
    this.sendJson({ type: "qa_request", question });
  }

  private sendJson(payload: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}
