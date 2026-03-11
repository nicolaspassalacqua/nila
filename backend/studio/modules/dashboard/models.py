from django.db import models


class DashboardSnapshot(models.Model):
    generated_at = models.DateTimeField(auto_now_add=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-generated_at",)

    def __str__(self):
        return f"DashboardSnapshot<{self.generated_at.isoformat()}>"
