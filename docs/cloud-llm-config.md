# Cloud LLM 配置

Hub 默认运行在本地模式，不会把文本发到云端：

```env
LOCAL_ONLY=true
```

如需启用云端摘要、最终纪要和问答，创建 `apps/hub/.env`：

```env
LOCAL_ONLY=false
CLOUD_LLM_BASE_URL=https://api.openai.com/v1
CLOUD_LLM_API_KEY=你的 API Key
CLOUD_LLM_MODEL=gpt-4o-mini
CLOUD_LLM_TIMEOUT_SECONDS=30
```

该实现使用 OpenAI-compatible Chat Completions 接口：

```text
POST {CLOUD_LLM_BASE_URL}/chat/completions
```

因此也可以接入兼容该接口的私有模型网关。

隐私链路：

1. Hub 接收音频。
2. 本地生成转录文本。
3. `Redactor` 先对文本做手机号、邮箱、身份证号、自定义词遮蔽。
4. 只有脱敏后的文本会发送到 `CLOUD_LLM_BASE_URL`。
