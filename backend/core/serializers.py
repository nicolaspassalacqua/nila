from rest_framework import serializers

from core.models import Company, PlatformSetting, Tenant, TenantMembership, TenantRating


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            "id",
            "trade_name",
            "primary_zone",
            "currency",
            "tax_rate_percent",
            "legal_name",
            "tax_condition",
            "cuit",
            "billing_address",
            "email",
            "phone",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def validate_cuit(self, value):
        digits = "".join(ch for ch in (value or "") if ch.isdigit())
        if digits and len(digits) != 11:
            raise serializers.ValidationError("El CUIT debe tener 11 digitos.")
        return value

    def validate_tax_rate_percent(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("El impuesto debe estar entre 0 y 100.")
        return value


class TenantSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.trade_name", read_only=True)

    class Meta:
        model = Tenant
        fields = [
            "id",
            "company",
            "company_name",
            "name",
            "photo_url",
            "address",
            "description",
            "revenue_model",
            "establishment_type",
            "court_config",
            "capacity",
            "opening_hours",
            "cancellation_policy",
            "tolerance_minutes",
            "allow_online_payments",
            "allow_local_payments",
            "prepay_required",
            "cancellation_penalty_percent",
            "slug",
            "plan",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["company", "company_name"]

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("La capacidad debe ser mayor o igual a 1.")
        return value

    def validate_court_config(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("La configuracion de canchas debe ser una lista.")

        allowed_sports = {"futbol", "padel", "tenis", "otro"}
        normalized = []
        for index, raw_item in enumerate(value):
            if not isinstance(raw_item, dict):
                raise serializers.ValidationError("Cada cancha debe ser un objeto valido.")

            name = str(raw_item.get("name") or "").strip() or f"Cancha {index + 1}"
            sport = str(raw_item.get("sport") or "otro").strip().lower() or "otro"
            if sport not in allowed_sports:
                raise serializers.ValidationError(
                    f"Deporte no valido en cancha {index + 1}. Usa futbol, padel, tenis u otro."
                )

            raw_capacity = raw_item.get("capacity", 1)
            try:
                capacity = int(raw_capacity)
            except (TypeError, ValueError):
                raise serializers.ValidationError(f"La capacidad de la cancha {index + 1} debe ser numerica.")

            if capacity < 1:
                raise serializers.ValidationError(
                    f"La capacidad de la cancha {index + 1} debe ser mayor o igual a 1."
                )

            normalized.append(
                {
                    "name": name,
                    "sport": sport,
                    "capacity": capacity,
                }
            )
        return normalized

    def validate_tolerance_minutes(self, value):
        if value < 0 or value > 180:
            raise serializers.ValidationError("La tolerancia debe estar entre 0 y 180 minutos.")
        return value

    def validate_cancellation_penalty_percent(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("La penalizacion debe estar entre 0 y 100.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        establishment_type = attrs.get(
            "establishment_type",
            getattr(self.instance, "establishment_type", Tenant.EstablishmentType.SALA),
        )
        court_config = attrs.get("court_config", getattr(self.instance, "court_config", []))
        if establishment_type == Tenant.EstablishmentType.CANCHA and isinstance(court_config, list) and court_config:
            attrs["capacity"] = sum(int(court.get("capacity", 1)) for court in court_config)
        return attrs


class TenantMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantMembership
        fields = ["id", "tenant", "user", "role", "is_active", "created_at", "updated_at"]


class PlatformSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSetting
        fields = [
            "id",
            "key",
            "value_type",
            "value",
            "description",
            "is_active",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["updated_by"]

    def validate(self, attrs):
        value_type = attrs.get("value_type", getattr(self.instance, "value_type", PlatformSetting.ValueType.STRING))
        value = attrs.get("value", getattr(self.instance, "value", None))

        if value_type == PlatformSetting.ValueType.NUMBER and not isinstance(value, (int, float)):
            raise serializers.ValidationError({"value": "Para type=number debes enviar un numero."})
        if value_type == PlatformSetting.ValueType.BOOLEAN and not isinstance(value, bool):
            raise serializers.ValidationError({"value": "Para type=boolean debes enviar true o false."})
        if value_type == PlatformSetting.ValueType.STRING and value is not None and not isinstance(value, str):
            raise serializers.ValidationError({"value": "Para type=string debes enviar texto."})
        if value_type == PlatformSetting.ValueType.JSON and value is not None and not isinstance(value, (dict, list)):
            raise serializers.ValidationError({"value": "Para type=json debes enviar objeto o lista."})

        return attrs


class TenantRatingSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = TenantRating
        fields = [
            "id",
            "tenant",
            "user",
            "user_email",
            "score",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["tenant", "user", "user_email"]

    def validate_score(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("El score debe estar entre 1 y 5.")
        return value
