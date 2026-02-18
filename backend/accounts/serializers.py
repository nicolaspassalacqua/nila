from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "full_name", "phone", "avatar_url", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "full_name", "phone", "avatar_url", "is_staff", "is_active"]


class InternalProfessionalSerializer(serializers.ModelSerializer):
    tenant_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "full_name",
            "phone",
            "is_active",
            "tenant_count",
            "last_login",
            "date_joined",
        ]
        read_only_fields = ["id", "tenant_count", "last_login", "date_joined"]
