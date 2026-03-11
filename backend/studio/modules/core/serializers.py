from django.utils import timezone
from rest_framework import serializers

from studio.models import Establishment, Organization, Room


class OrganizationSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        errors = {}
        creating = self.instance is None

        if creating:
            required_fields = (
                ("legal_name", "razon_social"),
                ("tax_id", "cuit"),
                ("address", "direccion"),
                ("tax_condition", "condicion_fiscal"),
            )
            for field_name, error_key in required_fields:
                value = (attrs.get(field_name) or "").strip() if isinstance(attrs.get(field_name), str) else attrs.get(field_name)
                if not value:
                    errors[field_name] = f"{error_key} es requerido"

        tax_id = attrs.get("tax_id")
        if isinstance(tax_id, str) and tax_id:
            normalized = "".join(ch for ch in tax_id if ch.isdigit())
            if len(normalized) != 11:
                errors["tax_id"] = "CUIT invalido. Debe contener 11 digitos"

        afip_pos_number = attrs.get("afip_pos_number")
        if afip_pos_number is not None and afip_pos_number <= 0:
            errors["afip_pos_number"] = "Punto de venta invalido"

        activity_start_date = attrs.get("activity_start_date")
        if activity_start_date and activity_start_date > timezone.now().date():
            errors["activity_start_date"] = "La fecha de inicio de actividades no puede estar en el futuro"

        enabled_modules = attrs.get("enabled_modules")
        if enabled_modules is not None:
            allowed_modules = {
                "configuracion",
                "pos",
                "alumnos",
                "clases",
                "tutoriales",
                "tableros",
                "contactos",
                "redes_sociales",
            }
            if not isinstance(enabled_modules, list):
                errors["enabled_modules"] = "enabled_modules debe ser una lista"
            elif any(module not in allowed_modules for module in enabled_modules):
                errors["enabled_modules"] = "Uno o mas modulos no son validos"

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "logo",
            "legal_name",
            "tax_id",
            "address",
            "tax_condition",
            "enabled_modules",
            "fiscal_document_issued",
            "mercadolibre_enabled",
            "electronic_billing_enabled",
            "email",
            "phone",
            "fiscal_street",
            "fiscal_street_number",
            "fiscal_floor",
            "fiscal_apartment",
            "fiscal_city",
            "fiscal_province",
            "fiscal_postal_code",
            "activity_start_date",
            "main_activity_code",
            "fiscal_email",
            "fiscal_phone",
            "iibb_number",
            "iibb_type",
            "iibb_jurisdiction",
            "iibb_condition",
            "afip_pos_number",
            "afip_pos_billing_system",
            "afip_pos_address",
            "wsaa_certificate_alias",
            "afip_environment",
            "is_active",
            "subscription_enabled",
            "subscription_plan",
            "created_at",
        )
        read_only_fields = ("fiscal_document_issued",)


class EstablishmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Establishment
        fields = "__all__"


class RoomSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        blocked_from = attrs.get("blocked_from", instance.blocked_from if instance else None)
        blocked_to = attrs.get("blocked_to", instance.blocked_to if instance else None)
        is_blocked = attrs.get("is_blocked", instance.is_blocked if instance else False)

        if blocked_from and blocked_to and blocked_to < blocked_from:
            raise serializers.ValidationError({"blocked_to": "La fecha de fin de bloqueo debe ser mayor al inicio"})

        if is_blocked and not attrs.get("blocked_reason", instance.blocked_reason if instance else ""):
            raise serializers.ValidationError({"blocked_reason": "Debe indicar un motivo de bloqueo"})

        return attrs

    class Meta:
        model = Room
        fields = "__all__"

