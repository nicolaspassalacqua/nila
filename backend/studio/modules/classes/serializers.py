from datetime import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from studio.models import Establishment, Room

from .models import InstructorProfile, InstructorSettlement, StudioClass

User = get_user_model()


def room_blocking_conflicts(room, class_start=None, class_end=None):
    if not room.is_blocked:
        return False
    if not room.blocked_from and not room.blocked_to:
        return True
    if class_start is None or class_end is None:
        return True

    block_start = room.blocked_from or class_start
    block_end = room.blocked_to or class_end
    return class_start < block_end and class_end > block_start


def has_time_overlap(queryset, start_at, end_at):
    return queryset.filter(start_at__lt=end_at, end_at__gt=start_at).exists()


class InstructorLiteSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    def get_display_name(self, obj):
        full_name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return full_name or obj.username

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "display_name")


class InstructorCreateSerializer(serializers.Serializer):
    organization = serializers.IntegerField(required=False)
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    compensation_scheme = serializers.ChoiceField(
        choices=InstructorProfile.COMPENSATION_CHOICES,
        default=InstructorProfile.COMPENSATION_HOURLY,
    )
    hourly_rate = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal("0"))
    monthly_salary = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal("0"))
    class_rate = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal("0"))
    currency = serializers.CharField(max_length=8, required=False, allow_blank=True)
    started_at = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("username es requerido")
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("username ya esta en uso")
        return username

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("email ya esta en uso")
        return email

    def validate(self, attrs):
        attrs = super().validate(attrs)
        attrs["currency"] = (attrs.get("currency") or "ARS").strip().upper()
        attrs["hourly_rate"] = attrs.get("hourly_rate") or Decimal("0")
        attrs["monthly_salary"] = attrs.get("monthly_salary") or Decimal("0")
        attrs["class_rate"] = attrs.get("class_rate") or Decimal("0")
        return attrs


class InstructorProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user.id", read_only=True)
    profile_id = serializers.IntegerField(source="id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    display_name = serializers.SerializerMethodField()
    metrics = serializers.SerializerMethodField()

    def get_display_name(self, obj):
        full_name = f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip()
        return full_name or obj.user.username

    def get_metrics(self, obj):
        metrics_map = self.context.get("metrics_map") or {}
        key = (obj.organization_id, obj.user_id)
        metrics = metrics_map.get(key)
        if metrics is not None:
            return metrics
        return build_instructor_metrics_payload(obj, reference=timezone.now())

    class Meta:
        model = InstructorProfile
        fields = (
            "id",
            "profile_id",
            "organization",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "compensation_scheme",
            "hourly_rate",
            "monthly_salary",
            "class_rate",
            "currency",
            "started_at",
            "notes",
            "is_active",
            "metrics",
        )


class InstructorProfileUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    compensation_scheme = serializers.ChoiceField(choices=InstructorProfile.COMPENSATION_CHOICES, required=False)
    hourly_rate = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal("0"))
    monthly_salary = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal("0"))
    class_rate = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=Decimal("0"))
    currency = serializers.CharField(max_length=8, required=False, allow_blank=True)
    started_at = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("username es requerido")
        profile = self.context.get("profile")
        queryset = User.objects.filter(username__iexact=username)
        if profile:
            queryset = queryset.exclude(id=profile.user_id)
        if queryset.exists():
            raise serializers.ValidationError("username ya esta en uso")
        return username

    def validate_email(self, value):
        email = value.strip().lower()
        profile = self.context.get("profile")
        queryset = User.objects.filter(email__iexact=email)
        if profile:
            queryset = queryset.exclude(id=profile.user_id)
        if queryset.exists():
            raise serializers.ValidationError("email ya esta en uso")
        return email

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if "currency" in attrs:
            attrs["currency"] = (attrs.get("currency") or "ARS").strip().upper()
        return attrs


