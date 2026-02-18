from django.conf import settings
from django.db import models

from core.models import TenantOwnedModel
from crm.models import Client
from marketplace.models import Service


class Appointment(TenantOwnedModel):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No show"

    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="appointments")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="appointments")
    court_name = models.CharField(max_length=120, blank=True, default="")
    start_dt = models.DateTimeField()
    end_dt = models.DateTimeField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.REQUESTED)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-start_dt"]
        indexes = [
            models.Index(fields=["tenant", "start_dt"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def __str__(self):
        return f"{self.client} - {self.start_dt}"


class BlockedSlot(TenantOwnedModel):
    court_name = models.CharField(max_length=120, blank=True, default="")
    start_dt = models.DateTimeField()
    end_dt = models.DateTimeField()
    reason = models.CharField(max_length=220, blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="blocked_slots_created",
    )

    class Meta:
        ordering = ["-start_dt"]
        indexes = [
            models.Index(fields=["tenant", "start_dt"]),
            models.Index(fields=["tenant", "court_name"]),
        ]

    def __str__(self):
        return f"Blocked {self.tenant_id} {self.start_dt} {self.court_name}"
