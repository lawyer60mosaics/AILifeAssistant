import json
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from app.models.events import AnalysisUpdate, QaResponse, TranscriptDelta


@dataclass
class TranscriptRecord:
    segment_id: str
    speaker: str
    text: str
    start_ms: int
    end_ms: int
    is_final: bool


@dataclass
class SessionStore:
    session_id: str
    data_dir: Path = Path("data")
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    transcript: list[TranscriptRecord] = field(default_factory=list)
    analyses: list[dict] = field(default_factory=list)
    qa: list[dict] = field(default_factory=list)

    @property
    def path(self) -> Path:
        return self.data_dir / f"{self.session_id}.json"

    def append_segment(self, segment: TranscriptDelta) -> None:
        self.transcript.append(
            TranscriptRecord(
                segment_id=segment.segment_id,
                speaker=segment.speaker,
                text=segment.text,
                start_ms=segment.start_ms,
                end_ms=segment.end_ms,
                is_final=segment.is_final,
            )
        )
        self.save()

    def edit_segment(self, segment_id: str, text: str) -> bool:
        for segment in self.transcript:
            if segment.segment_id == segment_id:
                segment.text = text
                self.save()
                return True
        return False

    def append_analysis(self, analysis: AnalysisUpdate) -> None:
        self.analyses.append(analysis.model_dump(by_alias=True))
        self.save()

    def append_qa(self, response: QaResponse) -> None:
        self.qa.append(response.model_dump())
        self.save()

    def full_text(self) -> str:
        return "\n".join(f"{segment.speaker}: {segment.text}" for segment in self.transcript)

    def to_dict(self) -> dict:
        return {
            "sessionId": self.session_id,
            "createdAt": self.created_at,
            "transcript": [asdict(segment) for segment in self.transcript],
            "analyses": self.analyses,
            "qa": self.qa,
        }

    def to_markdown(self) -> str:
        lines = [
            "# AI Minutes Meeting Report",
            "",
            f"- Session ID: `{self.session_id}`",
            f"- Created At: `{self.created_at}`",
            "",
            "## Transcript",
            "",
        ]
        for segment in self.transcript:
            lines.append(f"- **{segment.speaker}** [{segment.start_ms}-{segment.end_ms}ms]: {segment.text}")

        lines.extend(["", "## Analysis", ""])
        if self.analyses:
            for index, analysis in enumerate(self.analyses, start=1):
                lines.append(f"### Summary {index}")
                lines.append("")
                lines.append(analysis.get("summary", ""))
                action_items = analysis.get("actionItems", [])
                if action_items:
                    lines.extend(["", "#### Action Items", ""])
                    for item in action_items:
                        owner = item.get("owner") or "Unassigned"
                        due = item.get("due") or "No due date"
                        lines.append(f"- {item.get('task')} | {owner} | {due}")
                decisions = analysis.get("decisions", [])
                if decisions:
                    lines.extend(["", "#### Decisions", ""])
                    lines.extend(f"- {decision}" for decision in decisions)
                lines.append("")
        else:
            lines.append("No analysis generated yet.")

        lines.extend(["", "## Q&A", ""])
        if self.qa:
            for item in self.qa:
                lines.append(f"- **Q:** {item.get('question')}")
                lines.append(f"  **A:** {item.get('answer')}")
        else:
            lines.append("No questions asked yet.")

        return "\n".join(lines).strip() + "\n"

    def save(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(self.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

