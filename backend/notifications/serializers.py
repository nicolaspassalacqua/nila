from rest_framework import serializers
from notifications.models import MessageTemplate, MessageQueue


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = ["id", "tenant", "channel", "key", "content", "is_active", "created_at", "updated_at"]
        read_only_fields = ["tenant"]


class MessageQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageQueue
        fields = [
            "id", "tenant", "channel", "to_address", "payload", "status", "scheduled_at",
            "sent_at", "retries", "created_at", "updated_at"
        ]
        read_only_fields = ["tenant"]
