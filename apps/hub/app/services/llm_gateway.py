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

        return AnalysisUpdate(
            summary=f"收到 {len(transcript)} 个字符，等待接入云端 LLM。",
            actionItems=[],
            decisions=[],
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
                summary=f"本地模式下已汇总 {len(transcript)} 个字符。接入云端 LLM 后会生成完整会议纪要。",
                actionItems=[
                    {"task": "接入云端 LLM 生成结构化纪要", "owner": "Hub", "due": None}
                ],
                decisions=["当前版本保持原始音频本地处理，仅使用脱敏文本进入分析链路。"],
            )

        return AnalysisUpdate(
            summary=f"已准备 {len(transcript)} 个字符用于云端最终报告生成。",
            actionItems=[],
            decisions=[],
        )

    async def answer_question(self, question: str, transcript: str) -> QaResponse:
        if not transcript.strip():
            answer = "当前还没有转录上下文，无法回答该问题。"
        elif self.local_only:
            answer = "本地模式下不会调用云端问答。当前已收到问题，后续可接入本地 RAG 或开启云端分析。"
        else:
            answer = f"已收到问题：{question}。后续会基于 {len(transcript)} 个字符的上下文调用云端 RAG。"

        return QaResponse(question=question, answer=answer)
