"""Normalize retained Bilibili metadata and validate local motion video profiles."""
from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import re
from urllib.parse import parse_qs, urlsplit

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = "docs/schemas/motion-video-profile.schema.json"
TAXONOMY = "docs/schemas/motion-tags.v1.json"
EXAMPLE = "docs/examples/motion-video-profile.example.json"
HASHTAG = re.compile(r"(?<![\w#＃])[#＃]([^\W_][\w-]{0,79})", re.UNICODE)
BILI_PATH = re.compile(r"/video/(BV[A-Za-z0-9]{10}|av[0-9]+)/?")


def need(condition, message):
    if not condition:
        raise ValueError(message)


def _unique(pairs):
    result = {}
    for key, value in pairs:
        need(key not in result, "duplicate JSON key")
        result[key] = value
    return result


def _number(raw):
    number = float(raw)
    need(math.isfinite(number), "non-finite JSON number")
    return number


def load_json(path: Path) -> dict:
    with path.open("rb") as f:
        data = f.read((8 << 20) + 1)
    need(len(data) <= 8 << 20, "JSON exceeds 8 MiB admission bound")
    doc = json.loads(data.decode("utf-8-sig"), object_pairs_hook=_unique,
                     parse_float=_number, parse_constant=_number)
    need(isinstance(doc, dict), "expected a JSON object")
    return doc


def _text(value):
    need(isinstance(value, str), "expected text")
    return value


def _id(value):
    need(type(value) in (int, str) and value != "", "expected identifier")
    return str(value)


def _counter(value):
    need(type(value) is int and value >= 0, "expected nonnegative integer")
    return value


def _strings(value):
    need(isinstance(value, list) and all(isinstance(x, str) and x for x in value), "expected text list")
    return value.copy()


def _keys(value):
    need(isinstance(value, dict), "expected a language map")
    return _strings(list(value))


def _day(value):
    need(isinstance(value, str) and re.fullmatch(r"[0-9]{8}", value), "expected YYYYMMDD")
    return date(int(value[:4]), int(value[4:6]), int(value[6:])).isoformat()


def _published(value):
    need(type(value) in (int, float) and math.isfinite(value), "expected epoch timestamp")
    return datetime.fromtimestamp(value, timezone.utc).isoformat()


def _milliseconds(value):
    need(type(value) in (int, float) and math.isfinite(value) and value >= 0, "expected duration")
    return int((Decimal(str(value)) * 1000).to_integral_value(rounding=ROUND_HALF_UP))


# Preserve raw strings and raw tag order; only time, count, ID types and language-map keys are normalized.
FIELD_MAP = {
    "title": ("title", _text), "description": ("description", _text),
    "creator_name": ("uploader", _text), "creator_id": ("uploader_id", _id),
    "published_at": ("timestamp", _published), "upload_date": ("upload_date", _day),
    "categories": ("categories", _strings), "native_tags": ("tags", _strings),
    "platform_hashtags": ("hashtags", _strings),
    "subtitle_languages": ("subtitles", _keys), "automatic_caption_languages": ("automatic_captions", _keys),
    "language": ("language", _text), "track": ("track", _text), "artist": ("artist", _text),
    "declared_duration_ms": ("duration", _milliseconds), "view_count": ("view_count", _counter),
    "like_count": ("like_count", _counter), "comment_count": ("comment_count", _counter),
    "repost_count": ("repost_count", _counter),
}


def project_bilibili_fields(snapshot: dict, evidence_id: str) -> dict:
    def field(state, value, keys, origin="snapshot"):
        return {"state": state, "value": value, "origin": origin, "evidence_id": evidence_id,
                "source_pointers": ["/" + k for k in keys]}

    result = {}
    for key, (raw, convert) in FIELD_MAP.items():
        value = snapshot.get(raw)
        if value is None:
            state = "not_obtained"
        elif value == "" or value == []:
            # These are distinct from null, but only legal for the corresponding field type.
            state = "empty" if (convert is _text and value == "") or (convert is _strings and value == []) else "invalid"
            if state == "invalid":
                value = None
        else:
            try:
                value = convert(value)
                state = "empty" if value == [] else "present"
            except (ValueError, TypeError, OverflowError, OSError, InvalidOperation):
                value, state = None, "invalid"
        result[key] = field(state, value, [raw])
    texts = [snapshot[k] for k in ("title", "description") if isinstance(snapshot.get(k), str)]
    tags = list(dict.fromkeys(m.group(1) for text in texts for m in HASHTAG.finditer(text)))
    result["text_hashtags"] = field("present" if tags else "empty" if texts else "not_obtained",
                                   tags if texts else None, ["title", "description"], "derived_from_snapshot")
    return result


