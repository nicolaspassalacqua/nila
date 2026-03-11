from django.conf import settings
from django.db import models

from studio.modules.classes.models import StudioClass
from studio.modules.core.models import Organization
from studio.modules.students.models import Student


class MembershipPlan(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="membership_plans")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="ARS")
    duration_days = models.PositiveIntegerField(default=30)
    classes_per_week = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("organization_id", "id")
        unique_together = ("organization", "name")

    def __str__(self):
        return f"{self.organization.name} - {self.name}"


class Payment(models.Model):
    TYPE_CLASS = "class_single"
    TYPE_MEMBERSHIP = "membership"
    TYPE_CHOICES = (
        (TYPE_CLASS, "Pago de clase"),
        (TYPE_MEMBERSHIP, "Pago de membresia"),
    )

    PROVIDER_MP = "mercadopago"
    PROVIDER_MANUAL = "manual"
    PROVIDER_CHOICES = (
        (PROVIDER_MP, "MercadoPago"),
        (PROVIDER_MANUAL, "Manual"),
    )

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELED = "canceled"
    STATUS_REFUNDED = "refunded"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Pendiente"),
        (STATUS_APPROVED, "Aprobado"),
        (STATUS_REJECTED, "Rechazado"),
        (STATUS_CANCELED, "Cancelado"),
        (STATUS_REFUNDED, "Reintegrado"),
    )

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="payments")
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    studio_class = models.ForeignKey(
        StudioClass,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    membership_plan = models.ForeignKey(
        MembershipPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_payments",
    )
    payment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default=PROVIDER_MP)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    description = models.CharField(max_length=240, blank=True)
    payer_name = models.CharField(max_length=120, blank=True)
    payer_email = models.EmailField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="ARS")
    external_reference = models.CharField(max_length=80, blank=True, unique=True)
    provider_payment_id = models.CharField(max_length=80, blank=True)
    checkout_url = models.URLField(blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "id")

    def __str__(self):
        return f"{self.id} - {self.organization.name} - {self.status}"


class Invoice(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_EMITTED = "emitted"
    STATUS_ERROR = "error"
    STATUS_CHOICES = (
        (STATUS_DRAFT, "Borrador"),
        (STATUS_EMITTED, "Emitida"),
        (STATUS_ERROR, "Error"),
    )

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="invoices")
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="invoice")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    invoice_number = models.CharField(max_length=40, blank=True)
    voucher_type = models.CharField(max_length=20, default="FACTURA_C")
    point_of_sale = models.PositiveIntegerField(default=1)
    cae = models.CharField(max_length=20, blank=True)
    cae_expires_on = models.DateField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    arca_request = models.JSONField(default=dict, blank=True)
    arca_response = models.JSONField(default=dict, blank=True)
    emitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "id")

    def __str__(self):
        return f"{self.payment_id} - {self.status}"

