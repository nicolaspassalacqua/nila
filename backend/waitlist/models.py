from django.db import models
from core.models import TenantOwnedModel
from crm.models import Client
from marketplace.models import Service
from booking.models import Appointment


class Waitlist(TenantOwnedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="waitlists")
    desired_date = models.DateField()
    time_window_start = models.TimeField(null=True, blank=True)
    time_window_end = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["-desired_date", "-created_at"]


class WaitlistEntry(TenantOwnedModel):
    waitlist = models.ForeignKey(Waitlist, on_delete=models.CASCADE, related_name="entries")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="waitlist_entries")
    priority = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ["priority", "created_at"]
        unique_together = [("waitlist", "client")]


class WaitlistOffer(TenantOwnedModel):
    class Status(models.TextChoices):
        OFFERED = "offered", "Offered"
        ACCEPTED = "accepted", "Accepted"
        EXPIRED = "expired", "Expired"
        REJECTED = "rejected", "Rejected"

    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="waitlist_offers")
    entry = models.ForeignKey(WaitlistEntry, on_delete=models.CASCADE, related_name="offers")
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OFFERED)

    class Meta:
        ordering = ["-created_at"]
