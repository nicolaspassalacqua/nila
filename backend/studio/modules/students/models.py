from django.db import models
from django.db.models import Q

from studio.modules.core.models import Establishment, Organization


class Student(models.Model):
    AUTH_PROVIDER_LOCAL = "local"
    AUTH_PROVIDER_GOOGLE = "google"
    AUTH_PROVIDER_FACEBOOK = "facebook"
    AUTH_PROVIDER_CHOICES = (
        (AUTH_PROVIDER_LOCAL, "Usuario y contrasena"),
        (AUTH_PROVIDER_GOOGLE, "Google SSO"),
        (AUTH_PROVIDER_FACEBOOK, "Facebook SSO"),
    )

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="students")
    user = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="student_profiles")
    establishments = models.ManyToManyField(Establishment, related_name="students", blank=True)
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    current_level = models.CharField(max_length=80, blank=True)
    auth_provider = models.CharField(max_length=20, choices=AUTH_PROVIDER_CHOICES, default=AUTH_PROVIDER_LOCAL)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("id",)
        constraints = [
            models.UniqueConstraint(
                fields=("organization", "user"),
                condition=Q(user__isnull=False),
                name="unique_student_profile_per_org_user",
            )
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()


class StudentHistory(models.Model):
    EVENT_CREATED = "created"
    EVENT_UPDATED = "updated"
    EVENT_ASSIGNED = "assigned_establishment"
    EVENT_JOINED = "joined_marketplace"
    EVENT_MANUAL = "manual_note"
    EVENT_CHOICES = (
        (EVENT_CREATED, "Created"),
        (EVENT_UPDATED, "Updated"),
        (EVENT_ASSIGNED, "Assigned Establishment"),
        (EVENT_JOINED, "Joined Marketplace"),
        (EVENT_MANUAL, "Manual Note"),
    )

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="history_events")
    actor = models.ForeignKey("auth.User", on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=50, choices=EVENT_CHOICES)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.student_id} - {self.event_type}"
