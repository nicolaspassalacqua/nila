from django.contrib.auth import get_user_model
from rest_framework import serializers

from studio.models import Establishment, Room

from .models import StudioClass

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
    class Meta:
        model = User
        fields = ("id", "username", "email")


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


def validate_instructor(instructor_id):
    try:
        instructor = User.objects.get(id=instructor_id)
    except User.DoesNotExist:
        raise serializers.ValidationError({"instructor_id": "Instructor no encontrado"})

    if not instructor.groups.filter(name="instructor").exists():
        raise serializers.ValidationError({"instructor_id": "El usuario no tiene rol instructor"})

    return instructor


def validate_establishment(establishment_id):
    try:
        return Establishment.objects.get(id=establishment_id)
    except Establishment.DoesNotExist:
        raise serializers.ValidationError({"establishment_id": "Sede no encontrada"})
