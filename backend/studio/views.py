# Compatibility layer: keeps legacy import path studio.views.
from studio.modules.core.views import EstablishmentViewSet, OrganizationViewSet, RoomViewSet
from studio.modules.classes.views import StudioClassViewSet
from studio.modules.dashboard.views import dashboard_summary
from studio.modules.payments.views import InvoiceViewSet, MembershipPlanViewSet, PaymentViewSet
from studio.modules.students.views import StudentViewSet
from studio.modules.users.views import PlatformSettingViewSet, UserViewSet, auth_me

__all__ = [
    "OrganizationViewSet",
    "EstablishmentViewSet",
    "RoomViewSet",
    "StudioClassViewSet",
    "MembershipPlanViewSet",
    "PaymentViewSet",
    "InvoiceViewSet",
    "StudentViewSet",
    "UserViewSet",
    "PlatformSettingViewSet",
    "dashboard_summary",
    "auth_me",
]
