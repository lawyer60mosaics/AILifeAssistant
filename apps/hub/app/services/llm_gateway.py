from app.models.events import AnalysisUpdate


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

