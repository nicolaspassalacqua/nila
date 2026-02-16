from django.db import models
from core.models import TenantOwnedModel
from crm.models import Client


class Product(TenantOwnedModel):
    class Type(models.TextChoices):
        SERVICE = "service", "Service"
        PRODUCT = "product", "Product"
        PACK = "pack", "Pack"

    name = models.CharField(max_length=140)
    type = models.CharField(max_length=12, choices=Type.choices, default=Type.SERVICE)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]


class Order(TenantOwnedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    client = models.ForeignKey(Client, null=True, blank=True, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="ARS")
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class OrderItem(TenantOwnedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    qty = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)


class Payment(TenantOwnedModel):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        TRANSFER = "transfer", "Transfer"
        QR = "qr", "QR"
        CARD = "card", "Card"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    method = models.CharField(max_length=12, choices=Method.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    external_ref = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]


class CashMovement(TenantOwnedModel):
    class Type(models.TextChoices):
        IN = "in", "In"
        OUT = "out", "Out"

    type = models.CharField(max_length=8, choices=Type.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=80)
    reference = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]


class Invoice(TenantOwnedModel):
    class Status(models.TextChoices):
        ISSUED = "issued", "Issued"
        VOID = "void", "Void"

    order = models.OneToOneField(Order, on_delete=models.PROTECT, related_name="invoice")
    number = models.CharField(max_length=40)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="ARS")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ISSUED)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]
        unique_together = [("tenant", "number")]
