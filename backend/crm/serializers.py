from rest_framework import serializers
from crm.models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "tenant", "full_name", "email", "phone", "notes_private", "created_at", "updated_at"]
        read_only_fields = ["tenant"]
