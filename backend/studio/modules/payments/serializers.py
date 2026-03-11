from decimal import Decimal

from rest_framework import serializers

from .models import Invoice, MembershipPlan, Payment


class MembershipPlanSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = MembershipPlan
        fields = (
            "id",
            "organization",
            "organization_name",
            "name",
            "description",
            "price",
            "currency",
            "duration_days",
            "classes_per_week",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        price = attrs.get("price")
        duration_days = attrs.get("duration_days")
        classes_per_week = attrs.get("classes_per_week")
        errors = {}

        if price is not None and price <= 0:
            errors["price"] = "El precio debe ser mayor a 0"
        if duration_days is not None and duration_days <= 0:
            errors["duration_days"] = "La duracion debe ser mayor a 0 dias"
        if classes_per_week is not None and classes_per_week <= 0:
            errors["classes_per_week"] = "classes_per_week debe ser mayor a 0"
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    class_name = serializers.CharField(source="studio_class.name", read_only=True)
    membership_plan_name = serializers.CharField(source="membership_plan.name", read_only=True)
    student_name = serializers.SerializerMethodField()
    invoice_status = serializers.CharField(source="invoice.status", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "organization",
            "organization_name",
            "student",
            "student_name",
            "studio_class",
            "class_name",
            "membership_plan",
            "membership_plan_name",
            "created_by",
            "payment_type",
            "provider",
            "status",
            "description",
            "payer_name",
            "payer_email",
            "amount",
            "currency",
            "external_reference",
            "provider_payment_id",
            "checkout_url",
            "paid_at",
            "metadata",
            "invoice_status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "external_reference",
            "provider_payment_id",
            "checkout_url",
            "paid_at",
            "created_at",
            "updated_at",
        )

    def get_student_name(self, obj):
        if not obj.student_id:
            return ""
        return f"{obj.student.first_name} {obj.student.last_name}".strip()

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        organization = attrs.get("organization", instance.organization if instance else None)
        payment_type = attrs.get("payment_type", instance.payment_type if instance else None)
        studio_class = attrs.get("studio_class", instance.studio_class if instance else None)
        membership_plan = attrs.get("membership_plan", instance.membership_plan if instance else None)
        student = attrs.get("student", instance.student if instance else None)
        amount = attrs.get("amount", instance.amount if instance else None)

        errors = {}

        if amount is not None and Decimal(amount) <= 0:
            errors["amount"] = "El monto debe ser mayor a 0"

        if payment_type == Payment.TYPE_CLASS:
            if not studio_class:
                errors["studio_class"] = "studio_class es requerido para pago de clase"
            if membership_plan:
                errors["membership_plan"] = "No corresponde para pago de clase"
        elif payment_type == Payment.TYPE_MEMBERSHIP:
            if not membership_plan:
                errors["membership_plan"] = "membership_plan es requerido para pago de membresia"
            if studio_class:
                errors["studio_class"] = "No corresponde para pago de membresia"
        else:
            errors["payment_type"] = "Tipo de pago invalido"

        if studio_class and organization and studio_class.organization_id != organization.id:
            errors["studio_class"] = "La clase no pertenece a la organizacion"

        if membership_plan and organization and membership_plan.organization_id != organization.id:
            errors["membership_plan"] = "El plan no pertenece a la organizacion"

        if student and organization and student.organization_id != organization.id:
            errors["student"] = "El alumno no pertenece a la organizacion"

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


class InvoiceSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    payment_status = serializers.CharField(source="payment.status", read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id",
            "organization",
            "organization_name",
            "payment",
            "payment_status",
            "status",
            "invoice_number",
            "voucher_type",
            "point_of_sale",
            "cae",
            "cae_expires_on",
            "total_amount",
            "arca_request",
            "arca_response",
            "emitted_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization_name",
            "payment_status",
            "created_at",
            "updated_at",
        )
