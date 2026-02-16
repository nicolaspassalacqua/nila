from django.db import models
from core.models import TenantOwnedModel


class MessageTemplate(TenantOwnedModel):
    class Channel(models.TextChoices):
        WHATSAPP = "whatsapp", "WhatsApp"
        EMAIL = "email", "Email"
        PUSH = "push", "Push"

    channel = models.CharField(max_length=12, choices=Channel.choices)
    key = models.CharField(max_length=80)
    content = models.TextField()
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("tenant", "channel", "key")]
        ordering = ["channel", "key"]


class MessageQueue(TenantOwnedModel):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    channel = models.CharField(max_length=12)
    to_address = models.CharField(max_length=120)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.QUEUED)
    scheduled_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    retries = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["scheduled_at"]
