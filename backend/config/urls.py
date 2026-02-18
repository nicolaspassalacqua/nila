from django.contrib import admin
from django.urls import include, path
from rest_framework import routers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import InternalProfessionalViewSet
from booking.views import AppointmentViewSet
from core.views import ArcaCuitBridgeView, CompanyCuitLookupView, CompanyProfileView, PlatformSettingViewSet, TenantMembershipViewSet, TenantRatingViewSet, TenantViewSet
from crm.views import ClientViewSet
from marketplace.views import EstablishmentSubscribeView, MarketplaceDiscoveryView, ServiceViewSet
from notifications.views import MessageQueueViewSet, MessageTemplateViewSet
from pos.views import CashMovementViewSet, InvoiceViewSet, OrderItemViewSet, OrderViewSet, PaymentViewSet, ProductViewSet
from waitlist.views import WaitlistEntryViewSet, WaitlistOfferViewSet, WaitlistViewSet

router = routers.DefaultRouter(trailing_slash=False)
router.register(r"tenants", TenantViewSet, basename="tenant")
router.register(r"memberships", TenantMembershipViewSet, basename="membership")
router.register(r"platform-settings", PlatformSettingViewSet, basename="platform-setting")
router.register(r"tenant-ratings", TenantRatingViewSet, basename="tenant-rating")
router.register(r"services", ServiceViewSet, basename="service")
router.register(r"clients", ClientViewSet, basename="client")
router.register(r"appointments", AppointmentViewSet, basename="appointment")
router.register(r"waitlists", WaitlistViewSet, basename="waitlist")
router.register(r"waitlist-entries", WaitlistEntryViewSet, basename="waitlist-entry")
router.register(r"waitlist-offers", WaitlistOfferViewSet, basename="waitlist-offer")
router.register(r"message-templates", MessageTemplateViewSet, basename="message-template")
router.register(r"message-queue", MessageQueueViewSet, basename="message-queue")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"order-items", OrderItemViewSet, basename="order-item")
router.register(r"payments", PaymentViewSet, basename="payment")
router.register(r"cash-movements", CashMovementViewSet, basename="cash-movement")
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"internal-professionals", InternalProfessionalViewSet, basename="internal-professional")


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"status": "ok", "service": "nila-mvp-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("accounts.urls")),
    path("api/auth/token", TokenObtainPairView.as_view(), name="token_obtain_pair_noslash"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh", TokenRefreshView.as_view(), name="token_refresh_noslash"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/company-profile", CompanyProfileView.as_view(), name="company_profile_noslash"),
    path("api/company-profile/", CompanyProfileView.as_view(), name="company_profile"),
    path("api/company-profile/cuit-lookup", CompanyCuitLookupView.as_view(), name="company_cuit_lookup_noslash"),
    path("api/company-profile/cuit-lookup/", CompanyCuitLookupView.as_view(), name="company_cuit_lookup"),
    path("api/integrations/arca/cuit", ArcaCuitBridgeView.as_view(), name="arca_cuit_bridge_noslash"),
    path("api/integrations/arca/cuit/", ArcaCuitBridgeView.as_view(), name="arca_cuit_bridge"),
    path("api/marketplace/discovery", MarketplaceDiscoveryView.as_view(), name="marketplace_discovery_noslash"),
    path("api/marketplace/discovery/", MarketplaceDiscoveryView.as_view(), name="marketplace_discovery"),
    path("api/marketplace/establishments/<int:tenant_id>/subscribe", EstablishmentSubscribeView.as_view(), name="establishment_subscribe_noslash"),
    path("api/marketplace/establishments/<int:tenant_id>/subscribe/", EstablishmentSubscribeView.as_view(), name="establishment_subscribe"),
    path("api/", include(router.urls)),
]