def _bili_page(value):
    if not isinstance(value, str):
        return None
    parsed = urlsplit(value)
    if parsed.scheme not in ("https", "http") or parsed.netloc.lower() not in ("www.bilibili.com", "bilibili.com", "m.bilibili.com"):
        return None
    work = BILI_PATH.fullmatch(parsed.path)
    if not work:
        return None
    vals = parse_qs(parsed.query, keep_blank_values=True, max_num_fields=256).get("p", [])
    need(not vals or (len(vals) == 1 and re.fullmatch(r"[1-9][0-9]{0,5}", vals[0])), "ambiguous Bilibili part")
    return work.group(1), int(vals[0]) if vals else None


def project_bilibili_identity(snapshot: dict, download: dict) -> dict:
    page = _bili_page(snapshot.get("webpage_url"))
    requested = _bili_page(download.get("source_url"))
    need(page is not None, "Bilibili snapshot has no verified work page")
    work, part = page
    raw_id = snapshot.get("id")
    need(isinstance(raw_id, str), "Bilibili snapshot has no video identifier")
    match = re.fullmatch(re.escape(work) + r"(?:_p([1-9][0-9]{0,5}))?", raw_id)
    need(match is not None, "Bilibili snapshot ID does not bind to the work")
    need(requested is None or requested[0] == work, "Bilibili requested and captured works disagree")
    indexed = (match[1], snapshot.get("page"), snapshot.get("playlist_index"), requested[1] if requested else None, part)
    parts = set()
    for v in indexed:
        if v is not None:
            need(type(v) in (int, str) and re.fullmatch(r"[1-9][0-9]{0,5}", str(v)), "invalid Bilibili part index")
            parts.add(int(v))
    need(len(parts) <= 1, "conflicting Bilibili part evidence")
    chosen = next(iter(parts), None)
    cid = snapshot.get("cid")
    need(cid is None or type(cid) in (int, str) and str(cid).isdigit() and int(cid) > 0, "invalid platform media ID")
    return {"platform": "bilibili", "work_id": work,
            "selection_kind": "explicit_part" if chosen else "work_page_default",
            "selected_part": chosen, "platform_media_id": str(cid) if cid is not None else None,
            "work_url": f"https://www.bilibili.com/video/{work}/" + (f"?p={chosen}" if chosen else "")}


def _safe_path(root, label):
    rel = PurePosixPath(label)
    need(not rel.is_absolute() and rel.as_posix() == label and all(
        x not in (".", "..") and not x.endswith((".", " ")) and not any(ord(c) < 32 or c in "\\:" for c in x)
        for x in rel.parts), "noncanonical artifact path")
    path = (root / label).resolve(strict=True)
    need(path.is_relative_to(root) and path.is_file(), "artifact escapes the project or is not a file")
    return path


def _pointer(doc, pointer):
    if pointer is None:
        return doc
    try:
        for step in pointer.split("/")[1:]:
            key = step.replace("~1", "/").replace("~0", "~")
            if isinstance(doc, list):
                need(re.fullmatch(r"0|[1-9][0-9]*", key), "invalid array pointer")
                doc = doc[int(key)]
            else:
                doc = doc[key]
        return doc
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("evidence JSON locator does not resolve") from exc


