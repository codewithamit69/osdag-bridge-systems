from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers


STEEL_GRADE_TO_FY_MPA: dict[str, Decimal] = {
    "Fe250": Decimal("250"),
    "Fe350": Decimal("350"),
    "Fe415": Decimal("415"),
    "Fe500": Decimal("500"),
    "Fe550": Decimal("550"),
}


class BridgeAnalysisRequestSerializer(serializers.Serializer):
    # Standard engineering values: support up to 99,999.999
    span_length_m = serializers.DecimalField(max_digits=8, decimal_places=3)
    dead_load_kN_per_m = serializers.DecimalField(max_digits=8, decimal_places=3)
    point_load_kN = serializers.DecimalField(
        max_digits=8, decimal_places=3, required=False, default=Decimal("0")
    )
    load_position_m = serializers.DecimalField(max_digits=8, decimal_places=3)
    impact_factor = serializers.DecimalField(
        max_digits=4, decimal_places=3, required=False, default=Decimal("0")
    )

    E_GPa = serializers.DecimalField(
        max_digits=8, decimal_places=3, required=False, default=Decimal("200")
    )
    # High precision for inertia: max_digits=12, decimal_places=8 supports 1e-8 nicely
    I_m4 = serializers.DecimalField(max_digits=12, decimal_places=8)
    section_y_m = serializers.DecimalField(
        max_digits=8, decimal_places=3, required=False, default=Decimal("0.2")
    )

    steel_grade = serializers.ChoiceField(choices=sorted(STEEL_GRADE_TO_FY_MPA.keys()))
    beam_spacing_m = serializers.DecimalField(
        max_digits=8, decimal_places=3, required=False, allow_null=True
    )
    deck_width_m = serializers.DecimalField(
        max_digits=8, decimal_places=3, required=False, allow_null=True
    )

    n_points = serializers.IntegerField(required=False, default=101, min_value=50, max_value=100)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._warnings: list[dict[str, str]] = []

    def get_warnings(self) -> list[dict[str, str]]:
        return list(self._warnings)

    def validate_span_length_m(self, value: Decimal) -> Decimal:
        if value <= 0 or value > Decimal("200"):
            raise serializers.ValidationError("span_length_m must be within (0, 200].")
        if value < Decimal("1"):
            raise serializers.ValidationError("span_length_m must be >= 1.")
        return value

    def validate_dead_load_kN_per_m(self, value: Decimal) -> Decimal:
        if value <= 0 or value > Decimal("500"):
            raise serializers.ValidationError("dead_load_kN_per_m must be within (0, 500].")
        if value < Decimal("0.1"):
            raise serializers.ValidationError("dead_load_kN_per_m must be >= 0.1.")
        return value

    def validate_point_load_kN(self, value: Decimal) -> Decimal:
        if value < 0:
            raise serializers.ValidationError("point_load_kN must be >= 0.")
        return value

    def validate_impact_factor(self, value: Decimal) -> Decimal:
        if value < 0:
            raise serializers.ValidationError("impact_factor must be >= 0.")
        if value > Decimal("0.5"):
            self._warnings.append(
                {
                    "code": "impact_factor_clamped",
                    "field": "impact_factor",
                    "message": "Impact factor exceeded 0.5 and was clamped to 0.5.",
                }
            )
            return Decimal("0.5")
        return value

    def validate_I_m4(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("I_m4 must be > 0.")
        if value < Decimal("1e-8") or value > Decimal("1.0"):
            raise serializers.ValidationError("I_m4 must be within [1e-8, 1.0].")
        return value

    def validate_section_y_m(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("section_y_m must be > 0.")
        return value

    def validate_E_GPa(self, value: Decimal) -> Decimal:
        base = Decimal("200")
        lower = base * Decimal("0.95")
        upper = base * Decimal("1.05")
        if value < lower or value > upper:
            raise serializers.ValidationError("E_GPa override must be within ±5% of 200 GPa.")
        return value

    def validate(self, attrs: dict) -> dict:
        L = attrs["span_length_m"]
        x = attrs["load_position_m"]
        if x < 0 or x > L:
            raise serializers.ValidationError({"load_position_m": "Must be within [0, span_length_m]."})

        beam_spacing = attrs.get("beam_spacing_m")
        deck_width = attrs.get("deck_width_m")

        if beam_spacing is not None:
            if beam_spacing < Decimal("0.5") or beam_spacing > Decimal("10"):
                raise serializers.ValidationError({"beam_spacing_m": "Must be within [0.5, 10]."})
            if beam_spacing > L:
                raise serializers.ValidationError({"beam_spacing_m": "Must be <= span_length_m."})

        if deck_width is not None:
            if deck_width < Decimal("2") or deck_width > Decimal("30"):
                raise serializers.ValidationError({"deck_width_m": "Must be within [2, 30]."})
            if beam_spacing is not None and deck_width < beam_spacing:
                raise serializers.ValidationError({"deck_width_m": "Must be >= beam_spacing_m."})

        return attrs

