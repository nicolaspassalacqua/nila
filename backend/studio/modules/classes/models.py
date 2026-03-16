from django.conf import settings
from django.db import models

from studio.modules.core.models import Establishment, Organization, Room


class InstructorProfile(models.Model):
    COMPENSATION_HOURLY = "hourly"
    COMPENSATION_MONTHLY = "monthly"
    COMPENSATION_PER_CLASS = "per_class"
    COMPENSATION_MIXED = "mixed"
    COMPENSATION_CHOICES = (
        (COMPENSATION_HOURLY, "Pago por hora"),
        (COMPENSATION_MONTHLY, "Sueldo mensual"),
        (COMPENSATION_PER_CLASS, "Pago por clase"),
        (COMPENSATION_MIXED, "Esquema mixto"),
    )

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="instructor_profiles")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="instructor_profiles")
    compensation_scheme = models.CharField(
        max_length=20,
        choices=COMPENSATION_CHOICES,
        default=COMPENSATION_HOURLY,
    )
    hourly_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    class_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="ARS")
    started_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("organization_id", "user_id")
        unique_together = ("organization", "user")

    def __str__(self):
        return f"{self.organization.name} - {self.user.username}"


class InstructorSettlement(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pendiente"),
        (STATUS_PAID, "Pagado"),
    )

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="instructor_settlements")
    instructor_profile = models.ForeignKey(
        InstructorProfile,
        on_delete=models.CASCADE,
        related_name="settlements",
    )
    period_year = models.PositiveIntegerField()
    period_month = models.PositiveSmallIntegerField()
    compensation_scheme = models.CharField(max_length=20, choices=InstructorProfile.COMPENSATION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="ARS")
    month_classes = models.PositiveIntegerField(default=0)
    month_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    completed_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-period_year", "-period_month", "organization_id", "instructor_profile_id")
        unique_together = ("organization", "instructor_profile", "period_year", "period_month")

    def __str__(self):
        return (
            f"{self.organization.name} - {self.instructor_profile.user.username} "
            f"- {self.period_year:04d}-{self.period_month:02d}"
        )


class StudioClass(models.Model):
    STATUS_SCHEDULED = "scheduled"
    STATUS_CANCELED = "canceled"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = (
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_CANCELED, "Canceled"),
        (STATUS_COMPLETED, "Completed"),
    )

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="classes")
    establishment = models.ForeignKey(Establishment, on_delete=models.CASCADE, related_name="classes")
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name="classes")
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="instructed_classes",
    )
    name = models.CharField(max_length=150)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("start_at", "id")

    def __str__(self):
        return f"{self.name} ({self.start_at})"
