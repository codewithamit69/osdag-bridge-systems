from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, getcontext
from typing import Any


getcontext().prec = 50


def _d(x: Any) -> Decimal:
    # Avoid Decimal(float) surprises by going through str()
    return x if isinstance(x, Decimal) else Decimal(str(x))


def _linspace_0_L(L: Decimal, n_points: int) -> list[Decimal]:
    if n_points < 2:
        raise ValueError("n_points must be >= 2")
    step = L / Decimal(n_points - 1)
    return [step * Decimal(i) for i in range(n_points)]


@dataclass(frozen=True)
class BeamInputs:
    span_length_m: Decimal
    udl_kN_per_m: Decimal
    point_load_kN: Decimal
    load_position_m: Decimal
    impact_factor: Decimal
    E_GPa: Decimal
    I_m4: Decimal
    section_y_m: Decimal


def analyze_simply_supported_udl_point_load(
    *,
    span_length_m: float | Decimal,
    dead_load_kN_per_m: float | Decimal,
    point_load_kN: float | Decimal,
    load_position_m: float | Decimal,
    impact_factor: float | Decimal = 0,
    E_GPa: float | Decimal = 200,
    I_m4: float | Decimal = Decimal("1e-4"),
    section_y_m: float | Decimal = Decimal("0.2"),
    n_points: int = 101,
) -> dict[str, Any]:
    """
    Simply supported beam, superposition of:
    - UDL w (kN/m) applied across full span
    - point load P (kN) at position a (m) from left support

    Returns plot-ready arrays for SFD/BMD/deflection/stress.
    """
    L = _d(span_length_m)
    if L <= 0:
        raise ValueError("span_length_m must be positive")

    w = _d(dead_load_kN_per_m) * (Decimal(1) + _d(impact_factor))
    if w < 0:
        raise ValueError("dead_load_kN_per_m must be >= 0")

    P = _d(point_load_kN)
    if P < 0:
        raise ValueError("point_load_kN must be >= 0")

    a = _d(load_position_m)
    if a < 0 or a > L:
        raise ValueError("load_position_m must be within [0, span_length_m]")

    E = _d(E_GPa) * Decimal("1e9")  # Pa
    I = _d(I_m4)
    if E <= 0:
        raise ValueError("E_GPa must be positive")
    if I <= 0:
        raise ValueError("I_m4 must be positive")

    y_ext = _d(section_y_m)
    if y_ext <= 0:
        raise ValueError("section_y_m must be positive")

    # Reactions (kN)
    # UDL: w*L split equally; point load: statics
    RB = (w * L) / Decimal(2) + (P * a) / L
    RA = (w * L) + P - RB

    # For deflection we use N/m and N
    w_N_per_m = w * Decimal(1000)
    P_N = P * Decimal(1000)

    xs = _linspace_0_L(L, n_points)

    V_kN: list[Decimal] = []
    M_kNm: list[Decimal] = []
    delta_mm: list[Decimal] = []
    sigma_MPa: list[Decimal] = []
    tau_MPa: list[Decimal] = []

    b = L - a

    for x in xs:
        H = Decimal(1) if x >= a else Decimal(0)

        # Shear and moment (kN, kNm)
        V = RA - (w * x) - (P * H)
        M = (RA * x) - (w * x * x) / Decimal(2) - (P * (x - a) * H)

        # Deflection (m) via superposition
        # UDL, simply supported: delta(x) = w x (L^3 - 2 L x^2 + x^3) / (24 E I)
        delta_udl_m = (w_N_per_m * x * (L**3 - Decimal(2) * L * x**2 + x**3)) / (
            Decimal(24) * E * I
        )

        # Point load P at a from left, b = L-a
        # x <= a: delta = P*b*x*(L^2 - b^2 - x^2) / (6 L E I)
        # x >= a: delta = P*a*(L-x)*(L^2 - a^2 - (L-x)^2) / (6 L E I)
        if P_N == 0:
            delta_p_m = Decimal(0)
        elif x <= a:
            delta_p_m = (P_N * b * x * (L**2 - b**2 - x**2)) / (
                Decimal(6) * L * E * I
            )
        else:
            xm = L - x
            delta_p_m = (P_N * a * xm * (L**2 - a**2 - xm**2)) / (
                Decimal(6) * L * E * I
            )

        delta_total_m = delta_udl_m + delta_p_m

        # Stress from bending (MPa). Convert M(kNm) -> N*m
        M_Nm = M * Decimal(1000)
        sigma_Pa = (M_Nm * y_ext) / I
        sigma = sigma_Pa / Decimal("1e6")

        # Approximate max shear stress for equivalent rectangular section:
        # tau_max ~= 1.5 * V/A, with A inferred from I and y (A ~= 3I/y^2)
        # => tau_max ~= 0.5 * V * y^2 / I
        V_N = abs(V) * Decimal(1000)
        tau_Pa = (V_N * (y_ext**2)) / (Decimal(2) * I)
        tau = tau_Pa / Decimal("1e6")

        V_kN.append(V)
        M_kNm.append(M)
        delta_mm.append(delta_total_m * Decimal(1000))
        sigma_MPa.append(sigma)
        tau_MPa.append(tau)

    V_max = max(abs(v) for v in V_kN) if V_kN else Decimal(0)
    M_max = max(abs(m) for m in M_kNm) if M_kNm else Decimal(0)
    delta_max = max(abs(d) for d in delta_mm) if delta_mm else Decimal(0)
    sigma_max = max(abs(s) for s in sigma_MPa) if sigma_MPa else Decimal(0)
    tau_max = max(abs(t) for t in tau_MPa) if tau_MPa else Decimal(0)

    return {
        "x_m": [float(x) for x in xs],
        "sfd_kN": [float(v) for v in V_kN],
        "bmd_kNm": [float(m) for m in M_kNm],
        "deflection_mm": [float(d) for d in delta_mm],
        "stress_MPa": [float(s) for s in sigma_MPa],
        "shear_stress_MPa": [float(t) for t in tau_MPa],
        "reactions_kN": {"RA": float(RA), "RB": float(RB)},
        "maxima": {
            "V_max_kN": float(V_max),
            "M_max_kNm": float(M_max),
            "delta_max_mm": float(delta_max),
            "sigma_max_MPa": float(sigma_max),
            "tau_max_MPa": float(tau_max),
        },
    }


# Backwards compatible wrapper (existing tests/api used this name).
def generate_bridge_response(length, load):
    return analyze_simply_supported_udl_point_load(
        span_length_m=length,
        dead_load_kN_per_m=load,
        point_load_kN=0,
        load_position_m=0,
        impact_factor=0,
        E_GPa=200,
        I_m4=Decimal("1e-4"),
        section_y_m=Decimal("0.2"),
        n_points=int(length) + 1 if float(length) >= 1 else 2,
    )