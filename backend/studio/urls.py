from django.urls import include, path
from rest_framework.routers import DefaultRouter

from studio.modules.assistant.views import ai_assistant_ask, ai_assistant_config, ai_assistant_history
from studio.modules.classes.views import (
    StudioClassViewSet,
    instructor_collection,
    instructor_detail,
    instructor_settlement_collection,
    instructor_settlement_generate,
    instructor_settlement_mark_paid,
)
from studio.modules.core.views import EstablishmentViewSet, OrganizationViewSet, RoomViewSet
from studio.modules.dashboard.views import dashboard_summary
from studio.modules.payments.views import InvoiceViewSet, MembershipPlanViewSet, PaymentViewSet
from studio.modules.social.views import (
    SocialAccountViewSet,
    SocialCampaignViewSet,
    SocialPostViewSet,
    social_workspace,
)
from studio.modules.students.views import StudentViewSet
from studio.modules.users.views import (
    PlatformSettingViewSet,
    PlatformSubscriptionPlanViewSet,
    auth_portal_login,
    UserViewSet,
    auth_marketplace_organizations,
    auth_me,
    auth_register_company,
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
router.register("social-accounts", SocialAccountViewSet, basename="social-account")
router.register("social-posts", SocialPostViewSet, basename="social-post")
router.register("social-campaigns", SocialCampaignViewSet, basename="social-campaign")
router.register("students", StudentViewSet, basename="student")
router.register("users", UserViewSet, basename="user")
router.register("platform-settings", PlatformSettingViewSet, basename="platform-setting")
router.register("platform-subscription-plans", PlatformSubscriptionPlanViewSet, basename="platform-subscription-plan")

urlpatterns = [
    path("auth/portal-login/", auth_portal_login, name="auth-portal-login"),
    path("auth/me/", auth_me, name="auth-me"),
    path("auth/marketplace-organizations/", auth_marketplace_organizations, name="auth-marketplace-organizations"),
    path("auth/register-company/", auth_register_company, name="auth-register-company"),
    path("auth/register-student/", auth_register_student, name="auth-register-student"),
    path("auth/sso/google/", auth_sso_google, name="auth-sso-google"),
    path("auth/sso/facebook/", auth_sso_facebook, name="auth-sso-facebook"),
    path("ai-assistant/config/", ai_assistant_config, name="ai-assistant-config"),
    path("ai-assistant/history/", ai_assistant_history, name="ai-assistant-history"),
    path("ai-assistant/ask/", ai_assistant_ask, name="ai-assistant-ask"),
    path("social/workspace/", social_workspace, name="social-workspace"),
    path("instructors/", instructor_collection, name="instructor-collection"),
    path("instructors/<int:profile_id>/", instructor_detail, name="instructor-detail"),
    path("instructor-settlements/", instructor_settlement_collection, name="instructor-settlement-collection"),
    path("instructor-settlements/generate/", instructor_settlement_generate, name="instructor-settlement-generate"),
    path(
        "instructor-settlements/<int:settlement_id>/mark-paid/",
        instructor_settlement_mark_paid,
        name="instructor-settlement-mark-paid",
    ),
    path("dashboard/summary/", dashboard_summary, name="dashboard-summary"),
    path("", include(router.urls)),
]
