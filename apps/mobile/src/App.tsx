import { useMemo, useRef, useState } from "react";
import { Download, FileJson, Mic, Plug, RefreshCw, Send, Square, Wifi, WifiOff } from "lucide-react";
import { createRoot } from "react-dom/client";
import { createAudioRecorder } from "./audio";
import { HubClient, HubEvent } from "./ws";
import "./styles.css";

type ConnectionState = "idle" | "connecting" | "open" | "closed";
type Segment = { id: string; speaker: string; text: string };
type QaItem = { question: string; answer: string };

function App() {
  const defaultHubUrl = useMemo(() => {
    const host = window.location.hostname || "localhost";
    return `ws://${host}:8765/ws/client`;
  }, []);
  const [hubUrl, setHubUrl] = useState(defaultHubUrl);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [isRecording, setRecording] = useState(false);
  const [status, setStatus] = useState("等待连接 Hub");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [summary, setSummary] = useState("暂无阶段性摘要");
  const [question, setQuestion] = useState("");
  const [qaItems, setQaItems] = useState<QaItem[]>([]);
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
    if (event.type === "transcript_edited") {
      setSegments((current) =>
        current.map((segment) =>
          segment.id === event.segmentId ? { ...segment, text: event.text } : segment,
        ),
      );
      return;
    }
    if (event.type === "analysis_update") {
      setSummary(event.summary);
      return;
    }
    if (event.type === "qa_response") {
      setQaItems((current) => [
        ...current,
        { question: event.question, answer: event.answer },
      ]);
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

  function updateLocalSegment(segmentId: string, text: string) {
    setSegments((current) =>
      current.map((segment) => (segment.id === segmentId ? { ...segment, text } : segment)),
    );
  }

  function commitSegment(segment: Segment) {
    clientRef.current?.sendTranscriptEdit(segment.id, segment.text);
  }

  function submitQuestion() {
    const value = question.trim();
    if (!value) {
      return;
    }
    clientRef.current?.askQuestion(value);
    setQuestion("");
  }

  async function analyzeNow() {
    const apiUrl = hubUrl.replace(/^ws/, "http").replace("/ws/client", "/sessions/current/analyze");
    const response = await fetch(apiUrl, { method: "POST" });
    if (!response.ok) {
      setStatus("手动分析失败，请确认 Hub 正在运行");
      return;
    }
    const event = (await response.json()) as HubEvent;
    handleEvent(event);
  }

  function openExport(format: "md" | "json") {
    const apiUrl = hubUrl
      .replace(/^ws/, "http")
      .replace("/ws/client", `/sessions/current/export.${format}`);
    window.open(apiUrl, "_blank", "noopener,noreferrer");
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
        <div className="tool-row">
          <button className="secondary-button" type="button" onClick={analyzeNow}>
            <RefreshCw size={18} />
            生成纪要
          </button>
          <button className="secondary-button" type="button" onClick={() => openExport("md")}>
            <Download size={18} />
            Markdown
          </button>
          <button className="secondary-button" type="button" onClick={() => openExport("json")}>
            <FileJson size={18} />
            JSON
          </button>
        </div>
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
                  <textarea
                    aria-label={`${segment.speaker} 转录文本`}
                    value={segment.text}
                    onBlur={() => commitSegment(segment)}
                    onChange={(event) => updateLocalSegment(segment.id, event.target.value)}
                  />
                </article>
              ))
            )}
          </div>
        </div>
        <aside className="analysis">
          <h2>阶段性摘要</h2>
          <p>{summary}</p>
          <div className="qa-box">
            <h2>智能问答</h2>
            <div className="qa-input-row">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitQuestion();
                  }
                }}
                placeholder="基于当前转录提问"
              />
              <button className="icon-button" type="button" onClick={submitQuestion} title="发送问题">
                <Send size={18} />
              </button>
            </div>
            <div className="qa-list">
              {qaItems.map((item, index) => (
                <article key={`${item.question}-${index}`} className="qa-item">
                  <strong>Q: {item.question}</strong>
                  <p>A: {item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
