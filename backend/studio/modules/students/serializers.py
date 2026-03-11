from django.contrib.auth import get_user_model
from rest_framework import serializers

from studio.models import Establishment, Student, StudentHistory

User = get_user_model()


class StudentHistorySerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = StudentHistory
        fields = ("id", "event_type", "description", "metadata", "created_at", "actor", "actor_username")
        read_only_fields = ("id", "created_at", "actor_username")


class StudentSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    establishment_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    establishments = serializers.SerializerMethodField(read_only=True)
    history_events = StudentHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = (
            "id",
            "organization",
            "organization_name",
            "user",
            "user_username",
            "user_email",
            "first_name",
            "last_name",
            "email",
            "phone",
            "birth_date",
            "current_level",
            "auth_provider",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
            "establishments",
            "establishment_ids",
            "history_events",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "establishments",
            "history_events",
            "user_username",
            "user_email",
            "organization_name",
        )

    def get_establishments(self, obj):
        return [{"id": e.id, "name": e.name, "organization": e.organization_id} for e in obj.establishments.all()]

    def validate_establishment_ids(self, value):
        if not value:
            return value

        unique_ids = sorted(set(value))
        existing_count = Establishment.objects.filter(id__in=unique_ids).count()
        if existing_count != len(unique_ids):
            raise serializers.ValidationError("Una o mas sedes no existen")
        return unique_ids

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        organization = attrs.get("organization", instance.organization if instance else None)
        user = attrs.get("user", instance.user if instance else None)
        establishment_ids = attrs.get("establishment_ids", None)
        errors = {}

        if user and organization:
            duplicate_qs = Student.objects.filter(user=user, organization=organization)
            if instance:
                duplicate_qs = duplicate_qs.exclude(id=instance.id)
            if duplicate_qs.exists():
                errors["user"] = "El alumno ya tiene perfil en esta organizacion"

        if establishment_ids is not None and organization:
            wrong_org_ids = list(
                Establishment.objects.filter(id__in=establishment_ids).exclude(organization_id=organization.id).values_list("id", flat=True)
            )
            if wrong_org_ids:
                errors["establishment_ids"] = "Una o mas sedes no pertenecen a la organizacion del alumno"

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):
        establishment_ids = validated_data.pop("establishment_ids", [])
        student = super().create(validated_data)
        if establishment_ids:
            student.establishments.set(Establishment.objects.filter(id__in=establishment_ids))
        return student

    def update(self, instance, validated_data):
        establishment_ids = validated_data.pop("establishment_ids", None)
        student = super().update(instance, validated_data)
        if establishment_ids is not None:
            student.establishments.set(Establishment.objects.filter(id__in=establishment_ids))
        return student
