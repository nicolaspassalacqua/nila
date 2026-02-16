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
