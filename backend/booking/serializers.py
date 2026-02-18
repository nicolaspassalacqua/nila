from rest_framework import serializers

from booking.models import Appointment, BlockedSlot
from core.tenant_access import get_tenant_for_request


class AppointmentSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "tenant",
            "service",
            "service_name",
            "client",
            "client_name",
            "court_name",
            "start_dt",
            "end_dt",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["tenant"]

    def validate(self, attrs):
        request = self.context["request"]
        tenant = get_tenant_for_request(request)

        service = attrs.get("service") or getattr(self.instance, "service", None)
        client = attrs.get("client") or getattr(self.instance, "client", None)
        start_dt = attrs.get("start_dt") or getattr(self.instance, "start_dt", None)
        end_dt = attrs.get("end_dt") or getattr(self.instance, "end_dt", None)

        if service and service.tenant_id != tenant.id:
            raise serializers.ValidationError({"service": "El servicio no pertenece al tenant activo."})

        if client and client.tenant_id != tenant.id:
            raise serializers.ValidationError({"client": "El cliente no pertenece al tenant activo."})

        if start_dt and end_dt and end_dt <= start_dt:
            raise serializers.ValidationError({"end_dt": "La fecha fin debe ser posterior al inicio."})

        court_name = (attrs.get("court_name") if "court_name" in attrs else getattr(self.instance, "court_name", "")) or ""
        court_name = str(court_name).strip()
        if court_name:
            tenant = get_tenant_for_request(request)
            tenant_courts = getattr(tenant, "court_config", []) or []
            available_names = {
                str(court.get("name", "")).strip()
                for court in tenant_courts
                if isinstance(court, dict) and str(court.get("name", "")).strip()
            }
            if available_names and court_name not in available_names:
                raise serializers.ValidationError({"court_name": "La cancha no existe en la sucursal activa."})

        return attrs


class BlockedSlotSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = BlockedSlot
        fields = [
            "id",
            "tenant",
            "court_name",
            "start_dt",
            "end_dt",
            "reason",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["tenant", "created_by", "created_by_name"]
