from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from studio.models import Establishment, Organization, OrganizationMembership, Room, Student
from studio.modules.users.services import is_owner, is_platform_admin

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    user = request.user

    if is_platform_admin(user):
        return Response(
            {
                "organizations": Organization.objects.count(),
                "establishments": Establishment.objects.count(),
                "rooms": Room.objects.count(),
                "students": Student.objects.count(),
                "users": User.objects.count(),
            }
        )

    if is_owner(user):
        org_ids = list(
            OrganizationMembership.objects.filter(user=user, is_active=True).values_list("organization_id", flat=True)
        )
        return Response(
            {
                "organizations": Organization.objects.filter(id__in=org_ids).count(),
                "establishments": Establishment.objects.filter(organization_id__in=org_ids).count(),
                "rooms": Room.objects.filter(establishment__organization_id__in=org_ids).count(),
                "students": Student.objects.filter(organization_id__in=org_ids).count(),
                "users": User.objects.count(),
            }
        )

    return Response(
        {
            "organizations": 0,
            "establishments": 0,
            "rooms": 0,
            "students": 0,
            "users": 1,
        }
    )
