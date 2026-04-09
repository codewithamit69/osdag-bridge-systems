from __future__ import annotations

from decimal import Decimal
from typing import Any


def apply_validation_rules(inputs: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """
    Non-blocking engineering rules that produce warnings.

    Hard blocks (type/range/div-by-zero) should be enforced by DRF serializer validation.
    """
    warnings: list[dict[str, str]] = []

    L: Decimal = inputs["span_length_m"]

    # Serviceability heuristic warning from your spec
    if L > Decimal("25"):
        warnings.append(
            {
                "code": "serviceability_span_warning",
                "field": "span_length_m",
                "message": "Span > 25m for simply supported beam; deflection may exceed serviceability limits.",
            }
        )

    return inputs, warnings


# Backwards compatible stub for older view versions.
def validate_inputs(data):
    if "length" not in data:
        raise ValueError("Missing length")
    if data["length"] <= 0:
        raise ValueError("Invalid length")
    if data.get("load", 0) < 0:
        raise ValueError("Load cannot be negative")