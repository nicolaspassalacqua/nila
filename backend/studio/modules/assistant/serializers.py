from rest_framework import serializers

from .models import AIAssistantConfig, AIAssistantInteraction


class AIAssistantConfigSerializer(serializers.ModelSerializer):
    provider_label = serializers.CharField(source="get_provider_display", read_only=True)

    class Meta:
        model = AIAssistantConfig
        fields = (
            "id",
            "organization",
            "provider",
            "provider_label",
            "model",
            "api_key",
            "base_url",
            "system_prompt",
            "temperature",
            "max_context_items",
            "include_classes_context",
            "include_students_context",
            "include_finance_context",
            "include_instructors_context",
            "is_enabled",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class AIAssistantInteractionSerializer(serializers.ModelSerializer):
    provider_label = serializers.CharField(source="get_provider_display", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = AIAssistantInteraction
        fields = (
            "id",
            "organization",
            "user",
            "username",
            "provider",
            "provider_label",
            "model",
            "question",
            "answer",
            "status",
            "error_message",
            "context_snapshot",
            "created_at",
        )
        read_only_fields = fields
