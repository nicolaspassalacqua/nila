from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from studio.models import InstructorProfile, InstructorSettlement, OrganizationMembership
from studio.modules.users.services import ensure_roles_exist, is_instructor, is_owner, is_platform_admin, is_student

from .models import StudioClass
from .serializers import (
    InstructorCreateSerializer,
    InstructorProfileSerializer,
    InstructorProfileUpdateSerializer,
    InstructorSettlementGenerateSerializer,
    InstructorSettlementMarkPaidSerializer,
    InstructorSettlementSerializer,
    StudioClassSerializer,
    build_instructor_metrics_payload,
    resolve_metrics_reference,
    validate_instructor,
    validate_room_for_establishment,
)

User = get_user_model()


def get_owned_org_ids(user):
    return list(
        OrganizationMembership.objects.filter(user=user, is_active=True).values_list("organization_id", flat=True)
    )


def _get_instructor_profiles_queryset(request):
    user = request.user
    queryset = InstructorProfile.objects.select_related("user", "organization").order_by("user__username", "id")
    organization_id = request.query_params.get("organization_id") or request.data.get("organization")
    if organization_id:
        queryset = queryset.filter(organization_id=organization_id)

    if is_platform_admin(user):
        return queryset
    if is_owner(user):
        return queryset.filter(organization_id__in=get_owned_org_ids(user))
    if is_instructor(user):
        return queryset.filter(user_id=user.id)
    return queryset.none()


def _build_metrics_map(profiles):
    profiles = list(profiles)
    profile_keys = {(profile.organization_id, profile.user_id) for profile in profiles}
    if not profile_keys:
        return {}

    organization_ids = {organization_id for organization_id, _user_id in profile_keys}
    instructor_ids = {user_id for _organization_id, user_id in profile_keys}
    class_rows = StudioClass.objects.filter(
        organization_id__in=organization_ids,
        instructor_id__in=instructor_ids,
    ).values("organization_id", "instructor_id", "status", "start_at", "end_at")

    grouped = {}
    for row in class_rows:
        key = (row["organization_id"], row["instructor_id"])
        grouped.setdefault(key, []).append(row)

    return {
        (profile.organization_id, profile.user_id): build_instructor_metrics_payload(
            profile,
            class_rows=grouped.get((profile.organization_id, profile.user_id), []),
        )
        for profile in profiles
    }


def _serialize_instructor_profiles(profiles):
    profiles = list(profiles)
    serializer = InstructorProfileSerializer(
        profiles,
        many=True,
        context={"metrics_map": _build_metrics_map(profiles)},
    )
    return serializer.data


def _parse_period_values(year_value=None, month_value=None):
    now = timezone.localtime()
    try:
        year = int(year_value or now.year)
        month = int(month_value or now.month)
    except (TypeError, ValueError):
        raise ValueError("Periodo invalido")
    if month < 1 or month > 12:
        raise ValueError("month debe estar entre 1 y 12")
    if year < 2000 or year > 2100:
        raise ValueError("year debe estar entre 2000 y 2100")
    return year, month


def _get_period_window(year, month):
    period_start = resolve_metrics_reference(year, month)
    if month == 12:
        period_end = resolve_metrics_reference(year + 1, 1)
    else:
        period_end = resolve_metrics_reference(year, month + 1)
    return period_start, period_end