def validate_profile(profile: dict, root: Path = ROOT, verify_assets: bool = False) -> dict:
    root = root.resolve()
    schema = load_json(root / SCHEMA)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=Draft202012Validator.FORMAT_CHECKER)
    err = next(validator.iter_errors(profile), None)
    if err is not None:
        loc = "/".join(map(str, err.absolute_path))
        raise ValueError(f"schema violation at /{loc}: {err.validator}")
    vocabulary = load_json(root / TAXONOMY)
    need(profile["taxonomy_version"] == vocabulary["taxonomy_version"], "taxonomy version mismatch")
    tags = {row["id"]: row for row in vocabulary["tags"]}
    need(len(tags) == len(vocabulary["tags"]) and set(vocabulary["facets"]) == {row["facet"] for row in tags.values()}, "invalid taxonomy inventory")
    source, renditions = profile["source"], profile["renditions"]
    assets = [source, *renditions]
    source_hash = source["media"]["asset"]["sha256"]
    hashes = {r["media"]["asset"]["sha256"]: r["media"] for r in assets}
    for row in assets:
        need(row["media"] == hashes[row["media"]["asset"]["sha256"]], "identical hash declares conflicting media")
    need(len(hashes) == len(assets), "duplicate media digest within this profile")
    keys = [(r["variant"], r["attempt_id"]) for r in renditions]
    need(len(keys) == len(set(keys)), "duplicate rendition attempt")
    # jsonschema's date-time format support is optional. Check the calendar
    # with the standard library after the schema has checked the syntax.
    for i, row in enumerate(renditions):
        clock = row["retrieved_at"]
        if clock is not None:
            try:
                datetime.fromisoformat(clock.upper().replace("Z", "+00:00"))
            except ValueError as exc:
                raise ValueError(f"schema violation at /renditions/{i}/retrieved_at: date-time") from exc
    need(all(r["source_sha256"] == source_hash and r["media"]["asset"]["sha256"] != source_hash for r in renditions), "rendition is not bound to this source")
    index = {e["id"]: e for e in profile["evidence"]}
    need(len(index) == len(profile["evidence"]), "duplicate evidence ID")
    for e in index.values():
        media = hashes.get(e["media_sha256"])
        need(media is not None, "evidence references an unknown media digest")
        ts = e["sample_times_ms"]
        need(ts == sorted(ts) and all(t < (media["video"]["duration_ms"] or media["duration_ms"]) for t in ts), "unordered or out-of-range evidence samples")
        if e["kind"] in ("frame_samples", "visual_comparison"):
            need(bool(ts), "visual sample evidence needs its observation times")

    def evidence(ids, permitted, kinds=None):
        found = []
        for key in ids:
            e = index.get(key)
            need(e is not None and e["media_sha256"] in permitted, f"missing or cross-media evidence: {key}")
            need(kinds is None or e["kind"] in kinds, f"wrong evidence kind: {key}")
            found.append(e)
        return found

    ss = {source_hash}
    evidence([source["capture"]["snapshot_evidence_id"]], ss, {"platform_snapshot"})
    evidence([source["capture"]["download_evidence_id"]], ss, {"download_record"})
    for k, f in source["platform_fields"].items():
        need(f["evidence_id"] == source["capture"]["snapshot_evidence_id"], f"platform field uses a different snapshot: {k}")
    evidence(source["routing"]["evidence_ids"], ss)
    if source["routing"]["status"] != "not_available":
        need(bool(source["routing"]["evidence_ids"]), "routing assertion has no evidence")
    pulse = source["pulse"]
    if pulse["evidence_id"]:
        evidence([pulse["evidence_id"]], ss, {"audio_analysis"})

    for i, row in enumerate(assets):
        media, obs, signal = row["media"], row["observations"], row["audio_signal"]
        own = {media["asset"]["sha256"]}
        end = media["video"]["duration_ms"] or media["duration_ms"]
        evidence([media["probe_evidence_id"]], own, {"media_probe"})
        if signal:
            evidence([signal["evidence_id"]], own, {"audio_analysis"})
            need(media["audio"] is not None and signal["quiet_windows"] <= signal["complete_windows"] and abs(
                signal["analyzed_duration_ms"] - signal["samples"] * 1000 / signal["analysis_sample_rate_hz"]) < 1,
                 "inconsistent audio signal statistics")
        need(set(obs["facets"]) == set(vocabulary["facets"]), "facet coverage mismatch")
        for f in obs["facets"].values():
            evidence(f["evidence_ids"], own)
            if f["status"] in ("sampled_review", "signal_measured"):
                need(bool(f["evidence_ids"]), "covered facet has no evidence")
        seen = set()
        for label in obs["labels"]:
            tag = tags.get(label["tag_id"])
            need(tag is not None, f"unknown taxonomy tag: {label['tag_id']}")
            f = obs["facets"][tag["facet"]]
            need(f["status"] not in ("not_run", "not_applicable") and (f["status"] != "insufficient_evidence" or label["state"] == "candidate"), "label contradicts its facet coverage")
            performer = label["performer_ref"]
            need(performer is None or obs["performer_count"] is not None and int(performer.rsplit("-", 1)[-1]) <= obs["performer_count"], "unknown performer reference")
            bound = evidence(label["evidence_ids"], own)
            if label["state"] != "candidate":
                allowed = {"frame_samples", "visual_comparison", "manual_observation", "camera_analysis", "ocr"}
                if tag["facet"] == "framing":
                    allowed.add("media_probe")
                if tag["facet"] == "audio":
                    allowed = {"audio_analysis", "media_probe", "asr", "manual_observation"}
                need(any(e["kind"] in allowed for e in bound), "label has no direct media evidence")
            samples = {t for e in bound for t in e["sample_times_ms"]}
            extent = label["extent"]
            signature = (label["tag_id"], performer, json.dumps(extent, sort_keys=True))
            need(signature not in seen, "duplicate label and extent")
            seen.add(signature)
            if extent["kind"] == "sample_points":
                times = extent["times_ms"]
                need(times == sorted(times) and set(times) <= samples, "label uses unsupported observation times")
            elif extent["kind"] == "estimated_interval":
                a, z = extent["start_ms"], extent["end_ms"]
                need(a < z <= end and extent["resolution_ms"] <= end and any(a <= t < z for t in samples), "invalid or unsupported label interval")
        if i:
            evidence([row["run_evidence_id"]], own, {"run_record"})
            evidence([row["delivery_evidence_id"]], own, {"delivery_receipt"})
            acceptance = row["acceptance"]
            evidence(acceptance["evidence_ids"], own, {"review_record"})
            need(acceptance["status"] == "not_recorded" or bool(acceptance["evidence_ids"]), "acceptance state has no review record")
            alignment = row["audio_alignment_to_source"]
            if alignment:
                evidence([alignment["evidence_id"]], own, {"audio_analysis"})
                need(abs(alignment["output_delay_ms"]) <= alignment["search_max_offset_ms"] + 1 and alignment["compared_ms"] <= min(source["media"]["duration_ms"], media["duration_ms"]) + 50, "audio alignment exceeds search or duration")
            for dimension, c in row["comparison"].items():
                inputs = evidence(c["evidence_ids"], own | ss)
                if c["status"] in ("sampled_correspondence", "sampled_difference"):
                    points = {digest: {t for e in inputs if e["media_sha256"] == digest
                                       and e["kind"] in ("frame_samples", "visual_comparison")
                                       for t in e["sample_times_ms"]} for digest in own | ss}
                    need(bool(set.intersection(*points.values())), "visual comparison needs shared nominal sample times for both media")
                if c["status"] == "signal_similarity":
                    need(dimension == "audio" and alignment is not None and alignment["evidence_id"] in c["evidence_ids"],
                         "audio comparison claims absent or unrelated alignment data")
                    need({e["media_sha256"] for e in inputs if e["kind"] == "audio_analysis"} == own | ss,
                         "audio comparison needs measurements for both media")

    count = _verify_files(profile, root, index) if verify_assets else 0
    return {"status": "passed", "kind": profile["record_kind"], "evidence": len(index),
            "renditions": len(renditions), "labels": {"source": len(source["observations"]["labels"]),
            "renditions": sum(len(r["observations"]["labels"]) for r in renditions)}, "verified_files": count}


