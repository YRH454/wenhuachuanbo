"""Redact local filesystem paths from distributable snapshot metadata.

This works only on the repository's copied dist tree; it does not touch source
artwork or the original workspace. It leaves image bytes and cultural links intact.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
WINDOWS_ESCAPED = re.compile(r'(?<![A-Za-z0-9])[A-Za-z]:(?:\\\\[^"\\\r\n]*)+')
WINDOWS_PLAIN = re.compile(r'(?<![A-Za-z0-9])[A-Za-z]:(?:\\[^"\\\r\n]*)+')
WINDOWS_FORWARD = re.compile(r'(?<![A-Za-z0-9])[A-Za-z]:/(?:[^/"\r\n]*/)*[^/"\r\n]*')


def clean_string(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        name = re.split(r"[\\/]+", match.group(0))[-1]
        return "[本地路径已省略]/" + name

    for pattern in (WINDOWS_ESCAPED, WINDOWS_PLAIN, WINDOWS_FORWARD):
        text = pattern.sub(replace, text)
    return text


def clean_value(value):
    if isinstance(value, str):
        return clean_string(value)
    if isinstance(value, list):
        return [clean_value(item) for item in value]
    if isinstance(value, dict):
        return {key: clean_value(item) for key, item in value.items()}
    return value


def main() -> None:
    if not (DIST / "index.html").is_file():
        raise SystemExit("Expected a repository-local dist directory")
    changed_records = 0
    for path in DIST.rglob("*.txt"):
        original = path.read_text(encoding="utf-8-sig")
        redacted = clean_string(original)
        if redacted != original:
            path.write_text(redacted, encoding="utf-8", newline="\n")
            changed_records += 1

    for name in ("assembly-manifest.json", "city-backgrounds.json"):
        path = DIST / name
        data = clean_value(json.loads(path.read_text(encoding="utf-8-sig")))
        if name == "city-backgrounds.json":
            for city in data["cities"]:
                record = (DIST / city["promptSrc"]).resolve()
                if not record.is_relative_to(DIST.resolve()) or not record.is_file():
                    raise ValueError("Missing or unsafe background record")
                digest = hashlib.sha256(record.read_bytes()).hexdigest()
                if digest != city["recordSha256"]:
                    city.setdefault("originalRecordSha256", city["recordSha256"])
                    city["recordSha256"] = digest
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Sanitized {changed_records} record files and two manifests; image files unchanged.")


if __name__ == "__main__":
    main()
