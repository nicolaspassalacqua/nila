from rest_framework import serializers

from core.tenant_access import get_tenant_for_request
from waitlist.models import Waitlist, WaitlistEntry, WaitlistOffer


class WaitlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Waitlist
        fields = [
            "id", "tenant", "service", "desired_date", "time_window_start", "time_window_end",
            "status", "created_at", "updated_at"
        ]
        read_only_fields = ["tenant"]

    def validate(self, attrs):
        request = self.context["request"]
        tenant = get_tenant_for_request(request)

        service = attrs.get("service") or getattr(self.instance, "service", None)
        if service and service.tenant_id != tenant.id:
            raise serializers.ValidationError({"service": "El servicio no pertenece al tenant activo."})

        start = attrs.get("time_window_start")
        end = attrs.get("time_window_end")
        if start and end and end <= start:
            raise serializers.ValidationError({"time_window_end": "El fin debe ser posterior al inicio."})

        return attrs


class WaitlistEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistEntry
        fields = ["id", "tenant", "waitlist", "client", "priority", "created_at", "updated_at"]
        read_only_fields = ["tenant"]

    def validate(self, attrs):
        request = self.context["request"]
        tenant = get_tenant_for_request(request)

        waitlist = attrs.get("waitlist") or getattr(self.instance, "waitlist", None)
        client = attrs.get("client") or getattr(self.instance, "client", None)

        if waitlist and waitlist.tenant_id != tenant.id:
            raise serializers.ValidationError({"waitlist": "La waitlist no pertenece al tenant activo."})
        if client and client.tenant_id != tenant.id:
            raise serializers.ValidationError({"client": "El cliente no pertenece al tenant activo."})

        return attrs


class WaitlistOfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistOffer
        fields = ["id", "tenant", "appointment", "entry", "expires_at", "status", "created_at", "updated_at"]
        read_only_fields = ["tenant"]

    def validate(self, attrs):
        request = self.context["request"]
        tenant = get_tenant_for_request(request)

        appointment = attrs.get("appointment") or getattr(self.instance, "appointment", None)
        entry = attrs.get("entry") or getattr(self.instance, "entry", None)

        if appointment and appointment.tenant_id != tenant.id:
            raise serializers.ValidationError({"appointment": "El turno no pertenece al tenant activo."})
        if entry and entry.tenant_id != tenant.id:
            raise serializers.ValidationError({"entry": "La entrada de waitlist no pertenece al tenant activo."})

        if appointment and entry and appointment.service_id != entry.waitlist.service_id:
            raise serializers.ValidationError("El servicio del turno no coincide con la waitlist.")

        return attrs
