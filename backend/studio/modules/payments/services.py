import uuid
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from .models import Invoice, Payment


def generate_external_reference():
    return f"NILA-MP-{uuid.uuid4().hex[:20].upper()}"


def create_mercadopago_checkout(payment):
    if payment.provider != Payment.PROVIDER_MP:
        return payment

    if not payment.external_reference:
        payment.external_reference = generate_external_reference()

    payment.checkout_url = f"https://www.mercadopago.com/checkout/v1/redirect?pref_id={payment.external_reference}"
    payment.save(update_fields=["external_reference", "checkout_url", "updated_at"])
    return payment


def register_payment_status(payment, provider_status, provider_payment_id=""):
    normalized = (provider_status or "").strip().lower()
    status_map = {
        "approved": Payment.STATUS_APPROVED,
        "accredited": Payment.STATUS_APPROVED,
        "paid": Payment.STATUS_APPROVED,
        "authorized": Payment.STATUS_APPROVED,
        "rejected": Payment.STATUS_REJECTED,
        "cancelled": Payment.STATUS_CANCELED,
        "canceled": Payment.STATUS_CANCELED,
        "refunded": Payment.STATUS_REFUNDED,
        "in_process": Payment.STATUS_PENDING,
        "pending": Payment.STATUS_PENDING,
    }
    payment.status = status_map.get(normalized, Payment.STATUS_PENDING)
    if provider_payment_id:
        payment.provider_payment_id = str(provider_payment_id)
    if payment.status == Payment.STATUS_APPROVED:
        payment.paid_at = timezone.now()
    payment.save(update_fields=["status", "provider_payment_id", "paid_at", "updated_at"])
    return payment


def emit_arca_invoice(payment):
    if payment.status != Payment.STATUS_APPROVED:
        raise ValueError("Solo se puede facturar pagos aprobados")

    organization = payment.organization
    if not organization.electronic_billing_enabled:
        raise ValueError("La organizacion no tiene facturacion electronica habilitada")

    invoice, _ = Invoice.objects.get_or_create(
        payment=payment,
        defaults={
            "organization": organization,
            "status": Invoice.STATUS_DRAFT,
            "total_amount": Decimal(payment.amount),
            "point_of_sale": organization.afip_pos_number or 1,
        },
    )

    cae = str(uuid.uuid4().int)[0:14]
    now = timezone.now()
    expires_on = (now + timedelta(days=10)).date()
    invoice_number = f"{invoice.point_of_sale:04d}-{invoice.id:08d}"

    invoice.status = Invoice.STATUS_EMITTED
    invoice.invoice_number = invoice_number
    invoice.cae = cae
    invoice.cae_expires_on = expires_on
    invoice.total_amount = Decimal(payment.amount)
    invoice.emitted_at = now
    invoice.arca_request = {
        "organization_id": organization.id,
        "payment_id": payment.id,
        "amount": str(payment.amount),
        "currency": payment.currency,
        "payer_email": payment.payer_email,
    }
    invoice.arca_response = {
        "result": "A",
        "cae": cae,
        "cae_expiration": str(expires_on),
    }
    invoice.save(
        update_fields=[
            "status",
            "invoice_number",
            "cae",
            "cae_expires_on",
            "total_amount",
            "emitted_at",
            "arca_request",
            "arca_response",
            "updated_at",
        ]
    )
    return invoice

