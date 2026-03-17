from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from studio.models import Organization, OrganizationMembership
from studio.modules.users.services import is_owner, is_platform_admin

from .models import SocialAccount, SocialCampaign, SocialPost
from .serializers import SocialAccountSerializer, SocialCampaignSerializer, SocialPostSerializer


def get_owned_org_ids(user):
    return list(
        OrganizationMembership.objects.filter(user=user, is_active=True).values_list("organization_id", flat=True)
    )


def get_authorized_org_ids(user):
    if is_platform_admin(user):
        return list(Organization.objects.values_list("id", flat=True))
    if is_owner(user):
        return get_owned_org_ids(user)
    return []


def ensure_social_seed(organization):
    if SocialAccount.objects.filter(organization=organization).exists():
        return

    handle_base = "".join(char for char in organization.name.lower() if char.isalnum())[:18] or "nilastudio"
    accounts = {
        "facebook": SocialAccount.objects.create(
            organization=organization,
            platform=SocialAccount.PLATFORM_FACEBOOK,
            account_name=organization.name,
            handle=handle_base,
            followers_count=1340,
            engagement_rate=Decimal("3.40"),
            growth_rate=Decimal("12.00"),
            metadata={"seeded": True},
        ),
        "instagram": SocialAccount.objects.create(
            organization=organization,
            platform=SocialAccount.PLATFORM_INSTAGRAM,
            account_name=organization.name,
            handle=f"{handle_base}_studio",
            followers_count=21500,
            engagement_rate=Decimal("5.80"),
            growth_rate=Decimal("21.00"),
            metadata={"seeded": True},
        ),
    }

    post_templates = [
        (
            "Buscas una practica mas precisa y consciente?",
            "Clases personalizadas, seguimiento del alumno y una experiencia mas ordenada para cada reserva.",
            "Publicacion destacada",
        ),
        (
            "Nuevo bloque de clases de reformer",
            "Abrimos nuevos horarios para alumnos iniciales e intermedios con cupos limitados por sala.",
            "Carrusel de horarios",
        ),
        (
            "Tu estudio tambien puede verse premium",
            "Combina presencia de marca, gestion de alumnos y cobros desde una sola plataforma.",
            "Pieza institucional",
        ),
    ]
    now = timezone.now()

    for platform_key, account in accounts.items():
        for index, template in enumerate(post_templates):
            SocialPost.objects.create(
                organization=organization,
                account=account,
                platform=account.platform,
                title=template[0],
                body=template[1],
                image_label=template[2],
                status=SocialPost.STATUS_PUBLISHED,
                likes_count=(26 if platform_key == "facebook" else 55) + index * 8,
                comments_count=index,
                shares_count=(index + 1) if platform_key == "facebook" else index,
                views_count=103 + index * 41 + (17 if platform_key == "instagram" else 0),
                published_at=now - timedelta(days=index * 7),
            )

    SocialCampaign.objects.bulk_create(
        [
            SocialCampaign(
                organization=organization,
                name="Clases introductorias",
                objective="Leads",
                status=SocialCampaign.STATUS_ACTIVE,
                leads_count=14,
                ctr=Decimal("4.80"),
                visitors_count=320,
                budget_amount=Decimal("35000"),
                budget_currency=organization.currency or "ARS",
                starts_at=now - timedelta(days=12),
                ends_at=now + timedelta(days=18),
            ),
            SocialCampaign(
                organization=organization,
                name="Reactivar alumnos inactivos",
                objective="Retencion",
                status=SocialCampaign.STATUS_ACTIVE,
                leads_count=8,
                ctr=Decimal("3.10"),
                visitors_count=180,
                budget_amount=Decimal("12000"),
                budget_currency=organization.currency or "ARS",
                starts_at=now - timedelta(days=4),
                ends_at=now + timedelta(days=10),
            ),
            SocialCampaign(
                organization=organization,
                name="Promocion sede norte",
                objective="Trafico",
                status=SocialCampaign.STATUS_DRAFT,
                leads_count=0,
                ctr=Decimal("0"),
                visitors_count=0,
                budget_amount=Decimal("22000"),
                budget_currency=organization.currency or "ARS",
            ),
        ]
    )


class OwnedOrganizationMixin:
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org_ids = get_authorized_org_ids(self.request.user)
        queryset = super().get_queryset()
        if not org_ids:
            return queryset.none()

        organization_id = self.request.query_params.get("organization_id")
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        return queryset.filter(organization_id__in=org_ids)

    def perform_create(self, serializer):
        organization = serializer.validated_data["organization"]
        if organization.id not in get_authorized_org_ids(self.request.user):
            raise PermissionDenied("Sin permisos")
        serializer.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.organization_id not in get_authorized_org_ids(request.user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.organization_id not in get_authorized_org_ids(request.user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class SocialAccountViewSet(OwnedOrganizationMixin, viewsets.ModelViewSet):
    queryset = SocialAccount.objects.select_related("organization").all()
    serializer_class = SocialAccountSerializer


class SocialPostViewSet(OwnedOrganizationMixin, viewsets.ModelViewSet):
    queryset = SocialPost.objects.select_related("organization", "account").all()
    serializer_class = SocialPostSerializer


class SocialCampaignViewSet(OwnedOrganizationMixin, viewsets.ModelViewSet):
    queryset = SocialCampaign.objects.select_related("organization").all()
    serializer_class = SocialCampaignSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def social_workspace(request):
    org_ids = get_authorized_org_ids(request.user)
    if not org_ids:
        return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

    requested_org_id = request.query_params.get("organization_id")
    try:
        organization_id = int(requested_org_id) if requested_org_id else int(org_ids[0])
    except (TypeError, ValueError):
        return Response({"detail": "organization_id invalido"}, status=status.HTTP_400_BAD_REQUEST)

    if organization_id not in org_ids:
        return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

    organization = get_object_or_404(Organization, id=organization_id)
    ensure_social_seed(organization)

    accounts = SocialAccount.objects.filter(organization=organization).order_by("platform", "account_name")
    posts = SocialPost.objects.filter(organization=organization).select_related("account")
    campaigns = SocialCampaign.objects.filter(organization=organization)

    summary = {
        "accounts_connected": accounts.filter(is_connected=True, is_active=True).count(),
        "published_posts": posts.filter(status=SocialPost.STATUS_PUBLISHED).count(),
        "active_campaigns": campaigns.filter(status=SocialCampaign.STATUS_ACTIVE).count(),
        "followers_total": accounts.aggregate(total=Sum("followers_count")).get("total") or 0,
        "avg_engagement_rate": float(accounts.aggregate(avg=Avg("engagement_rate")).get("avg") or 0),
        "campaign_leads_total": campaigns.aggregate(total=Sum("leads_count")).get("total") or 0,
        "campaign_visitors_total": campaigns.aggregate(total=Sum("visitors_count")).get("total") or 0,
    }

    return Response(
        {
            "organization": {
                "id": organization.id,
                "name": organization.name,
                "brand_color": organization.brand_color or "",
            },
            "summary": summary,
            "accounts": SocialAccountSerializer(accounts, many=True).data,
            "posts": SocialPostSerializer(posts, many=True).data,
            "campaigns": SocialCampaignSerializer(campaigns, many=True).data,
        }
    )
