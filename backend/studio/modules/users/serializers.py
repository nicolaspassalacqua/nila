from django.contrib.auth import get_user_model
from rest_framework import serializers

from studio.models import OrganizationMembership

from .models import PlatformSetting

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
        fields = ("allow_google_sso", "allow_facebook_sso", "updated_at")
        read_only_fields = ("updated_at",)
