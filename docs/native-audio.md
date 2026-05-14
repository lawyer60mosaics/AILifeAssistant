# Native 音频输入

## Android

Android 已接入原生 `AudioRecord`：

- 采样率：16 kHz
- 声道：mono
- 格式：PCM16 little-endian
- 音源：`VOICE_RECOGNITION`

数据流：

1. React Native 申请麦克风权限。
2. `AiMinutesAudioModule` 启动 `AudioRecord`。
3. 原生模块通过 `DeviceEventEmitter` 发送 base64 PCM 分片。
4. JS 端解码为 `ArrayBuffer`。
5. `HubClient.sendAudio` 通过 WebSocket 发送二进制帧到 Hub。

GitHub Actions 已验证 Android debug APK 可构建，产物名：

```text
ai-minutes-android-debug-apk
```

如果在国内网络本地构建遇到 `dl.google.com` TLS 握手失败，可使用项目内镜像 init script：

```powershell
cd apps/native/android
.\gradlew.bat :app:assembleDebug --no-daemon --init-script gradle/local-mirrors.init.gradle
```

## iOS

iOS 仍使用 `expo-av` fallback 来维持录音会话和 mock frame。下一步需要实现：

- `AVAudioEngine`
- `AVAudioPCMBuffer`
- PCM16 mono 16 kHz 转换
- React Native bridge event emitter
