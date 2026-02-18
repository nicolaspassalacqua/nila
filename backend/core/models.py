from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Company(TimeStampedModel):
    class Currency(models.TextChoices):
        ARS = "ARS", "ARS"
        USD = "USD", "USD"
        EUR = "EUR", "EUR"

    class TaxCondition(models.TextChoices):
        MONOTRIBUTO = "monotributo", "Monotributista"
        RESPONSABLE_INSCRIPTO = "responsable_inscripto", "Responsable Inscripto"
        EXENTO = "exento", "Exento"
        CONSUMIDOR_FINAL = "consumidor_final", "Consumidor Final"

    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_profile",
    )
    trade_name = models.CharField(max_length=180)
    primary_zone = models.CharField(max_length=160, blank=True, default="")
    currency = models.CharField(max_length=8, choices=Currency.choices, default=Currency.ARS)
    tax_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    legal_name = models.CharField(max_length=220, blank=True, default="")
    tax_condition = models.CharField(
        max_length=40,
        choices=TaxCondition.choices,
        default=TaxCondition.MONOTRIBUTO,
    )
    cuit = models.CharField(max_length=20, blank=True, default="")
    billing_address = models.CharField(max_length=240, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["trade_name"]

    def __str__(self):
        return self.trade_name


class Tenant(TimeStampedModel):
    class RevenueModel(models.TextChoices):
        TURNOS = "turnos", "Turnos"
        SUSCRIPCIONES = "suscripciones", "Suscripciones"
        MIXTO = "mixto", "Mixto"

    class EstablishmentType(models.TextChoices):
        SALA = "sala", "Sala"
        CABINA = "cabina", "Cabina"
        PUESTO = "puesto", "Puesto"
        CANCHA = "cancha", "Cancha"

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="establishments",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=140)
    photo_url = models.URLField(max_length=500, blank=True, default="")
    address = models.CharField(max_length=220, blank=True, default="")
    description = models.TextField(blank=True, default="")
    revenue_model = models.CharField(max_length=24, choices=RevenueModel.choices, default=RevenueModel.MIXTO)
    establishment_type = models.CharField(max_length=20, choices=EstablishmentType.choices, default=EstablishmentType.SALA)
    court_config = models.JSONField(default=list, blank=True)
    capacity = models.PositiveIntegerField(default=1)
    opening_hours = models.CharField(max_length=220, blank=True, default="")
    cancellation_policy = models.CharField(max_length=220, blank=True, default="")
    tolerance_minutes = models.PositiveIntegerField(default=10)
    allow_online_payments = models.BooleanField(default=False)
    allow_local_payments = models.BooleanField(default=True)
    prepay_required = models.BooleanField(default=False)
    cancellation_penalty_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    slug = models.SlugField(max_length=160, unique=True)
    plan = models.CharField(max_length=40, default="starter")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class TenantMembership(TimeStampedModel):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        STAFF = "staff", "Staff"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tenant_memberships")
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.STAFF)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("tenant", "user")]


class TenantOwnedModel(TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)

    class Meta:
        abstract = True


class PlatformSetting(TimeStampedModel):
    class ValueType(models.TextChoices):
        STRING = "string", "String"
        NUMBER = "number", "Number"
        BOOLEAN = "boolean", "Boolean"
        JSON = "json", "JSON"

    key = models.SlugField(max_length=120, unique=True)
    value_type = models.CharField(max_length=16, choices=ValueType.choices, default=ValueType.STRING)
    value = models.JSONField(null=True, blank=True)
    description = models.CharField(max_length=240, blank=True, default="")
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_platform_settings",
    )

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return self.key


class TenantRating(TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="ratings")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tenant_ratings",
    )
    score = models.PositiveSmallIntegerField(default=5)
    comment = models.CharField(max_length=300, blank=True, default="")

    class Meta:
        unique_together = [("tenant", "user")]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.tenant_id}:{self.user_id}:{self.score}"


class TenantSubscriptionPlan(TimeStampedModel):
    class BillingCycle(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="subscription_plans")
    name = models.CharField(max_length=120, default="Plan mensual")
    description = models.CharField(max_length=240, blank=True, default="")
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    billing_cycle = models.CharField(max_length=16, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["price", "name"]

    def __str__(self):
        return f"{self.tenant_id}:{self.name}"


class TenantSubscription(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="subscriptions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tenant_subscriptions",
    )
    plan = models.ForeignKey(
        TenantSubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscriptions",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    label = models.CharField(max_length=140, blank=True, default="")
    starts_at = models.DateTimeField(auto_now_add=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("tenant", "user")]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.tenant_id}:{self.user_id}:{self.status}"
