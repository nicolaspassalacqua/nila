from rest_framework import serializers
from marketplace.models import Service


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = [
            "id",
            "tenant",
            "name",
            "discipline",
            "description",
            "service_type",
            "service_config",
            "duration_min",
            "price",
            "capacity",
            "includes_subscription",
            "is_online",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["tenant"]

    def validate_service_config(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("service_config debe ser un objeto JSON.")

        included_courts = value.get("included_courts", [])
        if included_courts is None:
            included_courts = []
        if not isinstance(included_courts, list):
            raise serializers.ValidationError("included_courts debe ser una lista.")

        for index, court in enumerate(included_courts):
            if not isinstance(court, dict):
                raise serializers.ValidationError(
                    f"included_courts[{index}] debe ser un objeto con name/sport/capacity."
                )

        return value
