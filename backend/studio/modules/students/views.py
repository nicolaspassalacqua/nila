from django.contrib.auth.models import Group
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from studio.models import Establishment, Organization, OrganizationMembership, Student, StudentHistory
from studio.modules.classes.models import StudioClass
from studio.modules.users.services import ensure_roles_exist, is_instructor, is_owner, is_platform_admin, is_student

from .serializers import StudentHistorySerializer, StudentSerializer


def get_owned_org_ids(user):
    return list(
        OrganizationMembership.objects.filter(user=user, is_active=True).values_list("organization_id", flat=True)
    )


def get_instructor_org_ids(user):
    return list(StudioClass.objects.filter(instructor=user).values_list("organization_id", flat=True).distinct())


def create_student_history(student, event_type, description, actor=None, metadata=None):
    StudentHistory.objects.create(
        student=student,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        event_type=event_type,
        description=description,
        metadata=metadata or {},
    )


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related("organization", "user").prefetch_related("establishments", "history_events").all().order_by("id")
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def _is_admin_owner_or_instructor(self, user):
        return is_platform_admin(user) or is_owner(user) or is_instructor(user)

    def _ensure_admin_or_owner(self, request):
        if not (is_platform_admin(request.user) or is_owner(request.user)):
            return Response({"detail": "Solo admin plataforma o dueno puede modificar alumnos"}, status=status.HTTP_403_FORBIDDEN)
        return None

    def _can_view_student(self, user, student):
        if is_platform_admin(user):
            return True
        if is_owner(user):
            return student.organization_id in get_owned_org_ids(user)
        if is_instructor(user):
            return student.organization_id in get_instructor_org_ids(user)
        if is_student(user):
            return student.user_id == user.id
        return False

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        organization_id = self.request.query_params.get("organization_id")
        establishment_id = self.request.query_params.get("establishment_id")

        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        if establishment_id:
            queryset = queryset.filter(establishments__id=establishment_id)

        if is_platform_admin(user):
            return queryset.distinct()

        if is_owner(user):
            return queryset.filter(organization_id__in=get_owned_org_ids(user)).distinct()

        if is_instructor(user):
            return queryset.filter(organization_id__in=get_instructor_org_ids(user)).distinct()

        if is_student(user):
            return queryset.filter(user=user).distinct()

        return queryset.none()

    def list(self, request, *args, **kwargs):
        if not (self._is_admin_owner_or_instructor(request.user) or is_student(request.user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        student = self.get_object()
        if not self._can_view_student(request.user, student):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        forbidden = self._ensure_admin_or_owner(request)
        if forbidden:
            return forbidden

        organization_id = request.data.get("organization")
        if not organization_id:
            return Response({"detail": "organization es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            organization_id = int(organization_id)
        except (TypeError, ValueError):
            return Response({"detail": "organization debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)

        if is_owner(request.user) and organization_id not in get_owned_org_ids(request.user):
            return Response({"detail": "No puedes crear alumnos fuera de tus organizaciones"}, status=status.HTTP_403_FORBIDDEN)

        response = super().create(request, *args, **kwargs)
        student = Student.objects.get(id=response.data["id"])

        if student.user_id:
            ensure_roles_exist()
            student.user.groups.add(Group.objects.get(name="alumno"))

        create_student_history(
            student,
            StudentHistory.EVENT_CREATED,
            "Alumno registrado por owner/admin",
            actor=request.user,
            metadata={"source": "FR-010"},
        )
        response.data = StudentSerializer(student).data
        return response

    def update(self, request, *args, **kwargs):
        forbidden = self._ensure_admin_or_owner(request)
        if forbidden:
            return forbidden

        student = self.get_object()
        if is_owner(request.user) and student.organization_id not in get_owned_org_ids(request.user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        partial = kwargs.pop("partial", False)
        response = super().update(request, partial=partial, *args, **kwargs)
        student = self.get_object()
        create_student_history(
            student,
            StudentHistory.EVENT_UPDATED,
            "Alumno editado por owner/admin",
            actor=request.user,
            metadata={"source": "FR-011"},
        )
        response.data = StudentSerializer(student).data
        return response

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        forbidden = self._ensure_admin_or_owner(request)
        if forbidden:
            return forbidden

        student = self.get_object()
        if is_owner(request.user) and student.organization_id not in get_owned_org_ids(request.user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="my-profiles")
    def my_profiles(self, request):
        queryset = Student.objects.select_related("organization", "user").prefetch_related("establishments").filter(user=request.user)
        return Response(StudentSerializer(queryset, many=True).data)

    @action(detail=False, methods=["post"], url_path="join-organization")
    def join_organization(self, request):
        organization_id = request.data.get("organization_id")
        if not organization_id:
            return Response({"detail": "organization_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            organization_id = int(organization_id)
        except (TypeError, ValueError):
            return Response({"detail": "organization_id debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            organization = Organization.objects.get(id=organization_id, is_active=True, subscription_enabled=True)
        except Organization.DoesNotExist:
            return Response({"detail": "La empresa no esta disponible en marketplace"}, status=status.HTTP_400_BAD_REQUEST)

        ensure_roles_exist()
        request.user.groups.add(Group.objects.get(name="alumno"))

        first_name = (request.data.get("first_name") or request.user.first_name or request.user.username or "Alumno").strip()
        last_name = (request.data.get("last_name") or request.user.last_name or "").strip()
        email = (request.data.get("email") or request.user.email or "").strip()
        phone = (request.data.get("phone") or "").strip()
        current_level = (request.data.get("current_level") or "").strip()
        auth_provider = (request.data.get("auth_provider") or Student.AUTH_PROVIDER_LOCAL).strip()

        student, created = Student.objects.get_or_create(
            organization=organization,
            user=request.user,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": phone,
                "current_level": current_level,
                "auth_provider": auth_provider,
                "is_active": True,
            },
        )

        if not created:
            dirty_fields = []
            if first_name and student.first_name != first_name:
                student.first_name = first_name
                dirty_fields.append("first_name")
            if last_name and student.last_name != last_name:
                student.last_name = last_name
                dirty_fields.append("last_name")
            if email and student.email != email:
                student.email = email
                dirty_fields.append("email")
            if phone and student.phone != phone:
                student.phone = phone
                dirty_fields.append("phone")
            if current_level and student.current_level != current_level:
                student.current_level = current_level
                dirty_fields.append("current_level")
            if auth_provider and student.auth_provider != auth_provider:
                student.auth_provider = auth_provider
                dirty_fields.append("auth_provider")
            if dirty_fields:
                dirty_fields.append("updated_at")
                student.save(update_fields=dirty_fields)

        establishment_ids = request.data.get("establishment_ids", [])
        if establishment_ids:
            if not isinstance(establishment_ids, list):
                return Response({"detail": "establishment_ids debe ser una lista"}, status=status.HTTP_400_BAD_REQUEST)
            establishments = Establishment.objects.filter(id__in=establishment_ids, organization_id=organization.id)
            if establishments.count() != len(set(establishment_ids)):
                return Response({"detail": "Una o mas sedes no pertenecen a la organizacion"}, status=status.HTTP_400_BAD_REQUEST)
            student.establishments.set(establishments)

        create_student_history(
            student,
            StudentHistory.EVENT_JOINED if created else StudentHistory.EVENT_UPDATED,
            "Alumno asociado desde marketplace",
            actor=request.user,
            metadata={"source": "marketplace_self_service"},
        )
        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        student = self.get_object()
        if not self._can_view_student(request.user, student):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        serializer = StudentHistorySerializer(student.history_events.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="assign-establishments")
    def assign_establishments(self, request, pk=None):
        forbidden = self._ensure_admin_or_owner(request)
        if forbidden:
            return forbidden

        student = self.get_object()
        if is_owner(request.user) and student.organization_id not in get_owned_org_ids(request.user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        establishment_ids = request.data.get("establishment_ids", [])
        if not isinstance(establishment_ids, list):
            return Response({"detail": "establishment_ids debe ser una lista"}, status=status.HTTP_400_BAD_REQUEST)

        establishments = Establishment.objects.filter(id__in=establishment_ids, organization_id=student.organization_id)
        if establishments.count() != len(set(establishment_ids)):
            return Response({"detail": "Una o mas sedes no existen o no pertenecen a la organizacion"}, status=status.HTTP_400_BAD_REQUEST)

        if is_owner(request.user):
            owner_org_ids = set(get_owned_org_ids(request.user))
            if student.organization_id not in owner_org_ids:
                return Response({"detail": "No puedes asignar sedes fuera de tus organizaciones"}, status=status.HTTP_403_FORBIDDEN)

        student.establishments.set(establishments)
        create_student_history(
            student,
            StudentHistory.EVENT_ASSIGNED,
            "Alumno asignado a sedes",
            actor=request.user,
            metadata={"establishment_ids": establishment_ids, "source": "US-011"},
        )
        return Response(StudentSerializer(student).data)

    @action(detail=True, methods=["post"], url_path="add-history-note")
    def add_history_note(self, request, pk=None):
        student = self.get_object()
        if not (is_platform_admin(request.user) or is_owner(request.user) or is_instructor(request.user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if not self._can_view_student(request.user, student):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        description = (request.data.get("description") or "").strip()
        if not description:
            return Response({"detail": "description es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        event = StudentHistory.objects.create(
            student=student,
            actor=request.user,
            event_type=StudentHistory.EVENT_MANUAL,
            description=description,
            metadata={"source": "US-010"},
        )
        return Response(StudentHistorySerializer(event).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="set-level")
    def set_level(self, request, pk=None):
        student = self.get_object()
        if not (is_platform_admin(request.user) or is_owner(request.user) or is_instructor(request.user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if not self._can_view_student(request.user, student):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        new_level = (request.data.get("current_level") or "").strip()
        if not new_level:
            return Response({"detail": "current_level es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        student.current_level = new_level
        student.save(update_fields=["current_level", "updated_at"])
        create_student_history(
            student,
            StudentHistory.EVENT_UPDATED,
            f"Nivel actualizado a {new_level}",
            actor=request.user,
            metadata={"source": "FR-013"},
        )
        return Response(StudentSerializer(student).data, status=status.HTTP_200_OK)
