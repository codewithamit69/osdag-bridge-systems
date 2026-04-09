import uuid
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class SteelGrade(models.TextChoices):
    FE250 = "Fe250", "Fe250 (fy=250 MPa)"
    FE350 = "Fe350", "Fe350 (fy=350 MPa)"
    FE415 = "Fe415", "Fe415 (fy=415 MPa)"
    FE500 = "Fe500", "Fe500 (fy=500 MPa)"
    FE550 = "Fe550", "Fe550 (fy=550 MPa)"


class SupportCondition(models.TextChoices):
    SIMPLY_SUPPORTED = "simply_supported", "Simply Supported"
    CONTINUOUS = "continuous", "Continuous"
    FIXED = "fixed", "Fixed-Fixed"
    PINNED_ROLLER = "pinned_roller", "Pinned-Roller"


class LoadClass(models.TextChoices):
    IRC_AA = "IRC_AA", "IRC Class AA"
    IRC_A = "IRC_A", "IRC Class A"
    IRC_70R = "IRC_70R", "IRC Class 70R"
    IRC_SV = "IRC_SV", "IRC Class SV"
    PEDESTRIAN = "pedestrian", "Pedestrian"
    CUSTOM = "custom", "Custom (manual entry)"


class ComplianceResult(models.TextChoices):
    PASS = "PASS", "Pass"
    FAIL = "FAIL", "Fail"
    WARNING = "WARNING", "Warning"
    PENDING = "PENDING", "Pending"


class AuditableModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True


class BridgeAnalysisRun(AuditableModel):
    session_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)

    span_length = models.DecimalField(
        max_digits=8, decimal_places=3, validators=[MinValueValidator(1.0), MaxValueValidator(200.0)]
    )
    support_condition = models.CharField(
        max_length=20, choices=SupportCondition.choices, default=SupportCondition.SIMPLY_SUPPORTED
    )
    dead_load = models.DecimalField(
        max_digits=8, decimal_places=3, validators=[MinValueValidator(0.1), MaxValueValidator(500.0)]
    )
    point_load = models.DecimalField(max_digits=8, decimal_places=3, validators=[MinValueValidator(0.0)])
    load_position = models.DecimalField(max_digits=8, decimal_places=3, validators=[MinValueValidator(0.0)])
    load_class = models.CharField(max_length=20, choices=LoadClass.choices, default=LoadClass.CUSTOM)
    impact_factor = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        validators=[MinValueValidator(0.0), MaxValueValidator(0.5)],
        default=0.1,
    )
    steel_grade = models.CharField(max_length=10, choices=SteelGrade.choices, default=SteelGrade.FE415)
    youngs_modulus = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        validators=[MinValueValidator(190.0), MaxValueValidator(210.0)],
        help_text="GPa - allowed within +-5% of 200 GPa per IS 800",
    )
    moment_of_inertia = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        validators=[MinValueValidator(0.00000001), MaxValueValidator(1.0)],
        help_text="m^4",
    )
    section_y = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        validators=[MinValueValidator(0.0001)],
        help_text="Distance from neutral axis to extreme fiber (m)",
    )
    plot_points = models.IntegerField(default=99, validators=[MinValueValidator(50), MaxValueValidator(100)])

    max_shear_force = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    max_bending_moment = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    max_deflection = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    max_normal_stress = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    max_shear_stress = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    reaction_a = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    reaction_b = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    stress_ratio = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    deflection_ratio = models.CharField(max_length=20, null=True, blank=True)

    plot_data = models.JSONField(null=True, blank=True)

    compliance_status = models.CharField(
        max_length=10,
        choices=ComplianceResult.choices,
        default=ComplianceResult.PENDING,
        db_index=True,
    )
    report_generated = models.BooleanField(default=False)
    report_path = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = "bridge_analysis_run"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["compliance_status", "created_at"]),
            models.Index(fields=["steel_grade", "span_length"]),
        ]

    def __str__(self):
        return f"Run {self.session_id} | L={self.span_length}m | {self.compliance_status}"

    def get_fy(self):
        fy_map = {"Fe250": 250, "Fe350": 350, "Fe415": 415, "Fe500": 500, "Fe550": 550}
        return fy_map.get(self.steel_grade, 415)


