# GitHub Actions 构建说明

## 1. 已配置的工作流

### Native Mobile Build

文件：`.github/workflows/native-build.yml`

触发方式：

- push 到 `main`、`master`、`codex/**`
- pull request 到 `main`、`master`
- 手动 `workflow_dispatch`

产物：

- Android debug APK: `ai-minutes-android-debug-apk`
- iOS simulator app: `ai-minutes-ios-simulator-app`

说明：

- Android APK 可以直接安装到 Android 测试机。
- iOS simulator app 只能用于模拟器，不能安装到 iPhone 真机。

### Native iOS Unsigned Device Build

文件：`.github/workflows/native-ios-unsigned.yml`

触发方式：

- 手动 `workflow_dispatch`

产物：

- `AI-Minutes-Unsigned.xcarchive.zip`
- `AI-Minutes-Unsigned-Payload.zip`

说明：

- 该工作流不需要任何 Apple 证书或 GitHub Secrets。
- 产物不能直接安装到 iPhone。
- 下载 `AI-Minutes-Unsigned-Payload.zip` 后，可在你自己的签名工具中使用开发者证书和描述文件重签。
- 你的证书、密码、描述文件都不需要上传到 GitHub。

## 2. 后续重签注意事项

重签时需要保证：

- 证书有效且未过期。
- 描述文件包含你的 iPhone 设备 UDID。
- 描述文件的 App ID/Bundle ID 与 `com.aiminutes.collector` 匹配，或签名工具能同步修改 Bundle ID 与 entitlement。
- 重签时使用真机包，不要使用 `ios-simulator` 产物。

## 3. 推送到 GitHub

```powershell
git remote add origin https://github.com/lawyer60mosaics/AILifeAssistant.git
git add .
git commit -m "Add native mobile GitHub Actions builds"
git push -u origin master
```

推送后，在 GitHub 仓库的 `Actions` 页面查看构建进度与产物。
