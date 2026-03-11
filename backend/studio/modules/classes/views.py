from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from studio.models import OrganizationMembership
from studio.modules.users.services import is_instructor, is_owner, is_platform_admin, is_student

from .models import StudioClass
from .serializers import InstructorLiteSerializer, StudioClassSerializer, validate_instructor, validate_room_for_establishment

User = get_user_model()


def get_owned_org_ids(user):
    return list(
        OrganizationMembership.objects.filter(user=user, is_active=True).values_list("organization_id", flat=True)
    )


class StudioClassViewSet(viewsets.ModelViewSet):
    queryset = StudioClass.objects.select_related("organization", "establishment", "room", "instructor").all()
    serializer_class = StudioClassSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        organization_id = self.request.query_params.get("organization_id")
        establishment_id = self.request.query_params.get("establishment_id")
        instructor_id = self.request.query_params.get("instructor_id")

        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        if establishment_id:
            queryset = queryset.filter(establishment_id=establishment_id)
        if instructor_id:
            queryset = queryset.filter(instructor_id=instructor_id)

        if is_platform_admin(user):
            return queryset
        if is_owner(user):
            return queryset.filter(organization_id__in=get_owned_org_ids(user))
        if is_instructor(user):
            return queryset.filter(instructor_id=user.id)
        if is_student(user):
            return queryset.filter(status=StudioClass.STATUS_SCHEDULED)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if not (is_platform_admin(user) or is_owner(user) or is_instructor(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data.copy()
        if is_instructor(user):
            payload["instructor"] = user.id

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        studio_class = serializer.save()

        if is_owner(user) and studio_class.organization_id not in get_owned_org_ids(user):
            studio_class.delete()
            return Response({"detail": "No puedes crear clases fuera de tus organizaciones"}, status=status.HTTP_403_FORBIDDEN)

        if is_instructor(user) and studio_class.instructor_id != user.id:
            studio_class.delete()
            return Response({"detail": "No puedes crear clases para otro instructor"}, status=status.HTTP_403_FORBIDDEN)

        return Response(self.get_serializer(studio_class).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        user = request.user
        studio_class = self.get_object()

        if not (is_platform_admin(user) or is_owner(user) or is_instructor(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        if is_owner(user) and studio_class.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        if is_instructor(user) and studio_class.instructor_id != user.id:
            return Response({"detail": "Solo puedes modificar tus clases"}, status=status.HTTP_403_FORBIDDEN)
        if studio_class.status == StudioClass.STATUS_CANCELED:
            return Response({"detail": "No se puede editar una clase cancelada"}, status=status.HTTP_400_BAD_REQUEST)

        payload = request.data.copy()
        if is_instructor(user):
            payload["instructor"] = user.id

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(studio_class, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(self.get_serializer(updated).data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        studio_class = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Solo owner/admin puede eliminar clases"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and studio_class.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="instructors")
    def instructors(self, request):
        if not (is_platform_admin(request.user) or is_owner(request.user) or is_instructor(request.user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        queryset = User.objects.filter(groups__name="instructor").distinct().order_by("username")
        return Response(InstructorLiteSerializer(queryset, many=True).data)

    @action(detail=True, methods=["post"], url_path="assign-instructor")
    def assign_instructor(self, request, pk=None):
        user = request.user
        studio_class = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Solo owner/admin puede asignar instructor"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and studio_class.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if studio_class.status != StudioClass.STATUS_SCHEDULED:
            return Response({"detail": "Solo se puede asignar instructor a clases programadas"}, status=status.HTTP_400_BAD_REQUEST)

        instructor_id = request.data.get("instructor_id")
        if not instructor_id:
            return Response({"detail": "instructor_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            instructor = validate_instructor(int(instructor_id))
        except (TypeError, ValueError):
            return Response({"detail": "instructor_id debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            detail = getattr(exc, "detail", {"detail": "Error validando instructor"})
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        studio_class.instructor = instructor
        studio_class.save(update_fields=["instructor", "updated_at"])
        return Response(self.get_serializer(studio_class).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="assign-room")
    def assign_room(self, request, pk=None):
        user = request.user
        studio_class = self.get_object()
        if not (is_platform_admin(user) or is_owner(user) or is_instructor(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and studio_class.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_instructor(user) and studio_class.instructor_id != user.id:
            return Response({"detail": "Solo puedes asignar salon en tus clases"}, status=status.HTTP_403_FORBIDDEN)
        if studio_class.status != StudioClass.STATUS_SCHEDULED:
            return Response({"detail": "Solo se puede asignar salon a clases programadas"}, status=status.HTTP_400_BAD_REQUEST)

        room_id = request.data.get("room_id")
        if not room_id:
            return Response({"detail": "room_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            room = validate_room_for_establishment(
                int(room_id),
                studio_class.establishment_id,
                studio_class.start_at,
                studio_class.end_at,
            )
        except (TypeError, ValueError):
            return Response({"detail": "room_id debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            detail = getattr(exc, "detail", {"detail": "Error validando salon"})
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)

        studio_class.room = room
        studio_class.capacity = room.capacity
        studio_class.save(update_fields=["room", "capacity", "updated_at"])
        return Response(self.get_serializer(studio_class).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        user = request.user
        studio_class = self.get_object()
        if not (is_platform_admin(user) or is_owner(user) or is_instructor(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and studio_class.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_instructor(user) and studio_class.instructor_id != user.id:
            return Response({"detail": "Solo puedes cancelar tus clases"}, status=status.HTTP_403_FORBIDDEN)
        if studio_class.status == StudioClass.STATUS_CANCELED:
            return Response(self.get_serializer(studio_class).data, status=status.HTTP_200_OK)

        studio_class.status = StudioClass.STATUS_CANCELED
        studio_class.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(studio_class).data, status=status.HTTP_200_OK)
