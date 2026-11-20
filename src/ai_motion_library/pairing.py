"""Order the two H3 variants of each source before submitting them to ComfyUI."""

from collections.abc import Iterable, Mapping
from typing import Any


DEFAULT_VARIANTS = ("SA02", "BM01")
SOURCE_GROUP_SIZE = 2


def order_variant_plans(plans: Iterable[Mapping[str, Any]]) -> list[Mapping[str, Any]]:
    """Return paired plans in input order within each variant of each source group.

    Include a plan for each variant even if its output can be reused or its route
    is blocked. The caller uses each attempt's state to decide whether to submit.
    """
    sources: dict[str, dict[str, Mapping[str, Any]]] = {}
    run_id = None
    for plan in plans:
        variant = plan.get("variant")
        item_id = plan.get("item_id")
        batch = plan.get("run_id")
        if not isinstance(batch, str) or not batch or not isinstance(item_id, str) or not item_id:
            raise ValueError("Each variant needs a batch and item ID")
        if run_id is None:
            run_id = batch
        if batch != run_id:
            raise ValueError("Variant plans must belong to the same batch")
        if variant not in DEFAULT_VARIANTS or plan.get("input_scope") != "whole_video":
            raise ValueError("Expected SA02 or BM01 using the whole video")
        pair = sources.setdefault(item_id, {})
        if variant in pair:
            raise ValueError(f"Duplicate {variant} plan for {item_id}")
        pair[variant] = plan

    pairs = list(sources.values())
    for item_id, pair in sources.items():
        missing = [variant for variant in DEFAULT_VARIANTS if variant not in pair]
        if missing:
            raise ValueError(f"Missing {', '.join(missing)} plan for {item_id}")
        first, second = (pair[variant].get("source") for variant in DEFAULT_VARIANTS)
        if not isinstance(first, Mapping) or not isinstance(second, Mapping):
            raise ValueError(f"Missing source identity for {item_id}")
        if not first.get("sha256") or first["sha256"] != second.get("sha256"):
            raise ValueError(f"The variants must use the same source video for {item_id}")

    return [
        pair[variant]
        for start in range(0, len(pairs), SOURCE_GROUP_SIZE)
        for variant in DEFAULT_VARIANTS
        for pair in pairs[start : start + SOURCE_GROUP_SIZE]
    ]
