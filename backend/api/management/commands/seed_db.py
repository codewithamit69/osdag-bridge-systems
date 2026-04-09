from decimal import Decimal

from django.core.management.base import BaseCommand

from backend.api.models import SteelGrade, SteelSection, TestCase


class Command(BaseCommand):
    help = "Seed steel sections and solver test cases."

    def handle(self, *args, **options):
        sections = [
            ("ISMB 200", "0.00002680", "0.00026800", "0.003250", "0.2000", "0.1000", "0.0057", SteelGrade.FE250),
            ("ISMB 300", "0.00008190", "0.00054600", "0.005620", "0.3000", "0.1400", "0.0067", SteelGrade.FE350),
            ("ISMB 400", "0.00019000", "0.00095000", "0.007840", "0.4000", "0.1400", "0.0089", SteelGrade.FE415),
            ("ISMB 500", "0.00037200", "0.00148800", "0.010010", "0.5000", "0.1800", "0.0102", SteelGrade.FE500),
            ("ISMB 600", "0.00067100", "0.00223700", "0.012210", "0.6000", "0.2100", "0.0112", SteelGrade.FE550),
        ]
        for row in sections:
            SteelSection.objects.update_or_create(
                designation=row[0],
                defaults={
                    "moment_of_inertia": Decimal(row[1]),
                    "section_modulus": Decimal(row[2]),
                    "cross_section_area": Decimal(row[3]),
                    "depth": Decimal(row[4]),
                    "flange_width": Decimal(row[5]),
                    "web_thickness": Decimal(row[6]),
                    "steel_grade": row[7],
                    "is_active": True,
                },
            )

        cases = [
            {
                "case_id": "TC001",
                "description": "10m span UDL only",
                "suite_name": "baseline",
                "span_length": Decimal("10.000"),
                "dead_load": Decimal("10.000"),
                "point_load": Decimal("0.000"),
                "load_position": Decimal("5.000"),
                "moment_of_inertia": Decimal("0.00020000"),
                "youngs_modulus": Decimal("200.000"),
                "steel_grade": SteelGrade.FE350,
                "section_y": Decimal("0.2500"),
                "expected_max_shear": Decimal("50.0000"),
                "expected_max_moment": Decimal("125.0000"),
                "expected_max_deflection": Decimal("81.380208"),
                "expected_max_stress": Decimal("156.2500"),
                "expected_reaction_a": Decimal("50.0000"),
                "expected_reaction_b": Decimal("50.0000"),
            },
            {
                "case_id": "TC002",
                "description": "20m span UDL + point load at midspan",
                "suite_name": "combined",
                "span_length": Decimal("20.000"),
                "dead_load": Decimal("5.000"),
                "point_load": Decimal("50.000"),
                "load_position": Decimal("10.000"),
                "moment_of_inertia": Decimal("0.00030000"),
                "youngs_modulus": Decimal("200.000"),
                "steel_grade": SteelGrade.FE415,
                "section_y": Decimal("0.3000"),
                "expected_max_shear": Decimal("75.0000"),
                "expected_max_moment": Decimal("375.0000"),
                "expected_max_deflection": Decimal("260.416667"),
                "expected_max_stress": Decimal("375.0000"),
                "expected_reaction_a": Decimal("75.0000"),
                "expected_reaction_b": Decimal("75.0000"),
            },
            {
                "case_id": "TC003",
                "description": "20m span point load at L/3",
                "suite_name": "point-load",
                "span_length": Decimal("20.000"),
                "dead_load": Decimal("0.100"),
                "point_load": Decimal("90.000"),
                "load_position": Decimal("6.667"),
                "moment_of_inertia": Decimal("0.00035000"),
                "youngs_modulus": Decimal("200.000"),
                "steel_grade": SteelGrade.FE350,
                "section_y": Decimal("0.2800"),
                "expected_max_shear": Decimal("60.0015"),
                "expected_max_moment": Decimal("400.0200"),
                "expected_max_deflection": Decimal("198.437500"),
                "expected_max_stress": Decimal("320.0160"),
                "expected_reaction_a": Decimal("60.0015"),
                "expected_reaction_b": Decimal("31.9985"),
            },
            {
                "case_id": "TC004",
                "description": "30m span high UDL",
                "suite_name": "stress",
                "span_length": Decimal("30.000"),
                "dead_load": Decimal("20.000"),
                "point_load": Decimal("0.000"),
                "load_position": Decimal("15.000"),
                "moment_of_inertia": Decimal("0.00080000"),
                "youngs_modulus": Decimal("200.000"),
                "steel_grade": SteelGrade.FE500,
                "section_y": Decimal("0.3500"),
                "expected_max_shear": Decimal("300.0000"),
                "expected_max_moment": Decimal("2250.0000"),
                "expected_max_deflection": Decimal("549.316406"),
                "expected_max_stress": Decimal("984.3750"),
                "expected_reaction_a": Decimal("300.0000"),
                "expected_reaction_b": Decimal("300.0000"),
            },
            {
                "case_id": "TC005",
                "description": "15m span combined load",
                "suite_name": "combined",
                "span_length": Decimal("15.000"),
                "dead_load": Decimal("7.500"),
                "point_load": Decimal("40.000"),
                "load_position": Decimal("5.000"),
                "moment_of_inertia": Decimal("0.00025000"),
                "youngs_modulus": Decimal("200.000"),
                "steel_grade": SteelGrade.FE415,
                "section_y": Decimal("0.2600"),
                "expected_max_shear": Decimal("77.5000"),
                "expected_max_moment": Decimal("260.4167"),
                "expected_max_deflection": Decimal("147.104740"),
                "expected_max_stress": Decimal("270.8334"),
                "expected_reaction_a": Decimal("77.5000"),
                "expected_reaction_b": Decimal("75.0000"),
            },
        ]
        for case in cases:
            TestCase.objects.update_or_create(case_id=case["case_id"], defaults=case)

        self.stdout.write(self.style.SUCCESS("Seeded steel sections and test cases."))

