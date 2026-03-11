from django.conf import settings
from django.db import models

from studio.modules.core.models import Establishment, Organization, Room


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