class InstructorSettlementSerializer(serializers.ModelSerializer):
    instructor_profile_id = serializers.IntegerField(source="instructor_profile_id", read_only=True)
    instructor_id = serializers.IntegerField(source="instructor_profile.user_id", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    username = serializers.CharField(source="instructor_profile.user.username", read_only=True)
    email = serializers.EmailField(source="instructor_profile.user.email", read_only=True)
    first_name = serializers.CharField(source="instructor_profile.user.first_name", read_only=True)
    last_name = serializers.CharField(source="instructor_profile.user.last_name", read_only=True)
    display_name = serializers.SerializerMethodField()
    compensation_scheme_label = serializers.CharField(source="get_compensation_scheme_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    period_label = serializers.SerializerMethodField()

    def get_display_name(self, obj):
        full_name = f"{obj.instructor_profile.user.first_name or ''} {obj.instructor_profile.user.last_name or ''}".strip()
        return full_name or obj.instructor_profile.user.username

    def get_period_label(self, obj):
        return f"{obj.period_month:02d}/{obj.period_year}"

    class Meta:
        model = InstructorSettlement
        fields = (
            "id",
            "organization",
            "organization_name",
            "instructor_profile_id",
            "instructor_id",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "period_year",
            "period_month",
            "period_label",
            "compensation_scheme",
            "compensation_scheme_label",
            "status",
            "status_label",
            "amount",
            "currency",
            "month_classes",
            "month_hours",
            "completed_hours",
            "notes",
            "paid_at",
            "created_at",
            "updated_at",
        )


class InstructorSettlementGenerateSerializer(serializers.Serializer):
    organization = serializers.IntegerField(required=False)
    year = serializers.IntegerField(required=False, min_value=2000, max_value=2100)
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)


class InstructorSettlementMarkPaidSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class StudioClassSerializer(serializers.ModelSerializer):
    instructor_username = serializers.CharField(source="instructor.username", read_only=True)
    room_name = serializers.CharField(source="room.name", read_only=True)

    class Meta:
        model = StudioClass
        fields = (
            "id",
            "organization",
            "establishment",
            "room",
            "room_name",
            "instructor",
            "instructor_username",
            "name",
            "start_at",
            "end_at",
            "capacity",
            "status",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        organization = attrs.get("organization", instance.organization if instance else None)
        establishment = attrs.get("establishment", instance.establishment if instance else None)
        room = attrs.get("room", instance.room if instance else None)
        instructor = attrs.get("instructor", instance.instructor if instance else None)
        start_at = attrs.get("start_at", instance.start_at if instance else None)
        end_at = attrs.get("end_at", instance.end_at if instance else None)

        if establishment and organization and establishment.organization_id != organization.id:
            raise serializers.ValidationError({"establishment": "La sede no pertenece a la organizacion"})

        if room and establishment and room.establishment_id != establishment.id:
            raise serializers.ValidationError({"room": "El salon no pertenece a la sede indicada"})
        if room and not room.is_active:
            raise serializers.ValidationError({"room": "El salon esta inactivo"})
        if room and room_blocking_conflicts(room, start_at, end_at):
            raise serializers.ValidationError({"room": "El salon esta bloqueado por mantenimiento/evento"})
        if instructor and organization and not InstructorProfile.objects.filter(
            organization_id=organization.id,
            user_id=instructor.id,
            is_active=True,
        ).exists():
            raise serializers.ValidationError({"instructor": "El instructor no esta habilitado para esta organizacion"})

        if start_at and end_at and start_at >= end_at:
            raise serializers.ValidationError({"end_at": "La fecha/hora de fin debe ser mayor al inicio"})

        capacity = attrs.get("capacity", instance.capacity if instance else 1)
        if capacity < 1:
            raise serializers.ValidationError({"capacity": "La capacidad debe ser mayor a 0"})
        if room and capacity > room.capacity:
            raise serializers.ValidationError(
                {"capacity": f"La capacidad no puede superar la del salon seleccionado ({room.capacity})"}
            )

        if start_at and end_at:
            overlap_qs = StudioClass.objects.filter(status=StudioClass.STATUS_SCHEDULED)
            if instance:
                overlap_qs = overlap_qs.exclude(id=instance.id)

            if room and has_time_overlap(overlap_qs.filter(room=room), start_at, end_at):
                raise serializers.ValidationError({"room": "Ya existe una clase en ese salon para ese horario"})

            if instructor and has_time_overlap(overlap_qs.filter(instructor=instructor), start_at, end_at):
                raise serializers.ValidationError({"instructor": "El instructor ya tiene una clase en ese horario"})

        return attrs


def validate_room_for_establishment(room_id, establishment_id, start_at=None, end_at=None):
    try:
        room = Room.objects.get(id=room_id)
    except Room.DoesNotExist:
        raise serializers.ValidationError({"room_id": "Salon no encontrado"})

    if room.establishment_id != establishment_id:
        raise serializers.ValidationError({"room_id": "El salon no pertenece a la sede de la clase"})
    if not room.is_active:
        raise serializers.ValidationError({"room_id": "El salon esta inactivo"})
    if room_blocking_conflicts(room, start_at, end_at):
        raise serializers.ValidationError({"room_id": "El salon esta bloqueado por mantenimiento/evento"})

    return room


def validate_instructor(instructor_id, organization_id=None):
    try:
        instructor = User.objects.get(id=instructor_id)
    except User.DoesNotExist:
        raise serializers.ValidationError({"instructor_id": "Instructor no encontrado"})

    if not instructor.groups.filter(name="instructor").exists():
        raise serializers.ValidationError({"instructor_id": "El usuario no tiene rol instructor"})

    if organization_id and not InstructorProfile.objects.filter(
        organization_id=organization_id,
        user_id=instructor.id,
        is_active=True,
    ).exists():
        raise serializers.ValidationError({"instructor_id": "El instructor no esta habilitado para esta organizacion"})

    return instructor


def validate_establishment(establishment_id):
    try:
        return Establishment.objects.get(id=establishment_id)
    except Establishment.DoesNotExist:
        raise serializers.ValidationError({"establishment_id": "Sede no encontrada"})


def resolve_metrics_reference(year=None, month=None):
    now = timezone.localtime()
    safe_year = int(year or now.year)
    safe_month = int(month or now.month)
    reference = datetime(safe_year, safe_month, 1, 0, 0, 0)
    return timezone.make_aware(reference, timezone.get_current_timezone())


def build_instructor_metrics_payload(profile, reference=None, class_rows=None):
    reference = reference or timezone.now()
    month_start = reference.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)

    rows = class_rows
    if rows is None:
        rows = list(
            StudioClass.objects.filter(organization_id=profile.organization_id, instructor_id=profile.user_id).values(
                "status",
                "start_at",
                "end_at",
            )
        )

    totals = {
        "total_classes": 0,
        "scheduled_classes": 0,
        "completed_classes": 0,
        "canceled_classes": 0,
        "assigned_hours": Decimal("0"),
        "completed_hours": Decimal("0"),
        "month_classes": 0,
        "month_hours": Decimal("0"),
    }

    for row in rows:
        start_at = row.get("start_at")
        end_at = row.get("end_at")
        status = row.get("status")
        totals["total_classes"] += 1
        if status == StudioClass.STATUS_SCHEDULED:
            totals["scheduled_classes"] += 1
        elif status == StudioClass.STATUS_COMPLETED:
            totals["completed_classes"] += 1
        elif status == StudioClass.STATUS_CANCELED:
            totals["canceled_classes"] += 1

        duration_hours = Decimal("0")
        if start_at and end_at and end_at > start_at:
            duration_hours = Decimal(str((end_at - start_at).total_seconds() / 3600)).quantize(Decimal("0.01"))

        if status != StudioClass.STATUS_CANCELED:
            totals["assigned_hours"] += duration_hours
            if start_at and month_start <= start_at < month_end:
                totals["month_classes"] += 1
                totals["month_hours"] += duration_hours
        if status == StudioClass.STATUS_COMPLETED:
            totals["completed_hours"] += duration_hours

    projected_cost = Decimal("0")
    scheme = profile.compensation_scheme
    if scheme == InstructorProfile.COMPENSATION_HOURLY:
        projected_cost = totals["month_hours"] * Decimal(profile.hourly_rate or 0)
    elif scheme == InstructorProfile.COMPENSATION_MONTHLY:
        projected_cost = Decimal(profile.monthly_salary or 0)
    elif scheme == InstructorProfile.COMPENSATION_PER_CLASS:
        projected_cost = Decimal(profile.class_rate or 0) * totals["month_classes"]
    elif scheme == InstructorProfile.COMPENSATION_MIXED:
        projected_cost = (
            Decimal(profile.monthly_salary or 0)
            + (totals["month_hours"] * Decimal(profile.hourly_rate or 0))
            + (Decimal(profile.class_rate or 0) * totals["month_classes"])
        )

    return {
        "total_classes": totals["total_classes"],
        "scheduled_classes": totals["scheduled_classes"],
        "completed_classes": totals["completed_classes"],
        "canceled_classes": totals["canceled_classes"],
        "assigned_hours": str(totals["assigned_hours"].quantize(Decimal("0.01"))),
        "completed_hours": str(totals["completed_hours"].quantize(Decimal("0.01"))),
        "month_classes": totals["month_classes"],
        "month_hours": str(totals["month_hours"].quantize(Decimal("0.01"))),
        "projected_cost": str(projected_cost.quantize(Decimal("0.01"))),
    }
