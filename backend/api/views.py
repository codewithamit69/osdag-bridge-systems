from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from core.solver import analyze_simply_supported_udl_point_load
from core.validator import apply_validation_rules
from .serializers import BridgeAnalysisRequestSerializer, STEEL_GRADE_TO_FY_MPA


def _argmax_abs(values: list[float]) -> int:
    if not values:
        return 0
    return max(range(len(values)), key=lambda i: abs(values[i]))


def _find_zero_crossing_x(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 2 or len(ys) < 2 or len(xs) != len(ys):
        return None
    for i in range(len(ys) - 1):
        y0, y1 = ys[i], ys[i + 1]
        if y0 == 0:
            return xs[i]
        if (y0 < 0 < y1) or (y1 < 0 < y0) or (y1 == 0):
            x0, x1 = xs[i], xs[i + 1]
            if y1 == y0:
                return x0
            t = (0 - y0) / (y1 - y0)
            return x0 + t * (x1 - x0)
    return None


def _scenario_label(dead_load_kN_per_m: float, point_load_kN: float, load_position_m: float) -> str:
    has_udl = dead_load_kN_per_m > 0
    has_point = point_load_kN > 0
    if has_udl and has_point:
        return f"UDL + Point Load at {load_position_m:.3f}m"
    if has_udl:
        return "UDL Only"
    if has_point:
        return f"Point Load at {load_position_m:.3f}m"
    return "No Load"


def _build_load_vs_deflection_plot(inputs: dict) -> dict:
    xs, ys = [], []
    for i in range(1, 21):
        m = round(i / 10, 1)
        sweep = analyze_simply_supported_udl_point_load(
            span_length_m=inputs["span_length_m"],
            dead_load_kN_per_m=float(inputs["dead_load_kN_per_m"]) * m,
            point_load_kN=float(inputs["point_load_kN"]) * m,
            load_position_m=inputs["load_position_m"],
            impact_factor=inputs["impact_factor"],
            E_GPa=inputs["E_GPa"],
            I_m4=inputs["I_m4"],
            section_y_m=inputs["section_y_m"],
            n_points=int(inputs["n_points"]),
        )
        xs.append(m)
        ys.append(float(sweep["maxima"]["delta_max_mm"]))

    return {
        "plotly": {
            "data": [
                {
                    "type": "scatter",
                    "mode": "lines+markers",
                    "name": "Load vs Deflection",
                    "x": xs,
                    "y": ys,
                    "line": {"color": "#FF9F1C"},
                    "hovertemplate": "x: %{x:.1f}<br>val: %{y:.3f} mm<extra></extra>",
                },
                {
                    "type": "scatter",
                    "mode": "lines",
                    "name": "Design load",
                    "x": [1.0, 1.0],
                    "y": [min(ys), max(ys)],
                    "line": {"dash": "dash", "color": "#94a3b8"},
                },
            ],
            "layout": {
                "title": "Load vs Deflection",
                "xaxis": {"title": "Load multiplier"},
                "yaxis": {"title": "Max Deflection (mm)"},
                "annotations": [{"x": 1.0, "y": max(ys), "text": "Design load", "showarrow": True}],
            },
        }
    }


def _build_plots(inputs: dict, result: dict, fy_mpa: float, stress_ratio: float) -> dict:
    xs = result["x_m"]
    sfd = result["sfd_kN"]
    bmd = result["bmd_kNm"]
    dfl = result["deflection_mm"]
    sig = result["stress_MPa"]
    tau = result["shear_stress_MPa"]

    L = float(inputs["span_length_m"])
    allow_dfl = (L * 1000.0) / 300.0
    tau_limit = 0.6 * fy_mpa

    sfd_zero_x = _find_zero_crossing_x(xs, sfd)
    sfd_max_i = max(range(len(sfd)), key=lambda i: sfd[i])
    sfd_min_i = min(range(len(sfd)), key=lambda i: sfd[i])
    bmd_peak_i = _argmax_abs(bmd)
    dfl_peak_i = _argmax_abs(dfl)
    sig_peak_i = _argmax_abs(sig)

    exceeds = any(v > allow_dfl for v in dfl)
    exceed_series = [v if v > allow_dfl else allow_dfl for v in dfl]

    plots = {
        "shear_force": {
            "plotly": {
                "data": [
                    {
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Shear Force",
                        "x": xs,
                        "y": sfd,
                        "line": {"color": "#00BFFF", "shape": "hv"},
                        "hovertemplate": "x: %{x:.3f} m<br>val: %{y:.3f} kN<extra></extra>",
                    }
                ],
                "layout": {
                    "title": "Shear Force Diagram",
                    "xaxis": {"title": "x (m)"},
                    "yaxis": {"title": "Shear Force (kN)"},
                    "annotations": [
                        {"x": xs[sfd_max_i], "y": sfd[sfd_max_i], "text": f"Max + {sfd[sfd_max_i]:.2f}", "showarrow": True},
                        {"x": xs[sfd_min_i], "y": sfd[sfd_min_i], "text": f"Max - {sfd[sfd_min_i]:.2f}", "showarrow": True},
                    ]
                    + ([{"x": sfd_zero_x, "y": 0, "text": "Zero crossing", "showarrow": True}] if sfd_zero_x is not None else []),
                    "shapes": [{"type": "line", "x0": xs[0], "x1": xs[-1], "y0": 0, "y1": 0, "line": {"dash": "dash"}}],
                },
            }
        },
        "bending_moment": {
            "plotly": {
                "data": [
                    {
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Bending Moment",
                        "x": xs,
                        "y": bmd,
                        "line": {"color": "#00FF88"},
                        "hovertemplate": "x: %{x:.3f} m<br>val: %{y:.3f} kN·m<extra></extra>",
                    }
                ],
                "layout": {
                    "title": "Bending Moment Diagram",
                    "xaxis": {"title": "x (m)"},
                    "yaxis": {"title": "Bending Moment (kN·m)"},
                    "annotations": [
                        {"x": xs[bmd_peak_i], "y": bmd[bmd_peak_i], "text": f"Peak {bmd[bmd_peak_i]:.2f}", "showarrow": True}
                    ],
                },
            }
        },
        "deflection": {
            "plotly": {
                "data": [
                    {
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Deflection",
                        "x": xs,
                        "y": dfl,
                        "line": {"color": "#FFD700"},
                        "hovertemplate": "x: %{x:.3f} m<br>val: %{y:.3f} mm<extra></extra>",
                    },
                    {
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Serviceability limit (L/300)",
                        "x": [xs[0], xs[-1]],
                        "y": [allow_dfl, allow_dfl],
                        "line": {"dash": "dash", "color": "#94a3b8"},
                    },
                ]
                + (
                    [
                        {
                            "type": "scatter",
                            "mode": "lines",
                            "name": "Exceedance region",
                            "x": xs,
                            "y": exceed_series,
                            "fill": "tonexty",
                            "fillcolor": "rgba(255, 107, 107, 0.2)",
                            "line": {"width": 0},
                            "hoverinfo": "skip",
                        }
                    ]
                    if exceeds
                    else []
                ),
                "layout": {
                    "title": "Deflection Curve",
                    "xaxis": {"title": "x (m)"},
                    "yaxis": {"title": "Deflection (mm)", "autorange": "reversed"},
                    "annotations": [
                        {"x": xs[dfl_peak_i], "y": dfl[dfl_peak_i], "text": f"Max {dfl[dfl_peak_i]:.2f}", "showarrow": True}
                    ],
                },
            }
        },
        "normal_stress": {
            "plotly": {
                "data": [
                    {
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Normal Stress",
                        "x": xs,
                        "y": sig,
                        "line": {"color": "#FF6B6B"},
                        "hovertemplate": "x: %{x:.3f} m<br>val: %{y:.3f} MPa<extra></extra>",
                    },
                    {
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Yield strength fy",
                        "x": [xs[0], xs[-1]],
                        "y": [fy_mpa, fy_mpa],
                        "line": {"dash": "dash", "color": "#94a3b8"},
                    },
                ],
                "layout": {
                    "title": "Normal Stress Distribution",
                    "xaxis": {"title": "x (m)"},
                    "yaxis": {"title": "Normal Stress σ (MPa)"},
                    "annotations": [
                        {"x": xs[sig_peak_i], "y": sig[sig_peak_i], "text": f"Max {sig[sig_peak_i]:.2f}", "showarrow": True},
                        {"x": xs[-1], "y": fy_mpa, "text": f"σ/fy = {stress_ratio:.2f}", "showarrow": False},
                    ],
                },
            }
        },
        "shear_stress": {
            "plotly": {
                "data": [
                    {
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Shear Stress",
                        "x": xs,
                        "y": tau,
                        "line": {"color": "#C77DFF"},
                        "hovertemplate": "x: %{x:.3f} m<br>val: %{y:.3f} MPa<extra></extra>",
                    },
                    {
                        "type": "scatter",
                        "mode": "lines",
                        "name": "IS 800 shear limit",
                        "x": [xs[0], xs[-1]],
                        "y": [tau_limit, tau_limit],
                        "line": {"dash": "dash", "color": "#94a3b8"},
                    },
                ],
                "layout": {
                    "title": "Shear Stress Distribution",
                    "xaxis": {"title": "x (m)"},
                    "yaxis": {"title": "Shear Stress τ (MPa)"},
                },
            }
        },
    }
    plots["load_vs_deflection"] = _build_load_vs_deflection_plot(inputs)
    return plots


def _analyze_payload(inputs: dict, warnings: list[dict]) -> dict:
    fy_mpa = float(STEEL_GRADE_TO_FY_MPA[str(inputs["steel_grade"])])
    result = analyze_simply_supported_udl_point_load(
        span_length_m=inputs["span_length_m"],
        dead_load_kN_per_m=inputs["dead_load_kN_per_m"],
        point_load_kN=inputs["point_load_kN"],
        load_position_m=inputs["load_position_m"],
        impact_factor=inputs["impact_factor"],
        E_GPa=inputs["E_GPa"],
        I_m4=inputs["I_m4"],
        section_y_m=inputs["section_y_m"],
        n_points=int(inputs["n_points"]),
    )

    sigma_max = float(result["maxima"]["sigma_max_MPa"])
    tau_max = float(result["maxima"]["tau_max_MPa"])
    stress_ratio = sigma_max / fy_mpa if fy_mpa > 0 else 0.0
    L = float(inputs["span_length_m"])
    delta_max = float(result["maxima"]["delta_max_mm"])
    allowable_deflection_mm = (L * 1000.0) / 300.0
    deflection_ok = delta_max < allowable_deflection_mm
    bending_ok = sigma_max < fy_mpa
    shear_ok = tau_max < (0.6 * fy_mpa)
    deflection_ratio_n = (L * 1000.0) / delta_max if delta_max > 0 else 999999.0
    scenario = _scenario_label(
        float(inputs["dead_load_kN_per_m"]),
        float(inputs["point_load_kN"]),
        float(inputs["load_position_m"]),
    )
    plots = _build_plots(inputs, result, fy_mpa, stress_ratio)

    return {
        "status": "success",
        "warnings": warnings,
        "data": {
            "inputs_normalized": {
                "span_length_m": float(inputs["span_length_m"]),
                "dead_load_kN_per_m": float(inputs["dead_load_kN_per_m"]),
                "point_load_kN": float(inputs["point_load_kN"]),
                "load_position_m": float(inputs["load_position_m"]),
                "impact_factor": float(inputs["impact_factor"]),
                "E_GPa": float(inputs["E_GPa"]),
                "I_m4": float(inputs["I_m4"]),
                "section_y_m": float(inputs["section_y_m"]),
                "steel_grade": str(inputs["steel_grade"]),
                "fy_MPa": fy_mpa,
                "n_points": int(inputs["n_points"]),
                "scenario_label": scenario,
            },
            "results_summary": {
                **result["maxima"],
                "fy_MPa": fy_mpa,
                "stress_ratio": stress_ratio,
            },
            "reactions": {"R_A": float(result["reactions_kN"]["RA"]), "R_B": float(result["reactions_kN"]["RB"])},
            "code_checks": {
                "deflection_ok": deflection_ok,
                "bending_ok": bending_ok,
                "shear_ok": shear_ok,
                "deflection_ratio": f"L/{int(deflection_ratio_n)}",
                "stress_ratio": round(stress_ratio, 4),
            },
            "plots": plots,
        },
    }


class AnalyzeView(APIView):
    def post(self, request):
        try:
            serializer = BridgeAnalysisRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            inputs = serializer.validated_data
            inputs, rule_warnings = apply_validation_rules(inputs)
            warnings = serializer.get_warnings() + rule_warnings
            return Response(_analyze_payload(inputs, warnings), status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"status": "error", "message": "Validation error", "field_errors": e.detail}, status=400)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=400)

class PlotView(APIView):
    def post(self, request):
        try:
            serializer = BridgeAnalysisRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            inputs = serializer.validated_data
            inputs, _ = apply_validation_rules(inputs)
            payload = _analyze_payload(inputs, [])
            return Response({"status": "success", "plots": payload["data"]["plots"]}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"status": "error", "message": "Validation error", "field_errors": e.detail}, status=400)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=400)

class ValidateInputView(APIView):
    def post(self, request):
        try:
            serializer = BridgeAnalysisRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            return Response({"valid": True})
        except ValidationError as e:
            return Response({"status": "error", "message": "Validation error", "field_errors": e.detail}, status=400)

class SectionListView(APIView):
    def get(self, request):
        return Response({"sections": []})

class HistoryListView(APIView):
    def get(self, request):
        return Response([])

class RunTestSuiteView(APIView):
    def post(self, request):
        return Response({"status": "success"})