from decimal import Decimal

from rest_framework import serializers

from core.tenant_access import get_tenant_for_request
from pos.models import Product, Order, OrderItem, Payment, CashMovement, Invoice


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "tenant", "name", "type", "price", "is_active", "created_at", "updated_at"]
        read_only_fields = ["tenant"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "tenant", "order", "product", "qty", "unit_price", "amount", "created_at", "updated_at"]
        read_only_fields = ["tenant", "amount"]

    def validate(self, attrs):
        request = self.context["request"]
        tenant = get_tenant_for_request(request)

        order = attrs.get("order") or getattr(self.instance, "order", None)
        product = attrs.get("product") or getattr(self.instance, "product", None)
        qty = attrs.get("qty") or getattr(self.instance, "qty", 1)
        unit_price = attrs.get("unit_price") or getattr(self.instance, "unit_price", Decimal("0"))

        if order and order.tenant_id != tenant.id:
            raise serializers.ValidationError({"order": "La orden no pertenece al tenant activo."})
        if product and product.tenant_id != tenant.id:
            raise serializers.ValidationError({"product": "El producto no pertenece al tenant activo."})

        if qty <= 0:
            raise serializers.ValidationError({"qty": "La cantidad debe ser mayor a cero."})
        if unit_price < 0:
            raise serializers.ValidationError({"unit_price": "El precio unitario no puede ser negativo."})

        attrs["amount"] = Decimal(qty) * unit_price
        return attrs


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "tenant", "client", "status", "total_amount", "currency", "paid_at",
            "items", "created_at", "updated_at"
        ]
        read_only_fields = ["tenant", "total_amount"]

    def validate(self, attrs):
        request = self.context["request"]
        tenant = get_tenant_for_request(request)
        client = attrs.get("client")

        if client and client.tenant_id != tenant.id:
            raise serializers.ValidationError({"client": "El cliente no pertenece al tenant activo."})

        return attrs


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            "id",
            "tenant",
            "order",
            "number",
            "subtotal",
            "tax_amount",
            "total",
            "currency",
            "status",
            "issued_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["tenant", "number", "subtotal", "tax_amount", "total", "currency", "issued_at"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "tenant", "order", "method", "amount", "external_ref", "created_at", "updated_at"]
        read_only_fields = ["tenant"]

    def validate(self, attrs):
        request = self.context["request"]
        tenant = get_tenant_for_request(request)
        order = attrs.get("order") or getattr(self.instance, "order", None)
        amount = attrs.get("amount") or getattr(self.instance, "amount", Decimal("0"))

        if order and order.tenant_id != tenant.id:
            raise serializers.ValidationError({"order": "La orden no pertenece al tenant activo."})

        if amount <= 0:
            raise serializers.ValidationError({"amount": "El monto debe ser mayor a cero."})

        return attrs


class CashMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashMovement
        fields = ["id", "tenant", "type", "amount", "category", "reference", "created_at", "updated_at"]
        read_only_fields = ["tenant"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto debe ser mayor a cero.")
        return value
