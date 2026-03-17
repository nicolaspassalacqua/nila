from django.contrib.auth import get_user_model
from rest_framework import serializers

from studio.models import Organization, OrganizationMembership

from .models import PlatformSetting, PlatformSubscriptionPlan

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    roles = serializers.SerializerMethodField(read_only=True)
    owner_memberships = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_staff",
            "password",
            "roles",
            "owner_memberships",
        )
        read_only_fields = ("id", "roles", "owner_memberships")

    def get_roles(self, obj):
        return list(obj.groups.values_list("name", flat=True))

    def get_owner_memberships(self, obj):
        memberships = OrganizationMembership.objects.filter(user=obj, role=OrganizationMembership.ROLE_OWNER).select_related(
            "organization"
        )
        return [
            {
                "organization_id": membership.organization_id,
                "organization_name": membership.organization.name,
                "is_active": membership.is_active,
            }
            for membership in memberships
        ]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class PlatformSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = (
            "allow_google_sso",
            "allow_facebook_sso",
            "google_client_id",
            "facebook_app_id",
            "facebook_app_secret",
            "updated_at",
        )
        read_only_fields = ("updated_at",)


class PlatformSubscriptionPlanSerializer(serializers.ModelSerializer):
    organizations_count = serializers.SerializerMethodField(read_only=True)

    def validate_code(self, value):
        normalized = (value or "").strip().lower().replace(" ", "_")
        if not normalized:
            raise serializers.ValidationError("code es requerido")
        if self.instance and self.instance.code != normalized:
            raise serializers.ValidationError("No se puede cambiar el codigo de un plan existente")
        return normalized

    def validate_features(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("features debe ser una lista")
        return [str(item).strip() for item in value if str(item).strip()]

    def validate_included_modules(self, value):
        allowed_modules = {
            "configuracion",
            "pos",
            "alumnos",
            "clases",
            "tutoriales",
            "tableros",
            "contactos",
            "redes_sociales",
            "ia_asistente",
        }
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("included_modules debe ser una lista")
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        invalid = [item for item in cleaned if item not in allowed_modules]
        if invalid:
            raise serializers.ValidationError(f"Modulos invalidos: {', '.join(invalid)}")
        return cleaned

    def get_organizations_count(self, obj):
        return Organization.objects.filter(subscription_plan=obj.code, subscription_enabled=True).count()

    class Meta:
        model = PlatformSubscriptionPlan
        fields = (
            "id",
            "code",
            "name",
            "marketing_tag",
            "description",
            "price",
            "currency",
            "billing_period",
            "trial_days",
            "cta_label",
            "features",
            "included_modules",
            "mercadolibre_enabled",
            "electronic_billing_enabled",
            "is_active",
            "is_public",
            "allow_self_signup",
            "sort_order",
            "organizations_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "organizations_count", "created_at", "updated_at")
