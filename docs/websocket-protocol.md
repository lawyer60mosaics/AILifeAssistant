# WebSocket 协议设计

Hub 地址：

```text
ws://<hub-host>:8765/ws/client
```

## 1. 消息类型

文本消息使用 JSON，音频帧使用 WebSocket binary frame。

### client_hello

```json
{
  "type": "client_hello",
  "clientId": "mobile-uuid",
  "role": "collector",
  "audio": {
    "mimeType": "audio/webm;codecs=opus",
    "sampleRate": 48000,
    "channels": 1
  }
}
```

### session_state

```json
{
  "type": "session_state",
  "sessionId": "session-uuid",
  "privacyMode": "local_only",
  "connectedClients": 1
}
```

### transcript_delta

```json
{
  "type": "transcript_delta",
  "segmentId": "seg-001",
  "speaker": "Speaker A",
  "text": "大家好，我们开始今天的会议。",
  "startMs": 0,
  "endMs": 2200,
  "isFinal": true
}
```

### analysis_update

```json
{
  "type": "analysis_update",
  "summary": "本阶段主要讨论了产品 MVP 范围。",
  "actionItems": [
    {
      "task": "整理 WebSocket 协议",
      "owner": "Speaker A",
      "due": null
    }
  ],
  "decisions": ["MVP 先使用浏览器采集器验证链路。"]
}
```

### error

```json
{
  "type": "error",
  "code": "INVALID_MESSAGE",
  "message": "Unsupported message type."
}
```

## 2. 二进制音频帧

Web Collector 直接发送 `MediaRecorder` 产生的 `Blob` 字节。Native Android Collector 发送 PCM16 little-endian 二进制帧。Hub 只统计帧并交给转录器接口。

生产实现建议：

- PCM16 mono 16 kHz。
- 每帧 100-250 ms。
- 每 20-30 秒作为 STT 上下文窗口。

## 3. 可靠性

- Client 侧维护待发送队列，断线重连后继续发送。
- Hub 每 10 秒发送应用层 `ping`。
- Client 发现 30 秒无消息则主动重连。
