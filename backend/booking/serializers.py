from rest_framework import serializers

from booking.models import Appointment
from core.tenant_access import get_tenant_for_request


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = [
            "id",
            "tenant",
            "service",
            "client",
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

        return attrs
