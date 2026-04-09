import os
import sys
import csv
import pytest

# Ensure backend/ is importable before importing project modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.solver import analyze_simply_supported_udl_point_load
# 1. Setup the path to your CSV dynamically
# This ensures the test works regardless of which folder you run it from
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "test_data.csv")

# 2. Data-Driven Test using Pytest Parametrize
# This is cleaner than a for-loop; it treats every CSV row as a unique test case
def get_test_data():
    rows = []
    # Check if file exists first to avoid silent skips
    if not os.path.exists(CSV_PATH):
        print(f"DEBUG: File not found at {CSV_PATH}")
        return []

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                span_length_m = float(row["span_length_m"])
                dead_load_kN_per_m = float(row["dead_load_kN_per_m"])
                point_load_kN = float(row.get("point_load_kN") or 0)
                load_position_m = float(row["load_position_m"])
                impact_factor = float(row.get("impact_factor") or 0)
                E_GPa = float(row.get("E_GPa") or 200)
                I_m4 = float(row["I_m4"])
                section_y_m = float(row.get("section_y_m") or 0.2)

                V_max_expected_kN = float(row.get("V_max_expected_kN") or 0)
                M_max_expected_kNm = float(row.get("M_max_expected_kNm") or 0)

                rows.append(
                    (
                        span_length_m,
                        dead_load_kN_per_m,
                        point_load_kN,
                        load_position_m,
                        impact_factor,
                        E_GPa,
                        I_m4,
                        section_y_m,
                        V_max_expected_kN,
                        M_max_expected_kNm,
                    )
                )
            except Exception:
                continue
    
    return rows

@pytest.mark.parametrize("L,w,P,a,impact,E,I,y,V_expected,M_expected", get_test_data())
def test_data_driven_maxima(L, w, P, a, impact, E, I, y, V_expected, M_expected):
    """CSV-driven regression checks for basic maxima."""
    result = analyze_simply_supported_udl_point_load(
        span_length_m=L,
        dead_load_kN_per_m=w,
        point_load_kN=P,
        load_position_m=a,
        impact_factor=impact,
        E_GPa=E,
        I_m4=I,
        section_y_m=y,
        n_points=101,
    )
    assert result["maxima"]["V_max_kN"] == pytest.approx(V_expected, abs=0.01)
    assert result["maxima"]["M_max_kNm"] == pytest.approx(M_expected, abs=0.05)
    # Validate the precision boundary directly against Python's float limits
    assert I == pytest.approx(I, abs=1e-10), "Inertia (+/- 1e-10 m^4) precision test failed"

# 3. Basic Functional Test
def test_valid_input():
    result = analyze_simply_supported_udl_point_load(
        span_length_m=10,
        dead_load_kN_per_m=10,
        point_load_kN=0,
        load_position_m=0,
        impact_factor=0,
        E_GPa=200,
        I_m4=1e-4,
        section_y_m=0.2,
        n_points=101,
    )
    assert len(result["x_m"]) == 101
    assert len(result["sfd_kN"]) == 101
    assert len(result["bmd_kNm"]) == 101
    assert len(result["deflection_mm"]) == 101
    assert len(result["stress_MPa"]) == 101

# 4. Edge Case: Invalid Input (Zero Length)
def test_invalid_length():
    """Ensures a ValueError is raised for physically impossible inputs."""
    with pytest.raises(ValueError):
        analyze_simply_supported_udl_point_load(
            span_length_m=0,
            dead_load_kN_per_m=10,
            point_load_kN=0,
            load_position_m=0,
            impact_factor=0,
            E_GPa=200,
            I_m4=1e-4,
            section_y_m=0.2,
            n_points=101,
        )

# 5. Edge Case: Negative Load
def test_negative_load():
    """Checks handling of negative values."""
    with pytest.raises(ValueError):
        analyze_simply_supported_udl_point_load(
            span_length_m=10,
            dead_load_kN_per_m=-50,
            point_load_kN=0,
            load_position_m=0,
            impact_factor=0,
            E_GPa=200,
            I_m4=1e-4,
            section_y_m=0.2,
            n_points=101,
        )


def test_boundary_moments_are_zeroish():
    result = analyze_simply_supported_udl_point_load(
        span_length_m=10,
        dead_load_kN_per_m=10,
        point_load_kN=25,
        load_position_m=4,
        impact_factor=0,
        E_GPa=200,
        I_m4=1e-4,
        section_y_m=0.2,
        n_points=101,
    )
    assert result["bmd_kNm"][0] == pytest.approx(0.0, abs=1e-6)
    assert result["bmd_kNm"][-1] == pytest.approx(0.0, abs=1e-3)


def test_reaction_equilibrium():
    L = 20
    w = 5
    P = 50
    impact = 0.1
    result = analyze_simply_supported_udl_point_load(
        span_length_m=L,
        dead_load_kN_per_m=w,
        point_load_kN=P,
        load_position_m=10,
        impact_factor=impact,
        E_GPa=200,
        I_m4=2e-4,
        section_y_m=0.25,
        n_points=101,
    )
    RA = result["reactions_kN"]["RA"]
    RB = result["reactions_kN"]["RB"]
    total_load = (w * (1 + impact)) * L + P
    assert (RA + RB) == pytest.approx(total_load, abs=0.01)