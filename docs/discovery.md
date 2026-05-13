# 局域网发现

Hub 启动时会发布 mDNS 服务：

```text
_ai-minutes._tcp.local.
```

如果当前系统或网络环境阻止 mDNS 注册，Hub 不会启动失败；`/discovery` 会返回 `mdnsEnabled: false`，客户端仍可使用局域网扫描发现 Hub。

同时提供 HTTP 发现信息：

```text
GET /discovery
```

返回示例：

```json
{
  "name": "AI Minutes Hub",
  "host": "192.168.1.10",
  "port": 8765,
  "wsUrl": "ws://192.168.1.10:8765/ws/client",
  "healthUrl": "http://192.168.1.10:8765/health",
  "mdnsEnabled": true,
  "serviceType": "_ai-minutes._tcp.local."
}
```

Native Collector 当前使用局域网扫描作为客户端发现兜底：

1. 读取手机当前 IP。
2. 扫描同一 `/24` 网段的 `http://<host>:8765/health`。
3. 找到 `{"status":"ok"}` 后自动填入 `ws://<host>:8765/ws/client`。

后续可以替换为完整 Bonjour/mDNS 客户端库。
