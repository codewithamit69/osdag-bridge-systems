# Testing

## Backend Testing

### Framework
- **pytest** + **pytest-django**
- Test directory: `backend/tests/`
- Config: `conftest.py` exists but is empty (no fixtures configured)

### Test File: `backend/tests/test_solver.py` (165 lines)

**5 test functions:**

| Test                           | Type            | What it validates                                |
|--------------------------------|-----------------|--------------------------------------------------|
| `test_data_driven_maxima`      | Data-driven     | CSV-parametrized regression test for V_max, M_max |
| `test_valid_input`             | Functional      | Output array lengths match `n_points`             |
| `test_invalid_length`          | Edge case       | ValueError raised for span_length_m = 0           |
| `test_negative_load`           | Edge case       | ValueError raised for negative dead_load          |
| `test_boundary_moments_are_zeroish` | Physics   | Bending moment ≈ 0 at both supports               |
| `test_reaction_equilibrium`    | Physics         | RA + RB = total applied load (equilibrium check)   |

### Data-Driven Testing Pattern
```python
# CSV file: backend/tests/data/test_data.csv
# 2 test cases with expected V_max and M_max values
# Loaded via csv.DictReader, parametrized via @pytest.mark.parametrize

@pytest.mark.parametrize("L,w,P,a,impact,E,I,y,V_expected,M_expected", get_test_data())
def test_data_driven_maxima(L, w, P, a, impact, E, I, y, V_expected, M_expected):
    result = analyze_simply_supported_udl_point_load(...)
    assert result["maxima"]["V_max_kN"] == pytest.approx(V_expected, abs=0.01)
    assert result["maxima"]["M_max_kNm"] == pytest.approx(M_expected, abs=0.05)
```

### Test Data
- `backend/tests/data/test_data.csv` — 2 regression test vectors:
  - Case 1: L=10m, w=10kN/m, pure UDL
  - Case 2: L=20m, w=5kN/m, P=50kN at midspan, impact=0.1

### Tolerances
| Quantity    | Tolerance  |
|-------------|-----------|
| Shear force | ±0.01 kN  |
| Moment      | ±0.05 kNm |
| Deflection  | ±0.001 mm |
| Stress      | ±0.1 MPa  |
| Boundary M  | ±1e-6 kNm (left), ±1e-3 kNm (right) |

### Running Tests
```bash
cd backend
pytest tests/test_solver.py -v
```

**Note:** Tests import solver directly via `sys.path.append` — not via Django's test runner. This means tests work without a database connection.

## Frontend Testing

### Framework
- **Jest** + **React Testing Library** (via CRA defaults)
- Config: `setupTests.js` imports `@testing-library/jest-dom`

### Test Files
- `src/App.test.js` — CRA default test only (renders App, no assertions beyond smoke test)
- **No component tests** — None of the 10 components have dedicated test files
- **No hook tests** — None of the 3 custom hooks have tests

### Running Tests
```bash
cd bridge-visualizer
npm test
```

## Test Coverage Gaps

### Critical gaps:
1. **No API endpoint tests** — No tests for `analyze`, `plots`, or `calculate` views
2. **No serializer tests** — Validation logic in `BridgeAnalysisRequestSerializer` is untested
3. **No integration tests** — No end-to-end Django request/response tests
4. **No frontend unit tests** — Custom hooks (`useValidation`, `useRecommendations`, `useCrossFieldWarnings`) have zero test coverage
5. **No component tests** — AnalysisGraphPanel, TopInputToolbar, etc. are untested

### Partial coverage:
- Solver core function is reasonably tested (5 tests, 2 CSV-driven cases)
- Edge cases (zero span, negative load) are covered
- Physics invariants (equilibrium, boundary conditions) are validated

## CI/CD
- **None configured** — No GitHub Actions, no CI pipeline files
- ValidationRun model exists with `triggered_by` field supporting "ci" / "GitHub Actions" — suggests CI was planned but not implemented
