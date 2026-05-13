# Android 与 iOS 构建方案

## 1. 当前结论

本仓库可以生成 Android 与 iOS 双端应用代码。

- Android: 可在 Windows 上通过 Android Studio/SDK 本地构建。
- iOS: 可生成 iOS 工程，但本地编译和真机安装需要 macOS + Xcode，或使用 EAS Build 云构建。
- iPhone 真机安装需要 Apple ID 对应的开发者签名。普通“自签证书”不能直接替代 Apple 的开发者签名链。

## 2. 当前 Native App 范围

`apps/native` 是 Expo/React Native 双端采集器：

- Hub WebSocket 地址配置。
- 连接状态展示。
- 麦克风权限申请。
- 录音会话控制。
- Hub 事件接收。
- 实时转录与阶段性摘要展示。

当前版本为了先打通端到端链路，在录音期间发送 mock audio frames。原因是 Expo 托管层的录音 API 更偏向“录完得到文件”，不直接暴露低延迟 PCM 分片。后续需要把 `NativeAudioStreamer` 替换为原生模块：

- Android: `AudioRecord` 输出 PCM16 帧。
- iOS: `AVAudioEngine`/`AVAudioPCMBuffer` 输出 PCM16 帧。

## 3. 开发启动

```powershell
cd apps/native
npm install
npm run start
```

## 4. Android 真机

```powershell
cd apps/native
npm run android
```

要求：

- 安装 Android Studio。
- 配置 Android SDK。
- 手机开启开发者模式与 USB 调试。

## 5. iOS 真机

### 方案 A: macOS + Xcode

```bash
cd apps/native
npm run prebuild
npm run ios
```

然后在 Xcode 中选择你的 Team，把 `com.aiminutes.collector` 签到你的 iPhone。

### 方案 B: EAS Build

```powershell
cd apps/native
npx eas-cli build --platform ios --profile development
```

EAS 会引导登录 Apple ID、注册设备、创建 development provisioning profile。

