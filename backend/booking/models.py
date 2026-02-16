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
