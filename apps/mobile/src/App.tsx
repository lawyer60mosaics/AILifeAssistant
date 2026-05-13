import { useMemo, useRef, useState } from "react";
import { Mic, Plug, Square, Wifi, WifiOff } from "lucide-react";
import { createRoot } from "react-dom/client";
import { createAudioRecorder } from "./audio";
import { HubClient, HubEvent } from "./ws";
import "./styles.css";

type ConnectionState = "idle" | "connecting" | "open" | "closed";

function App() {
  const defaultHubUrl = useMemo(() => {
    const host = window.location.hostname || "localhost";
    return `ws://${host}:8765/ws/client`;
  }, []);
  const [hubUrl, setHubUrl] = useState(defaultHubUrl);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [isRecording, setRecording] = useState(false);
  const [status, setStatus] = useState("等待连接 Hub");
  const [segments, setSegments] = useState<Array<{ id: string; speaker: string; text: string }>>([]);
  const [summary, setSummary] = useState("暂无阶段性摘要");
  const clientRef = useRef<HubClient | null>(null);

  const recorder = useMemo(
    () =>
      createAudioRecorder((chunk) => {
        clientRef.current?.sendAudio(chunk);
      }),
    [],
  );

  function handleEvent(event: HubEvent) {
    if (event.type === "session_state") {
      setStatus(`会话 ${event.sessionId.slice(0, 8)} 已就绪，隐私模式：${event.privacyMode}`);
      return;
    }
    if (event.type === "hub_status") {
      setStatus(event.message);
      return;
    }
    if (event.type === "transcript_delta") {
      setSegments((current) => [
        ...current,
        { id: event.segmentId, speaker: event.speaker, text: event.text },
      ]);
      return;
    }
    if (event.type === "analysis_update") {
      setSummary(event.summary);
      return;
    }
    if (event.type === "error") {
      setStatus(`${event.code}: ${event.message}`);
    }
  }

  function connect() {
    clientRef.current?.disconnect();
    const client = new HubClient(hubUrl, handleEvent, setConnection);
    clientRef.current = client;
    client.connect();
  }

  async function toggleRecording() {
    if (isRecording) {
      recorder.stop();
      setRecording(false);
      return;
    }

    if (connection !== "open") {
      connect();
      setStatus("正在连接 Hub，连接成功后请再次开始录音");
      return;
    }

    await recorder.start();
    setRecording(true);
    setStatus("正在采集并推送音频");
  }

  const online = connection === "open";

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">AI Minutes</p>
          <h1>智能语音采集器</h1>
        </div>
        <div className={`status-pill ${online ? "online" : ""}`}>
          {online ? <Wifi size={18} /> : <WifiOff size={18} />}
          {connection}
        </div>
      </section>

      <section className="control-panel">
        <label htmlFor="hub-url">Hub WebSocket</label>
        <div className="connect-row">
          <input
            id="hub-url"
            value={hubUrl}
            onChange={(event) => setHubUrl(event.target.value)}
            placeholder="ws://192.168.1.10:8765/ws/client"
          />
          <button className="icon-button" type="button" onClick={connect} title="连接 Hub">
            <Plug size={20} />
          </button>
        </div>
        <button
          className={`record-button ${isRecording ? "recording" : ""}`}
          type="button"
          onClick={toggleRecording}
          disabled={!recorder.isSupported}
        >
          {isRecording ? <Square size={22} /> : <Mic size={22} />}
          {isRecording ? "停止录音" : "开始录音"}
        </button>
        <p className="status-text">{recorder.isSupported ? status : "当前浏览器不支持 MediaRecorder"}</p>
      </section>

      <section className="content-grid">
        <div className="transcript">
          <h2>实时转录</h2>
          <div className="segment-list">
            {segments.length === 0 ? (
              <p className="empty">连接 Hub 并开始录音后，转录内容会出现在这里。</p>
            ) : (
              segments.map((segment) => (
                <article key={segment.id} className="segment">
                  <span>{segment.speaker}</span>
                  <p>{segment.text}</p>
                </article>
              ))
            )}
          </div>
        </div>
        <aside className="analysis">
          <h2>阶段性摘要</h2>
          <p>{summary}</p>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

