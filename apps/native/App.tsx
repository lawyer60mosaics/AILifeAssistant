import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { NativeAudioStreamer, RecordingState } from "./src/audio/NativeAudioStreamer";
import { discoverHub } from "./src/network/discovery";
import { HubClient, HubEvent } from "./src/network/HubClient";

type ConnectionState = "idle" | "connecting" | "open" | "closed";
type Segment = { id: string; speaker: string; text: string };

export default function App() {
  const [hubUrl, setHubUrl] = useState("ws://127.0.0.1:8765/ws/client");
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [recording, setRecording] = useState<RecordingState>("idle");
  const [status, setStatus] = useState("配置 PC Hub 地址后连接");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [summary, setSummary] = useState("暂无阶段性摘要");
  const [question, setQuestion] = useState("");
  const [qaItems, setQaItems] = useState<Array<{ question: string; answer: string }>>([]);
  const [isDiscovering, setDiscovering] = useState(false);

  const clientRef = useRef<HubClient | null>(null);
  const streamer = useMemo(
    () =>
      new NativeAudioStreamer({
        onChunk: (chunk) => clientRef.current?.sendAudio(chunk),
        onState: setRecording,
        onError: (message) => Alert.alert("录音错误", message),
      }),
    [],
  );

  function handleHubEvent(event: HubEvent) {
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
      setQaItems((current) => [...current, { question: event.question, answer: event.answer }]);
      return;
    }

    if (event.type === "error") {
      setStatus(`${event.code}: ${event.message}`);
    }
  }

  function connect() {
    clientRef.current?.disconnect();
    const client = new HubClient(hubUrl.trim(), handleHubEvent, setConnection);
    clientRef.current = client;
    client.connect();
  }

  async function autoDiscover() {
    setDiscovering(true);
    setStatus("正在扫描局域网 Hub");
    try {
      const result = await discoverHub();
      if (!result) {
        setStatus("未发现 Hub，请确认 PC Hub 已启动且在同一局域网");
        return;
      }
      setHubUrl(result.wsUrl);
      setStatus(`已发现 Hub：${result.host}`);
    } catch {
      setStatus("自动发现失败，请手动输入 Hub 地址");
    } finally {
      setDiscovering(false);
    }
  }

  async function toggleRecording() {
    if (recording === "recording") {
      await streamer.stop();
      setStatus("录音已停止");
      return;
    }

    if (connection !== "open") {
      connect();
      setStatus("正在连接 Hub，连接成功后再次点击开始录音");
      return;
    }

    await streamer.start();
    setStatus("正在采集音频并推送至 Hub");
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
    try {
      const apiUrl = hubUrl.replace(/^ws/, "http").replace("/ws/client", "/sessions/current/analyze");
      const response = await fetch(apiUrl, { method: "POST" });
      if (!response.ok) {
        throw new Error("分析请求失败");
      }
      handleHubEvent((await response.json()) as HubEvent);
    } catch {
      Alert.alert("分析失败", "请确认 Hub 正在运行。");
    }
  }

  async function openExport(format: "md" | "json") {
    const apiUrl = hubUrl
      .replace(/^ws/, "http")
      .replace("/ws/client", `/sessions/current/export.${format}`);
    await Linking.openURL(apiUrl);
  }

  const online = connection === "open";
  const isRecording = recording === "recording";

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>AI Minutes</Text>
                <Text style={styles.title}>智能语音采集器</Text>
              </View>
              <View style={[styles.statusPill, online && styles.statusPillOnline]}>
                <Feather name={online ? "wifi" : "wifi-off"} size={18} color={online ? "#126B4D" : "#687386"} />
                <Text style={[styles.statusPillText, online && styles.statusPillTextOnline]}>
                  {connection}
                </Text>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.label}>Hub WebSocket</Text>
              <View style={styles.connectRow}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  inputMode="url"
                  onChangeText={setHubUrl}
                  placeholder="ws://192.168.1.10:8765/ws/client"
                  placeholderTextColor="#8A94A6"
                  style={styles.input}
                  value={hubUrl}
                />
                <Pressable accessibilityLabel="连接 Hub" onPress={connect} style={styles.iconButton}>
                  <Feather name="link" size={21} color="#FFFFFF" />
                </Pressable>
              </View>
              <Pressable onPress={autoDiscover} style={styles.secondaryButton}>
                <Feather name="search" size={18} color="#253149" />
                <Text style={styles.secondaryButtonText}>
                  {isDiscovering ? "扫描中" : "自动发现 Hub"}
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel={isRecording ? "停止录音" : "开始录音"}
                onPress={toggleRecording}
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
              >
                <Feather name={isRecording ? "square" : "mic"} size={22} color="#FFFFFF" />
                <Text style={styles.recordButtonText}>{isRecording ? "停止录音" : "开始录音"}</Text>
              </Pressable>

              <Text style={styles.statusText}>{status}</Text>

              <View style={styles.toolRow}>
                <Pressable onPress={analyzeNow} style={styles.secondaryButton}>
                  <Feather name="refresh-cw" size={18} color="#253149" />
                  <Text style={styles.secondaryButtonText}>生成纪要</Text>
                </Pressable>
                <Pressable onPress={() => openExport("md")} style={styles.secondaryButton}>
                  <Feather name="download" size={18} color="#253149" />
                  <Text style={styles.secondaryButtonText}>Markdown</Text>
                </Pressable>
                <Pressable onPress={() => openExport("json")} style={styles.secondaryButton}>
                  <Feather name="file-text" size={18} color="#253149" />
                  <Text style={styles.secondaryButtonText}>JSON</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>实时转录</Text>
              {segments.length === 0 ? (
                <Text style={styles.emptyText}>连接 Hub 并开始录音后，转录内容会出现在这里。</Text>
              ) : (
                segments.map((segment) => (
                  <View key={segment.id} style={styles.segment}>
                    <Text style={styles.segmentSpeaker}>{segment.speaker}</Text>
                    <TextInput
                      multiline
                      onBlur={() => commitSegment(segment)}
                      onChangeText={(text) => updateLocalSegment(segment.id, text)}
                      style={styles.segmentInput}
                      value={segment.text}
                    />
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>阶段性摘要</Text>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>智能问答</Text>
              <View style={styles.qaInputRow}>
                <TextInput
                  onChangeText={setQuestion}
                  onSubmitEditing={submitQuestion}
                  placeholder="基于当前转录提问"
                  placeholderTextColor="#8A94A6"
                  style={styles.qaInput}
                  value={question}
                />
                <Pressable accessibilityLabel="发送问题" onPress={submitQuestion} style={styles.iconButton}>
                  <Feather name="send" size={19} color="#FFFFFF" />
                </Pressable>
              </View>
              {qaItems.map((item, index) => (
                <View key={`${item.question}-${index}`} style={styles.qaItem}>
                  <Text style={styles.qaQuestion}>Q: {item.question}</Text>
                  <Text style={styles.summaryText}>A: {item.answer}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    gap: 18,
    padding: 18,
    paddingBottom: 32,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  eyebrow: {
    color: "#4B6B8F",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    color: "#18202F",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D7DDE8",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  statusPillOnline: {
    backgroundColor: "#E9F8F2",
    borderColor: "#97DAC0",
  },
  statusPillText: {
    color: "#687386",
    fontWeight: "700",
  },
  statusPillTextOnline: {
    color: "#126B4D",
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DFE5EE",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  label: {
    color: "#4E5A6B",
    fontSize: 13,
    fontWeight: "800",
  },
  connectRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    backgroundColor: "#FBFCFF",
    borderColor: "#CCD4DF",
    borderRadius: 8,
    borderWidth: 1,
    color: "#18202F",
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#1F6FEB",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  recordButton: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54,
  },
  recordButtonActive: {
    backgroundColor: "#C62837",
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  statusText: {
    color: "#596579",
    lineHeight: 22,
  },
  toolRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FBFCFF",
    borderColor: "#CCD4DF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: "#253149",
    fontWeight: "800",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DFE5EE",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  sectionTitle: {
    color: "#18202F",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: "#788396",
    lineHeight: 24,
  },
  segment: {
    backgroundColor: "#F7FAFF",
    borderLeftColor: "#1F6FEB",
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  segmentSpeaker: {
    color: "#4B6B8F",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  segmentText: {
    color: "#18202F",
    lineHeight: 24,
  },
  segmentInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DFE5EE",
    borderRadius: 6,
    borderWidth: 1,
    color: "#18202F",
    lineHeight: 24,
    minHeight: 70,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: "top",
  },
  summaryText: {
    color: "#273449",
    lineHeight: 24,
  },
  qaInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  qaInput: {
    backgroundColor: "#FBFCFF",
    borderColor: "#CCD4DF",
    borderRadius: 8,
    borderWidth: 1,
    color: "#18202F",
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  qaItem: {
    borderTopColor: "#E2E7F0",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  qaQuestion: {
    color: "#253149",
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 4,
  },
});
