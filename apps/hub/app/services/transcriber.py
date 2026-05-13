from app.models.events import TranscriptDelta


class Transcriber:
    async def accept_audio(self, frame: bytes) -> TranscriptDelta | None:
        raise NotImplementedError


class MockTranscriber(Transcriber):
    def __init__(self) -> None:
        self.frame_count = 0
        self.segment_count = 0
        self.samples = [
            "已收到音频流，实时转录链路正常。",
            "这里会接入 Faster-Whisper 生成真实文本。",
            "后续会在本地完成发言人区分与敏感信息脱敏。",
            "云端分析模块会按时间窗口生成阶段性摘要。",
        ]

    async def accept_audio(self, frame: bytes) -> TranscriptDelta | None:
        self.frame_count += 1
        if self.frame_count % 6 != 0:
            return None

        self.segment_count += 1
        start_ms = (self.segment_count - 1) * 1500
        end_ms = self.segment_count * 1500
        text = self.samples[(self.segment_count - 1) % len(self.samples)]

        return TranscriptDelta(
            segmentId=f"seg-{self.segment_count:04d}",
            speaker="Speaker A",
            text=text,
            startMs=start_ms,
            endMs=end_ms,
            isFinal=True,
        )

