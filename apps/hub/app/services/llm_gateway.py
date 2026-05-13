import json

import httpx

from app.core.config import settings
from app.models.events import AnalysisUpdate, QaResponse


class LlmGateway:
    def __init__(self, local_only: bool) -> None:
        self.local_only = local_only

    async def summarize_window(self, transcript: str) -> AnalysisUpdate:
        if self.local_only:
            return AnalysisUpdate(
                summary="本地模式已开启，云端摘要未发送。",
                actionItems=[],
                decisions=[],
            )

        return await self._structured_analysis(
            "请对这段会议转录生成阶段性摘要，提取行动项和已形成的决策。",
            transcript,
        )

    async def final_report(self, transcript: str) -> AnalysisUpdate:
        if not transcript.strip():
            return AnalysisUpdate(
                summary="当前会话还没有可分析的转录文本。",
                actionItems=[],
                decisions=[],
            )

        if self.local_only:
            return AnalysisUpdate(
                summary=f"本地模式下已汇总 {len(transcript)} 个字符。开启云端模式后会生成完整会议纪要。",
                actionItems=[
                    {"task": "配置云端 LLM API Key", "owner": "Hub", "due": None}
                ],
                decisions=["当前版本保持原始音频本地处理，仅使用脱敏文本进入分析链路。"],
            )

        return await self._structured_analysis(
            "请生成最终会议纪要。摘要要覆盖核心议题，行动项要包含任务、负责人、截止日期，决策要具体。",
            transcript,
        )

    async def answer_question(self, question: str, transcript: str) -> QaResponse:
        if not transcript.strip():
            answer = "当前还没有转录上下文，无法回答该问题。"
        elif self.local_only:
            answer = "本地模式下不会调用云端问答。当前已收到问题，后续可接入本地 RAG 或开启云端分析。"
        else:
            answer = await self._answer_with_context(question, transcript)

        return QaResponse(question=question, answer=answer)

    async def _structured_analysis(self, instruction: str, transcript: str) -> AnalysisUpdate:
        if not settings.cloud_llm_api_key:
            return AnalysisUpdate(
                summary="云端 LLM API Key 未配置，无法生成云端分析。",
                actionItems=[],
                decisions=[],
            )

        content = await self._chat(
            [
                {
                    "role": "system",
                    "content": (
                        "你是会议纪要分析助手。只返回 JSON，不要 Markdown。"
                        "JSON 格式：{\"summary\":\"...\",\"actionItems\":[{\"task\":\"...\",\"owner\":null,\"due\":null}],\"decisions\":[\"...\"]}。"
                    ),
                },
                {"role": "user", "content": f"{instruction}\n\n转录文本：\n{transcript}"},
            ]
        )
        try:
            payload = json.loads(content)
        except json.JSONDecodeError:
            return AnalysisUpdate(summary=content, actionItems=[], decisions=[])

        return AnalysisUpdate(
            summary=str(payload.get("summary", "")),
            actionItems=[
                {
                    "task": str(item.get("task", "")),
                    "owner": item.get("owner"),
                    "due": item.get("due"),
                }
                for item in payload.get("actionItems", [])
                if isinstance(item, dict)
            ],
            decisions=[str(item) for item in payload.get("decisions", [])],
        )

    async def _answer_with_context(self, question: str, transcript: str) -> str:
        if not settings.cloud_llm_api_key:
            return "云端 LLM API Key 未配置，无法回答该问题。"

        return await self._chat(
            [
                {
                    "role": "system",
                    "content": "你是会议问答助手。必须只基于给定转录回答；如果上下文不足，请明确说明。",
                },
                {"role": "user", "content": f"问题：{question}\n\n转录上下文：\n{transcript}"},
            ]
        )

    async def _chat(self, messages: list[dict[str, str]]) -> str:
        url = settings.cloud_llm_base_url.rstrip("/") + "/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.cloud_llm_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.cloud_llm_model,
            "messages": messages,
            "temperature": 0.2,
        }
        async with httpx.AsyncClient(timeout=settings.cloud_llm_timeout_seconds) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        return str(data["choices"][0]["message"]["content"]).strip()
