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
    # Guides retain their source/provenance records as Markdown; those records
    # may also contain absolute paths on the machine where artwork was made.
    record_paths = list(DIST.rglob("*.txt"))
    record_paths.extend((DIST / "guides").glob("*/records/*.md"))
    for path in record_paths:
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
    # The city guide records carry their own content digest. Recompute it for
    # the redacted repository copy while preserving the source-record digest.
    for path in (DIST / "guides").glob("*/*.json"):
        data = clean_value(json.loads(path.read_text(encoding="utf-8-sig")))
        for media in data.get("media", []):
            if not isinstance(media, dict) or not media.get("record") or not media.get("recordSha256"):
                continue
            record = (path.parent / media["record"]).resolve()
            if not record.is_relative_to(path.parent.resolve()) or not record.is_file():
                raise ValueError("Missing or unsafe city guide record")
            digest = hashlib.sha256(record.read_bytes()).hexdigest()
            if digest != media["recordSha256"]:
                media.setdefault("originalRecordSha256", media["recordSha256"])
                media["recordSha256"] = digest
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    # A public repository must not serve portraits explicitly marked for
    # internal review with no public-reuse permission. Their source images
    # remain in the private workspace; the public snapshot uses missing state.
    omitted_portraits = 0
    for path in (DIST / "people-culture-v1" / "data").glob("*.json"):
        data = clean_value(json.loads(path.read_text(encoding="utf-8-sig")))
        changed = False
        for person in data.get("people", []):
            portrait = person.get("portrait", {})
            if portrait.get("kind") == "candidate" and portrait.get("publicReuse") is False:
                portrait["kind"] = "missing"
                portrait["src"] = None
                changed = True
                omitted_portraits += 1
        if changed:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Sanitized {changed_records} record files, manifests and guide record hashes; omitted {omitted_portraits} unapproved portrait references.")


if __name__ == "__main__":
    main()