def _resolve_instructor_profile_access(request, profile_id):
    try:
        profile = InstructorProfile.objects.select_related("user", "organization").get(id=profile_id)
    except InstructorProfile.DoesNotExist:
        return None, Response({"detail": "Instructor no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    if is_platform_admin(user):
        return profile, None
    if is_owner(user) and profile.organization_id in get_owned_org_ids(user):
        return profile, None
    if is_instructor(user) and profile.user_id == user.id:
        return profile, None
    return None, Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)


def _get_instructor_settlements_queryset(request, year=None, month=None):
    user = request.user
    queryset = InstructorSettlement.objects.select_related(
        "organization",
        "instructor_profile",
        "instructor_profile__user",
    ).order_by("-period_year", "-period_month", "instructor_profile__user__username", "id")

    organization_id = request.query_params.get("organization_id") or request.data.get("organization")
    if organization_id:
        queryset = queryset.filter(organization_id=organization_id)
    if year:
        queryset = queryset.filter(period_year=year)
    if month:
        queryset = queryset.filter(period_month=month)

    if is_platform_admin(user):
        return queryset
    if is_owner(user):
        return queryset.filter(organization_id__in=get_owned_org_ids(user))
    if is_instructor(user):
        return queryset.filter(instructor_profile__user_id=user.id)
    return queryset.none()


def _resolve_manageable_organization_id(request, organization_id=None):
    user = request.user
    if is_platform_admin(user):
        if organization_id:
            return int(organization_id), None
        return None, Response({"detail": "organization es requerido"}, status=status.HTTP_400_BAD_REQUEST)

    if not is_owner(user):
        return None, Response({"detail": "Solo owner/admin puede gestionar liquidaciones"}, status=status.HTTP_403_FORBIDDEN)

    owner_org_ids = get_owned_org_ids(user)
    if not owner_org_ids:
        return None, Response({"detail": "No tienes organizaciones para liquidar"}, status=status.HTTP_400_BAD_REQUEST)

    if organization_id:
        try:
            safe_organization_id = int(organization_id)
        except (TypeError, ValueError):
            return None, Response({"detail": "organization debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)
        if safe_organization_id not in owner_org_ids:
            return None, Response({"detail": "No puedes gestionar otra organizacion"}, status=status.HTTP_403_FORBIDDEN)
        return safe_organization_id, None

    return owner_org_ids[0], None


def _serialize_instructor_settlements(settlements):
    return InstructorSettlementSerializer(settlements, many=True).data


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

    @action(detail=False, methods=["get", "post"], url_path="instructors")
    def instructors(self, request):
        if request.method.lower() == "post":
            return self.create_instructor(request)

        if not (is_platform_admin(request.user) or is_owner(request.user) or is_instructor(request.user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        queryset = _get_instructor_profiles_queryset(request).filter(is_active=True)
        return Response(_serialize_instructor_profiles(queryset))

    def create_instructor(self, request):
        user = request.user
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Solo owner/admin puede crear instructores"}, status=status.HTTP_403_FORBIDDEN)

        serializer = InstructorCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ensure_roles_exist()

        organization_id = serializer.validated_data.get("organization")
        if is_owner(user):
            owner_org_ids = get_owned_org_ids(user)
            if not owner_org_ids:
                return Response({"detail": "No tienes organizaciones para asignar instructores"}, status=status.HTTP_400_BAD_REQUEST)
            if organization_id:
                if organization_id not in owner_org_ids:
                    return Response({"detail": "No puedes crear instructores fuera de tus organizaciones"}, status=status.HTTP_403_FORBIDDEN)
            else:
                organization_id = owner_org_ids[0]
        elif not organization_id:
            return Response({"detail": "organization es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        if InstructorProfile.objects.filter(organization_id=organization_id, user__email__iexact=serializer.validated_data["email"]).exists():
            return Response({"detail": "Ya existe un instructor con ese email en esta organizacion"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            instructor = User.objects.create_user(
                username=serializer.validated_data["username"],
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
                first_name=serializer.validated_data.get("first_name", "").strip(),
                last_name=serializer.validated_data.get("last_name", "").strip(),
            )
            instructor.groups.add(Group.objects.get(name="instructor"))
            profile = InstructorProfile.objects.create(
                organization_id=organization_id,
                user=instructor,
                compensation_scheme=serializer.validated_data["compensation_scheme"],
                hourly_rate=serializer.validated_data.get("hourly_rate") or 0,
                monthly_salary=serializer.validated_data.get("monthly_salary") or 0,
                class_rate=serializer.validated_data.get("class_rate") or 0,
                currency=serializer.validated_data.get("currency") or "ARS",
                started_at=serializer.validated_data.get("started_at"),
                notes=serializer.validated_data.get("notes", "").strip(),
                is_active=True,
            )

        data = InstructorProfileSerializer(profile, context={"metrics_map": _build_metrics_map([profile])}).data
        return Response(data, status=status.HTTP_201_CREATED)

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
            instructor = validate_instructor(int(instructor_id), organization_id=studio_class.organization_id)
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


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def instructor_collection(request):
    if request.method == "GET":
        if not (is_platform_admin(request.user) or is_owner(request.user) or is_instructor(request.user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        queryset = _get_instructor_profiles_queryset(request)
        return Response(_serialize_instructor_profiles(queryset))

    viewset = StudioClassViewSet()
    viewset.request = request
    return viewset.create_instructor(request)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def instructor_detail(request, profile_id):
    profile, error_response = _resolve_instructor_profile_access(request, profile_id)
    if error_response:
        return error_response

    if request.method == "DELETE":
        if not (is_platform_admin(request.user) or is_owner(request.user)):
            return Response({"detail": "Solo owner/admin puede desactivar instructores"}, status=status.HTTP_403_FORBIDDEN)
        profile.is_active = False
        profile.save(update_fields=["is_active", "updated_at"])
        data = InstructorProfileSerializer(profile, context={"metrics_map": _build_metrics_map([profile])}).data
        return Response(data, status=status.HTTP_200_OK)

    if not (is_platform_admin(request.user) or is_owner(request.user)):
        return Response({"detail": "Solo owner/admin puede actualizar instructores"}, status=status.HTTP_403_FORBIDDEN)

    serializer = InstructorProfileUpdateSerializer(data=request.data, context={"profile": profile})
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    user_updates = []
    if "username" in payload and profile.user.username != payload["username"]:
        profile.user.username = payload["username"]
        user_updates.append("username")
    if "first_name" in payload and profile.user.first_name != payload["first_name"]:
        profile.user.first_name = payload["first_name"]
        user_updates.append("first_name")
    if "last_name" in payload and profile.user.last_name != payload["last_name"]:
        profile.user.last_name = payload["last_name"]
        user_updates.append("last_name")
    if "email" in payload and profile.user.email != payload["email"]:
        profile.user.email = payload["email"]
        user_updates.append("email")

    profile_updates = []
    for field in (
        "compensation_scheme",
        "hourly_rate",
        "monthly_salary",
        "class_rate",
        "currency",
        "started_at",
        "notes",
        "is_active",
    ):
        if field in payload and getattr(profile, field) != payload[field]:
            setattr(profile, field, payload[field])
            profile_updates.append(field)

    with transaction.atomic():
        if user_updates:
            profile.user.save(update_fields=user_updates)
        if profile_updates:
            profile.save(update_fields=profile_updates + ["updated_at"])

    data = InstructorProfileSerializer(profile, context={"metrics_map": _build_metrics_map([profile])}).data
    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def instructor_settlement_collection(request):
    if not (is_platform_admin(request.user) or is_owner(request.user) or is_instructor(request.user)):
        return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

    try:
        year, month = _parse_period_values(
            request.query_params.get("year"),
            request.query_params.get("month"),
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    queryset = _get_instructor_settlements_queryset(request, year=year, month=month)
    return Response(_serialize_instructor_settlements(queryset))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def instructor_settlement_generate(request):
    if not (is_platform_admin(request.user) or is_owner(request.user)):
        return Response({"detail": "Solo owner/admin puede generar liquidaciones"}, status=status.HTTP_403_FORBIDDEN)

    serializer = InstructorSettlementGenerateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    organization_id, error_response = _resolve_manageable_organization_id(
        request,
        serializer.validated_data.get("organization"),
    )
    if error_response:
        return error_response

    try:
        year, month = _parse_period_values(
            serializer.validated_data.get("year"),
            serializer.validated_data.get("month"),
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    period_start, period_end = _get_period_window(year, month)
    profiles = list(
        InstructorProfile.objects.select_related("user", "organization")
        .filter(organization_id=organization_id, is_active=True)
        .order_by("user__username", "id")
    )
    if not profiles:
        return Response({"detail": "No hay instructores activos para liquidar"}, status=status.HTTP_400_BAD_REQUEST)

    class_rows = StudioClass.objects.filter(
        organization_id=organization_id,
        instructor_id__in=[profile.user_id for profile in profiles],
        start_at__gte=period_start,
        start_at__lt=period_end,
    ).values("organization_id", "instructor_id", "status", "start_at", "end_at")

    grouped_rows = {}
    for row in class_rows:
        key = (row["organization_id"], row["instructor_id"])
        grouped_rows.setdefault(key, []).append(row)

    generated_ids = []
    created_count = 0
    updated_count = 0
    kept_paid_count = 0

    with transaction.atomic():
        for profile in profiles:
            metrics = build_instructor_metrics_payload(
                profile,
                reference=period_start,
                class_rows=grouped_rows.get((profile.organization_id, profile.user_id), []),
            )
            amount = Decimal(metrics["projected_cost"])
            month_classes = int(metrics["month_classes"])
            month_hours = Decimal(metrics["month_hours"])
            completed_hours = Decimal(metrics["completed_hours"])

            existing = InstructorSettlement.objects.filter(
                organization_id=organization_id,
                instructor_profile=profile,
                period_year=year,
                period_month=month,
            ).first()
            should_include = bool(
                existing
                or amount > 0
                or month_classes > 0
                or month_hours > 0
                or Decimal(profile.monthly_salary or 0) > 0
            )
            if not should_include:
                continue

            if existing and existing.status == InstructorSettlement.STATUS_PAID:
                generated_ids.append(existing.id)
                kept_paid_count += 1
                continue

            settlement, created = InstructorSettlement.objects.update_or_create(
                organization_id=organization_id,
                instructor_profile=profile,
                period_year=year,
                period_month=month,
                defaults={
                    "compensation_scheme": profile.compensation_scheme,
                    "status": InstructorSettlement.STATUS_PENDING,
                    "amount": amount,
                    "currency": (profile.currency or "ARS").strip().upper(),
                    "month_classes": month_classes,
                    "month_hours": month_hours,
                    "completed_hours": completed_hours,
                },
            )
            generated_ids.append(settlement.id)
            if created:
                created_count += 1
            else:
                updated_count += 1

    settlements = InstructorSettlement.objects.select_related(
        "organization",
        "instructor_profile",
        "instructor_profile__user",
    ).filter(id__in=generated_ids).order_by("instructor_profile__user__username", "id")

    return Response(
        {
            "detail": f"Liquidacion generada para {month:02d}/{year}",
            "created_count": created_count,
            "updated_count": updated_count,
            "kept_paid_count": kept_paid_count,
            "settlements": _serialize_instructor_settlements(settlements),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def instructor_settlement_mark_paid(request, settlement_id):
    try:
        settlement = InstructorSettlement.objects.select_related(
            "organization",
            "instructor_profile",
            "instructor_profile__user",
        ).get(id=settlement_id)
    except InstructorSettlement.DoesNotExist:
        return Response({"detail": "Liquidacion no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    if is_platform_admin(request.user):
        pass
    elif is_owner(request.user):
        if settlement.organization_id not in get_owned_org_ids(request.user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
    else:
        return Response({"detail": "Solo owner/admin puede marcar pagos"}, status=status.HTTP_403_FORBIDDEN)

    serializer = InstructorSettlementMarkPaidSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    update_fields = []
    if settlement.status != InstructorSettlement.STATUS_PAID:
        settlement.status = InstructorSettlement.STATUS_PAID
        settlement.paid_at = timezone.now()
        update_fields.extend(["status", "paid_at"])
    notes = serializer.validated_data.get("notes")
    if notes is not None and settlement.notes != notes.strip():
        settlement.notes = notes.strip()
        update_fields.append("notes")

    if update_fields:
        settlement.save(update_fields=update_fields + ["updated_at"])

    data = InstructorSettlementSerializer(settlement).data
    return Response(data, status=status.HTTP_200_OK)
