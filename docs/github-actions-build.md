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

### Native iOS Signed Build

文件：`.github/workflows/native-ios-signed.yml`

触发方式：

- 手动 `workflow_dispatch`

该工作流默认不会运行，需要在 GitHub 仓库变量中设置：

```text
IOS_SIGNED_BUILD_ENABLED=true
```

## 2. iOS 真机签名 Secrets

iPhone 真机安装必须使用 Apple 开发者签名链。需要在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 配置：

Secrets:

```text
IOS_CERTIFICATE_BASE64
IOS_CERTIFICATE_PASSWORD
IOS_PROVISIONING_PROFILE_BASE64
IOS_KEYCHAIN_PASSWORD
IOS_DEVELOPMENT_TEAM
IOS_PROVISIONING_PROFILE_NAME
```

Variables:

```text
IOS_SIGNED_BUILD_ENABLED=true
IOS_EXPORT_METHOD=development
```

其中：

- `IOS_CERTIFICATE_BASE64`: `.p12` 证书的 base64 内容。
- `IOS_PROVISIONING_PROFILE_BASE64`: `.mobileprovision` 文件的 base64 内容。
- `IOS_DEVELOPMENT_TEAM`: Apple Team ID。
- `IOS_PROVISIONING_PROFILE_NAME`: provisioning profile 的显示名称。
- `IOS_EXPORT_METHOD`: 个人真机测试通常用 `development`。

Windows PowerShell 转 base64 示例：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.p12")) | Set-Content certificate.p12.base64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("profile.mobileprovision")) | Set-Content profile.mobileprovision.base64
```

## 3. 推送到 GitHub

```powershell
git remote add origin https://github.com/lawyer60mosaics/AILifeAssistant.git
git add .
git commit -m "Add native mobile GitHub Actions builds"
git push -u origin master
```

推送后，在 GitHub 仓库的 `Actions` 页面查看构建进度与产物。

