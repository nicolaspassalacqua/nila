from django.urls import include, path
from rest_framework.routers import DefaultRouter

from studio.modules.classes.views import StudioClassViewSet
from studio.modules.core.views import EstablishmentViewSet, OrganizationViewSet, RoomViewSet
from studio.modules.dashboard.views import dashboard_summary
from studio.modules.payments.views import InvoiceViewSet, MembershipPlanViewSet, PaymentViewSet
from studio.modules.students.views import StudentViewSet
from studio.modules.users.views import (
    PlatformSettingViewSet,
    UserViewSet,
    auth_marketplace_organizations,
    auth_me,
    auth_register_student,
    auth_sso_facebook,
    auth_sso_google,
)

router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("establishments", EstablishmentViewSet, basename="establishment")
router.register("rooms", RoomViewSet, basename="room")
router.register("classes", StudioClassViewSet, basename="class")
router.register("membership-plans", MembershipPlanViewSet, basename="membership-plan")
router.register("payments", PaymentViewSet, basename="payment")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("students", StudentViewSet, basename="student")
router.register("users", UserViewSet, basename="user")
router.register("platform-settings", PlatformSettingViewSet, basename="platform-setting")

urlpatterns = [
    path("auth/me/", auth_me, name="auth-me"),
    path("auth/marketplace-organizations/", auth_marketplace_organizations, name="auth-marketplace-organizations"),
    path("auth/register-student/", auth_register_student, name="auth-register-student"),
    path("auth/sso/google/", auth_sso_google, name="auth-sso-google"),
    path("auth/sso/facebook/", auth_sso_facebook, name="auth-sso-facebook"),
    path("dashboard/summary/", dashboard_summary, name="dashboard-summary"),
    path("", include(router.urls)),
]
