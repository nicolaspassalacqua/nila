from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.tenant_access import get_tenant_for_request
from pos.models import Product, Order, OrderItem, Payment, CashMovement, Invoice
from pos.serializers import (
    ProductSerializer,
    OrderSerializer,
    OrderItemSerializer,
    PaymentSerializer,
    CashMovementSerializer,
    InvoiceSerializer,
)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return Product.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return Order.objects.filter(tenant=tenant).prefetch_related("items")

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        tenant = get_tenant_for_request(request)
        order = self.get_queryset().get(pk=pk, tenant=tenant)
        order.status = Order.Status.PAID
        order.paid_at = timezone.now()
        order.save(update_fields=["status", "paid_at", "updated_at"])
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"], url_path="create-invoice")
    def create_invoice(self, request, pk=None):
        tenant = get_tenant_for_request(request)
        order = self.get_queryset().get(pk=pk, tenant=tenant)

        if order.total_amount <= 0:
            return Response({"detail": "La orden debe tener monto mayor a cero para facturar."}, status=status.HTTP_400_BAD_REQUEST)

        existing = Invoice.objects.filter(tenant=tenant, order=order).first()
        if existing:
            return Response(InvoiceSerializer(existing).data)

        subtotal = order.total_amount
        tax_amount = (subtotal * Decimal("0.21")).quantize(Decimal("0.01"))
        total = (subtotal + tax_amount).quantize(Decimal("0.01"))

        count = Invoice.objects.filter(tenant=tenant).count() + 1
        number = f"NILA-{tenant.id:04d}-{count:06d}"

        invoice = Invoice.objects.create(
            tenant=tenant,
            order=order,
            number=number,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total=total,
            currency=order.currency,
            status=Invoice.Status.ISSUED,
        )
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=False, methods=["get"], url_path="financial-summary")
    def financial_summary(self, request):
        tenant = get_tenant_for_request(request)
        orders = Order.objects.filter(tenant=tenant)
        payments = Payment.objects.filter(tenant=tenant)
        invoices = Invoice.objects.filter(tenant=tenant)

        orders_total = orders.aggregate(total=Sum("total_amount"))["total"] or Decimal("0")
        paid_total = payments.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        invoices_total = invoices.aggregate(total=Sum("total"))["total"] or Decimal("0")

        return Response(
            {
                "orders_count": orders.count(),
                "orders_paid_count": orders.filter(status=Order.Status.PAID).count(),
                "orders_total": str(orders_total),
                "payments_total": str(paid_total),
                "invoices_count": invoices.count(),
                "invoices_total": str(invoices_total),
                "pending_amount": str(max(orders_total - paid_total, Decimal("0"))),
            }
        )


class OrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = OrderItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return OrderItem.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        item = serializer.save(tenant=tenant)
        order = item.order
        total = sum(i.amount for i in order.items.all())
        order.total_amount = total
        order.save(update_fields=["total_amount", "updated_at"])


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return Payment.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        payment = serializer.save(tenant=tenant)
        CashMovement.objects.create(
            tenant=tenant,
            type=CashMovement.Type.IN,
            amount=payment.amount,
            category="payment",
            reference=f"payment:{payment.id}",
        )
        order = payment.order
        total_paid = order.payments.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        if total_paid >= order.total_amount and order.status != Order.Status.PAID:
            order.status = Order.Status.PAID
            order.paid_at = timezone.now()
            order.save(update_fields=["status", "paid_at", "updated_at"])


class CashMovementViewSet(viewsets.ModelViewSet):
    serializer_class = CashMovementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return CashMovement.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return Invoice.objects.filter(tenant=tenant).select_related("order")