class CodeComplianceCheck(AuditableModel):
    run = models.ForeignKey(BridgeAnalysisRun, on_delete=models.CASCADE, related_name="compliance_checks")

    IS_CODE_CHOICES = [
        ("IS800_Cl5.6.1", "IS 800 Cl.5.6.1 - Deflection"),
        ("IS800_Cl8.2", "IS 800 Cl.8.2 - Bending"),
        ("IS800_Cl8.4", "IS 800 Cl.8.4 - Shear Stress"),
        ("IS456_Cl23.2", "IS 456 Cl.23.2 - Deflection (concrete)"),
        ("IRC_Cl204", "IRC Cl.204 - Live load"),
    ]

    clause = models.CharField(max_length=30, choices=IS_CODE_CHOICES, db_index=True)
    description = models.CharField(max_length=200)
    computed = models.DecimalField(max_digits=12, decimal_places=6)
    limit = models.DecimalField(max_digits=12, decimal_places=6)
    unit = models.CharField(max_length=20)
    result = models.CharField(max_length=10, choices=ComplianceResult.choices, db_index=True)

    class Meta:
        db_table = "code_compliance_check"
        unique_together = ("run", "clause")

    def __str__(self):
        return f"{self.clause} -> {self.result} (run {self.run.session_id})"


class TestCase(AuditableModel):
    case_id = models.CharField(max_length=20, unique=True, db_index=True)
    description = models.CharField(max_length=300)
    suite_name = models.CharField(max_length=100, db_index=True)

    span_length = models.DecimalField(max_digits=8, decimal_places=3)
    dead_load = models.DecimalField(max_digits=8, decimal_places=3)
    point_load = models.DecimalField(max_digits=8, decimal_places=3)
    load_position = models.DecimalField(max_digits=8, decimal_places=3)
    moment_of_inertia = models.DecimalField(max_digits=12, decimal_places=8)
    youngs_modulus = models.DecimalField(max_digits=8, decimal_places=3)
    steel_grade = models.CharField(max_length=10, choices=SteelGrade.choices)
    section_y = models.DecimalField(max_digits=8, decimal_places=4)

    expected_max_shear = models.DecimalField(max_digits=10, decimal_places=4)
    expected_max_moment = models.DecimalField(max_digits=10, decimal_places=4)
    expected_max_deflection = models.DecimalField(max_digits=10, decimal_places=6)
    expected_max_stress = models.DecimalField(max_digits=10, decimal_places=4)
    expected_reaction_a = models.DecimalField(max_digits=10, decimal_places=4)
    expected_reaction_b = models.DecimalField(max_digits=10, decimal_places=4)

    tol_shear = models.DecimalField(max_digits=8, decimal_places=4, default=0.01)
    tol_moment = models.DecimalField(max_digits=8, decimal_places=4, default=0.05)
    tol_deflection = models.DecimalField(max_digits=8, decimal_places=6, default=0.001)
    tol_stress = models.DecimalField(max_digits=8, decimal_places=4, default=0.1)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "test_case"
        ordering = ["suite_name", "case_id"]

    def __str__(self):
        return f"{self.case_id} - {self.description}"


class ValidationRun(AuditableModel):
    run_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    suite_name = models.CharField(max_length=100, db_index=True)
    triggered_by = models.CharField(
        max_length=20, choices=[("api", "API"), ("ci", "GitHub Actions"), ("manual", "Manual")], default="api"
    )
    total_cases = models.IntegerField(default=0)
    passed = models.IntegerField(default=0)
    failed = models.IntegerField(default=0)
    pass_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    results_payload = models.JSONField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "validation_run"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Suite: {self.suite_name} | {self.passed}/{self.total_cases} passed"


class SteelSection(AuditableModel):
    designation = models.CharField(max_length=30, unique=True, db_index=True)
    moment_of_inertia = models.DecimalField(max_digits=12, decimal_places=8, help_text="m^4")
    section_modulus = models.DecimalField(max_digits=12, decimal_places=8, help_text="m^3")
    cross_section_area = models.DecimalField(max_digits=10, decimal_places=6, help_text="m^2")
    depth = models.DecimalField(max_digits=8, decimal_places=4, help_text="m")
    flange_width = models.DecimalField(max_digits=8, decimal_places=4, help_text="m")
    web_thickness = models.DecimalField(max_digits=8, decimal_places=4, help_text="m")
    steel_grade = models.CharField(max_length=10, choices=SteelGrade.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "steel_section"
        ordering = ["designation"]

    def __str__(self):
        return f"{self.designation} ({self.steel_grade})"
