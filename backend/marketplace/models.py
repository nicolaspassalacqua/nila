from django.db import models
from core.models import TenantOwnedModel


class Service(TenantOwnedModel):
    class ServiceType(models.TextChoices):
        TURNO = "turno", "Turno"
        CLASE_GRUPAL = "clase_grupal", "Clase grupal"
        TRATAMIENTO = "tratamiento", "Tratamiento"
        ALQUILER_CANCHA = "alquiler_cancha", "Alquiler de cancha"

    name = models.CharField(max_length=140)
    discipline = models.CharField(max_length=80)
    description = models.TextField(blank=True, default="")
    service_type = models.CharField(max_length=24, choices=ServiceType.choices, default=ServiceType.TURNO)
    duration_min = models.PositiveIntegerField(default=60)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    capacity = models.PositiveIntegerField(default=1)
    includes_subscription = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
