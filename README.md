# AI Minutes

AI Minutes is a端-边-云协同的实时语音转录与分析系统骨架。

当前仓库先实现 MVP 数据链路：

- `apps/mobile`: 浏览器版移动采集器，用手机浏览器即可采集麦克风并通过 WebSocket 推送音频帧。
- `apps/hub`: PC Hub 服务，负责会话管理、音频流接收、转录事件广播、脱敏与云端分析调度接口。
- `docs`: 技术方案、协议设计与开发路线。

## Quick Start

### Hub

```powershell
cd apps/hub
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8765
```

If Python is not installed on PATH but `uv` is available:

```powershell
cd apps/hub
uv venv .venv
uv pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8765
```

### Mobile Collector

```powershell
cd apps/mobile
npm install
npm run dev -- --host 0.0.0.0
```

Open the mobile dev URL from a phone on the same LAN, set the Hub URL to:

```text
ws://<PC_LAN_IP>:8765/ws/client
```

## Current MVP Behavior

The Hub receives binary audio frames and emits mock transcript segments every few frames. This keeps the product loop testable before wiring Faster-Whisper, diarization, and cloud LLM providers.

## Native Collector

`apps/native` is an Expo/React Native collector for Android and iOS.

```powershell
cd apps/native
npm install
npm run start
```

Android can be generated and run locally on Windows when Android Studio/SDK is installed:

```powershell
npm run android
```

iOS project generation/build requires macOS + Xcode or EAS Build. See [docs/mobile-build.md](docs/mobile-build.md).

GitHub Actions builds are configured for Android APK, iOS simulator app, and unsigned iOS device artifacts for later re-signing. See [docs/github-actions-build.md](docs/github-actions-build.md).

Cloud LLM analysis is disabled by default. See [docs/cloud-llm-config.md](docs/cloud-llm-config.md) to enable an OpenAI-compatible provider.

LAN discovery is available through Hub mDNS publishing and Native Collector subnet scan. See [docs/discovery.md](docs/discovery.md).
