from django.db import models
from core.models import TenantOwnedModel


class Client(TenantOwnedModel):
    full_name = models.CharField(max_length=180)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    notes_private = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name
