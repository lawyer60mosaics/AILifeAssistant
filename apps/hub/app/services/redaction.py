import re


class Redactor:
    def __init__(self, custom_terms: list[str] | None = None) -> None:
        self.custom_terms = [term for term in custom_terms or [] if term]
        self.patterns: list[tuple[re.Pattern[str], str]] = [
            (re.compile(r"\b1[3-9]\d{9}\b"), "[PHONE]"),
            (re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b"), "[EMAIL]"),
            (re.compile(r"\b\d{17}[\dXx]\b"), "[ID_CARD]"),
        ]

    def clean(self, text: str) -> str:
        value = text
        for pattern, replacement in self.patterns:
            value = pattern.sub(replacement, value)
        for term in self.custom_terms:
            value = value.replace(term, "[REDACTED]")
        return value

