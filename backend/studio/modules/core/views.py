from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from studio.models import Establishment, Organization, OrganizationMembership, Room
from studio.modules.users.services import is_owner, is_platform_admin

from .serializers import EstablishmentSerializer, OrganizationListSerializer, OrganizationSerializer, RoomSerializer


def get_owned_org_ids(user):
    return list(
        OrganizationMembership.objects.filter(user=user, is_active=True).values_list("organization_id", flat=True)
    )


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all().order_by("id")
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        user = self.request.user
        if self.action == "list" and is_platform_admin(user):
            return OrganizationListSerializer
        return OrganizationSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if is_platform_admin(user):
            if self.action == "list":
                return queryset.defer("logo")
            return queryset

        if is_owner(user):
            return queryset.filter(id__in=get_owned_org_ids(user))

        return queryset.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        if is_owner(user):
            already_has_organization = OrganizationMembership.objects.filter(
                user=user,
                role=OrganizationMembership.ROLE_OWNER,
            ).exists()
            if already_has_organization:
                return Response(
                    {"detail": "Solo puedes crear una empresa"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        payload = request.data.copy()

        if not is_platform_admin(user):
            payload["is_active"] = True
            payload["subscription_enabled"] = False
            payload["subscription_plan"] = ""
            payload["subscription_status"] = Organization.SUBSCRIPTION_STATUS_INACTIVE
            payload["trial_starts_at"] = None
            payload["trial_ends_at"] = None
            payload.pop("enabled_modules", None)
            payload.pop("mercadolibre_enabled", None)
            payload.pop("electronic_billing_enabled", None)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()

        if is_owner(user):
            OrganizationMembership.objects.get_or_create(
                user=user,
                organization=organization,
                defaults={"role": OrganizationMembership.ROLE_OWNER, "is_active": True},
            )

        return Response(self.get_serializer(organization).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        user = request.user
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        organization = self.get_object()
        if is_owner(user) and organization.id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        partial = kwargs.pop("partial", False)
        payload = request.data.copy()
        requested_legal_name = payload.get("legal_name")
        if requested_legal_name is not None:
            requested_legal_name = str(requested_legal_name).strip()

        if organization.fiscal_document_issued and requested_legal_name is not None and requested_legal_name != organization.legal_name:
            return Response(
                {"detail": "No se puede cambiar la razon social luego de emitir documento fiscal"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_platform_admin(user):
            payload.pop("is_active", None)
            payload.pop("subscription_enabled", None)
            payload.pop("subscription_plan", None)
            payload.pop("subscription_status", None)
            payload.pop("trial_starts_at", None)
            payload.pop("trial_ends_at", None)
            payload.pop("enabled_modules", None)
            payload.pop("mercadolibre_enabled", None)
            payload.pop("electronic_billing_enabled", None)
        payload.pop("fiscal_document_issued", None)

        serializer = self.get_serializer(organization, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="mark-fiscal-issued")
    def mark_fiscal_issued(self, request, pk=None):
        user = request.user
        organization = self.get_object()
        if not (is_platform_admin(user) or (is_owner(user) and organization.id in get_owned_org_ids(user))):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        organization.fiscal_document_issued = True
        organization.save(update_fields=["fiscal_document_issued"])
        return Response(self.get_serializer(organization).data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        if not is_platform_admin(user):
            return Response({"detail": "Solo admin plataforma puede eliminar organizaciones"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class EstablishmentViewSet(viewsets.ModelViewSet):
    queryset = Establishment.objects.select_related("organization").all().order_by("id")
    serializer_class = EstablishmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        org_id = self.request.query_params.get("organization_id")
        if org_id:
            queryset = queryset.filter(organization_id=org_id)

        if is_platform_admin(user):
            return queryset

        if is_owner(user):
            return queryset.filter(organization_id__in=get_owned_org_ids(user))

        return queryset.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        organization_id = request.data.get("organization")
        if not organization_id:
            return Response({"detail": "organization es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            organization_id = int(organization_id)
        except (TypeError, ValueError):
            return Response({"detail": "organization debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)

        if is_owner(user) and organization_id not in get_owned_org_ids(user):
            return Response({"detail": "No puedes crear sedes fuera de tus empresas"}, status=status.HTTP_403_FORBIDDEN)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = request.user
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        establishment = self.get_object()
        owner_org_ids = get_owned_org_ids(user) if is_owner(user) else []

        if is_owner(user) and establishment.organization_id not in owner_org_ids:
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        target_organization = request.data.get("organization")
        if is_owner(user) and target_organization:
            try:
                target_organization = int(target_organization)
            except (TypeError, ValueError):
                return Response({"detail": "organization debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)
            if target_organization not in owner_org_ids:
                return Response({"detail": "No puedes mover sedes fuera de tus empresas"}, status=status.HTTP_403_FORBIDDEN)

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        establishment = self.get_object()
        if is_owner(user) and establishment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.select_related("establishment", "establishment__organization").all().order_by("id")
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        est_id = self.request.query_params.get("establishment_id")
        if est_id:
            queryset = queryset.filter(establishment_id=est_id)

        if is_platform_admin(user):
            return queryset

        if is_owner(user):
            return queryset.filter(establishment__organization_id__in=get_owned_org_ids(user))

        return queryset.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        establishment_id = request.data.get("establishment")
        if not establishment_id:
            return Response({"detail": "establishment es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            establishment_id = int(establishment_id)
        except (TypeError, ValueError):
            return Response({"detail": "establishment debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)

        if is_owner(user):
            owned_org_ids = set(get_owned_org_ids(user))
            if not Establishment.objects.filter(id=establishment_id, organization_id__in=owned_org_ids).exists():
                return Response({"detail": "No puedes crear salones fuera de tus sedes"}, status=status.HTTP_403_FORBIDDEN)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = request.user
        room = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        if is_owner(user) and room.establishment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        target_establishment = request.data.get("establishment")
        if is_owner(user) and target_establishment:
            try:
                target_establishment = int(target_establishment)
            except (TypeError, ValueError):
                return Response({"detail": "establishment debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)

            owned_org_ids = set(get_owned_org_ids(user))
            if not Establishment.objects.filter(id=target_establishment, organization_id__in=owned_org_ids).exists():
                return Response({"detail": "No puedes mover salones fuera de tus sedes"}, status=status.HTTP_403_FORBIDDEN)

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        room = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and room.establishment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="block")
    def block(self, request, pk=None):
        user = request.user
        room = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and room.establishment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            return Response({"detail": "reason es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        blocked_from_raw = request.data.get("blocked_from")
        blocked_to_raw = request.data.get("blocked_to")
        blocked_from = None
        blocked_to = None
        if blocked_from_raw:
            try:
                blocked_from = timezone.datetime.fromisoformat(str(blocked_from_raw))
            except ValueError:
                return Response({"detail": "blocked_from invalido"}, status=status.HTTP_400_BAD_REQUEST)
        if blocked_to_raw:
            try:
                blocked_to = timezone.datetime.fromisoformat(str(blocked_to_raw))
            except ValueError:
                return Response({"detail": "blocked_to invalido"}, status=status.HTTP_400_BAD_REQUEST)
        if blocked_from and blocked_to and blocked_to < blocked_from:
            return Response({"detail": "blocked_to debe ser mayor a blocked_from"}, status=status.HTTP_400_BAD_REQUEST)

        room.is_blocked = True
        room.blocked_reason = reason
        room.blocked_from = blocked_from
        room.blocked_to = blocked_to
        room.save(update_fields=["is_blocked", "blocked_reason", "blocked_from", "blocked_to"])
        return Response(self.get_serializer(room).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="unblock")
    def unblock(self, request, pk=None):
        user = request.user
        room = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and room.establishment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        room.is_blocked = False
        room.blocked_reason = ""
        room.blocked_from = None
        room.blocked_to = None
        room.save(update_fields=["is_blocked", "blocked_reason", "blocked_from", "blocked_to"])
        return Response(self.get_serializer(room).data, status=status.HTTP_200_OK)