def _verify_files(profile, root, index):
    need(profile["record_kind"] == "profile", "illustrative examples do not contain real artifacts")
    cache, json_cache = {}, {}

    def verify(a):
        name = a["path"]
        need(name.startswith(("media/", "runs/", "outputs/", "docs/runs/")), "real artifact must stay in an admitted private area")
        if name not in cache:
            path = _safe_path(root, name)
            need(path.relative_to(root).as_posix().startswith(("media/", "runs/", "outputs/", "docs/runs/")),
                 "artifact resolves outside admitted private areas")
            with path.open("rb") as f:
                sha = hashlib.file_digest(f, "sha256").hexdigest()
                size = f.tell()
            cache[name] = (sha, size, path)
        sha, size, path = cache[name]
        need((sha, size) == (a["sha256"], a["bytes"]), f"changed artifact: {name}")
        return path

    def json_evidence(key):
        e = index[key]
        path = verify(e["artifact"])
        if path not in json_cache:
            json_cache[path] = load_json(path)
        return _pointer(json_cache[path], e["locator"])

    def check_payload(obj, evidence_key):
        value = {k: v for k, v in obj.items() if k != evidence_key}
        need(json_evidence(obj[evidence_key]) == value, "media or audio projection differs from its probe")

    s = profile["source"]
    for e in index.values():
        verify(e["artifact"])
    for r in [s, *profile["renditions"]]:
        verify(r["media"]["asset"])
        check_payload(r["media"], "probe_evidence_id")
        if r["audio_signal"]:
            check_payload(r["audio_signal"], "evidence_id")
        if r.get("audio_alignment_to_source"):
            check_payload(r["audio_alignment_to_source"], "evidence_id")
    c = s["capture"]
    snapshot = json_evidence(c["snapshot_evidence_id"])
    download = json_evidence(c["download_evidence_id"])
    need(s["identity"]["platform"] == "bilibili", "snapshot projection is implemented only for retained Bilibili metadata")
    need(project_bilibili_identity(snapshot, download) == s["identity"], "source work or media selector differs from snapshots")
    need(project_bilibili_fields(snapshot, c["snapshot_evidence_id"]) == s["platform_fields"], "platform projection differs from retained fields")
    need(c["adapter"] == "yt-dlp/BiliBili" and c["adapter_version"] == (snapshot.get("_version") or {}).get("version") and (c["time_basis"] != "download_record" or c["captured_at"] == download.get("downloaded_at")), "adapter or collection clock mismatch")
    if s["pulse"]["evidence_id"]:
        p = json_evidence(s["pulse"]["evidence_id"])
        need(p.get("source_sha256") == s["media"]["asset"]["sha256"] and p.get("candidates") == s["pulse"]["candidates"], "pulse evidence changed")
    if s["routing"]["status"] == "recorded_route":
        route = s["routing"]
        verified = False
        for evidence_id in route["evidence_ids"]:
            if index[evidence_id]["kind"] == "run_record":
                recorded = json_evidence(evidence_id)
                verified |= (recorded.get("framing"), recorded.get("posture"), recorded.get("performer_count")) == (route["framing"], route["posture"], route["performer_count"])
        need(verified, "recorded route differs from its execution evidence")
    key = profile["key"]
    for r in profile["renditions"]:
        run, delivery = json_evidence(r["run_evidence_id"]), json_evidence(r["delivery_evidence_id"])
        out = r["media"]["asset"]
        expected_key = (key["run_id"], key["item_id"], "whole_video", r["variant"])
        need(tuple(run[k] for k in ("run_id", "item_id", "input_scope", "variant")) == expected_key, "run belongs to another task")
        e = run["execution"]
        need((e["attempt_id"], e["receipt_id"], e["status"]) == (r["attempt_id"], r["receipt_id"], "completed"), "run is not this retrieved attempt")
        need(run["source"]["media"]["sha256"] == r["source_sha256"], "run points to a different source")
        need(run["output"]["path"] == out["path"] and tuple(delivery[k] for k in ("path", "sha256", "bytes", "prompt_id", "retrieved_at")) == (*[out[k] for k in ("path", "sha256", "bytes")], r["receipt_id"], r["retrieved_at"]), "receipt and actual output differ")
        target, wf = run["target"], run["workflow"]
        expected = {"framing": run["decision"]["framing"], "scene_id": target["scene_id"],
                    "scene_revision": target["scene_revision"],
                    "target_images": [{k: a[k] for k in ("image_id", "revision", "sha256")} for a in target["images"]],
                    "audio_treatment": run["output"]["audio_treatment"], "branch": wf["active_branch"],
                    "execution_graph_sha256": wf["execution_graph"]["sha256"]}
        need(r["configuration"] == expected, "configuration does not match the pinned run record")
        status = r["acceptance"]["status"]
        if status != "not_recorded":
            matches = False
            for evidence_id in r["acceptance"]["evidence_ids"]:
                review = json_evidence(evidence_id)
                if status == "user_accepted_sample":
                    baseline = review.get("baseline", {})
                    matches |= review.get("status") == status and all(
                        baseline.get(k) == value for k, value in {"item_id": key["item_id"], "variant": r["variant"],
                          "attempt_id": r["attempt_id"], "mp4_sha256": out["sha256"], "prompt_id": r["receipt_id"]}.items())
                else:
                    matches |= all(review.get(k) == value for k, value in {"content_acceptance": status,
                         "run_id": key["run_id"], "item_id": key["item_id"], "variant": r["variant"],
                         "attempt_id": r["attempt_id"], "output": out["path"], "prompt_id": r["receipt_id"]}.items())
            need(matches, "content acceptance was not established for this rendition")
    return len(cache)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("profiles", nargs="+", type=Path)
    parser.add_argument("--verify-assets", action="store_true")
    args = parser.parse_args()
    result, failed = [], False
    for file in args.profiles:
        try:
            result.append({"file": str(file), **validate_profile(load_json(file), verify_assets=args.verify_assets)})
        except (OSError, ValueError, KeyError, TypeError) as exc:
            failed = True
            result.append({"file": str(file), "status": "failed", "reason": str(exc)})
    print(json.dumps(result, ensure_ascii=True, allow_nan=False, indent=2))
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
