# PRD 实现状态

## 已完成

- PC Hub FastAPI 服务骨架。
- WebSocket 双向通信协议。
- Web 浏览器 Collector。
- Expo/React Native 双端 Collector 骨架。
- GitHub Actions Android APK、iOS simulator、iOS unsigned device artifact 构建。
- 音频帧接收与 mock 转录链路。
- 文本脱敏基础规则：手机号、邮箱、身份证号、自定义词。
- 会话内存/JSON 存储。
- 转录片段编辑事件与全端广播。
- 阶段性分析事件与手动最终分析 API。
- 问答请求/响应事件骨架。
- Markdown/JSON 导出 API。
- Web 与 Native 端编辑、问答、手动分析、导出入口。

## 部分完成

- 移动端录音：当前会申请麦克风权限并启动录音会话，但实时推给 Hub 的仍是 mock frame。
- 云端 LLM：已接 OpenAI-compatible Chat Completions 网关，可通过环境变量配置；默认本地模式不开启云端请求。
- RAG：已预留问答事件与上下文入口，尚未接 embedding/vector store。

## 未完成

- Faster-Whisper 真实流式 STT。
- Android `AudioRecord` PCM16 实时推流原生模块。
- iOS `AVAudioEngine` PCM16 实时推流原生模块。
- 发言人区分/声纹聚类。
- mDNS 局域网自动发现。
- 断线重连与音频补发队列。
- API Key 本地加密数据库。
- PDF 导出。
- Notion/Obsidian 同步。
- Prompt 插件系统。
- 多端富文本编辑 UI 与冲突解决。

## 下一步建议

1. 接 Android/iOS 原生 PCM 推流模块。
2. 接 Faster-Whisper 本地转录。
3. 接云端 LLM provider 与隐私模式开关。
4. 增加 SQLite/SQLCipher 持久化。
5. 增加端到端自动化测试。
