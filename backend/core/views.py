from django.apps import apps
from django.conf import settings
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Company, PlatformSetting, Tenant, TenantMembership, TenantRating, TenantSubscriptionPlan
from core.serializers import (
    CompanySerializer,
    PlatformSettingSerializer,
    TenantMembershipSerializer,
    TenantRatingSerializer,
    TenantSerializer,
)
from core.tenant_access import get_tenant_for_request, require_tenant_role
from marketplace.models import Service


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class TenantViewSet(viewsets.ModelViewSet):
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Tenant.objects.filter(
            memberships__user=self.request.user,
            memberships__is_active=True,
            is_active=True,
        ).distinct().order_by("name")

    def perform_create(self, serializer):
        company = Company.objects.filter(owner=self.request.user, is_active=True).first()
        if not company:
            raise PermissionDenied("Primero debes crear tu empresa para dar de alta establecimientos.")
        tenant = serializer.save(company=company)
        TenantMembership.objects.get_or_create(
            tenant=tenant,
            user=self.request.user,
            defaults={"role": TenantMembership.Role.OWNER, "is_active": True},
        )

    def perform_destroy(self, instance):
        require_tenant_role(
            self.request.user,
            instance,
            {TenantMembership.Role.OWNER},
        )
        instance.delete()

    @action(detail=True, methods=["get"], url_path="setup-status")
    def setup_status(self, request, pk=None):
        tenant = self.get_object()
        require_tenant_role(
            request.user,
            tenant,
            {TenantMembership.Role.OWNER, TenantMembership.Role.ADMIN, TenantMembership.Role.STAFF},
        )
        service_count = Service.objects.filter(tenant=tenant, is_active=True).count()
        plans_count = TenantSubscriptionPlan.objects.filter(tenant=tenant, is_active=True).count()
        payment_enabled = bool(tenant.allow_online_payments or tenant.allow_local_payments)
        return Response(
            {
                "tenant_id": tenant.id,
                "services_count": service_count,
                "subscription_plans_count": plans_count,
                "payments_enabled": payment_enabled,
                "prepay_required": tenant.prepay_required,
                "cancellation_penalty_percent": str(tenant.cancellation_penalty_percent),
            }
        )


class TenantMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = TenantMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TenantMembership.objects.select_related("tenant", "user").filter(
            tenant__memberships__user=self.request.user,
            tenant__memberships__is_active=True,
            tenant__is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        tenant = serializer.validated_data["tenant"]
        require_tenant_role(
            self.request.user,
            tenant,
            {TenantMembership.Role.OWNER, TenantMembership.Role.ADMIN},
        )
        serializer.save()

    def perform_update(self, serializer):
        tenant = serializer.instance.tenant
        require_tenant_role(
            self.request.user,
            tenant,
            {TenantMembership.Role.OWNER, TenantMembership.Role.ADMIN},
        )
        serializer.save()

    def perform_destroy(self, instance):
        tenant = instance.tenant
        require_tenant_role(
            self.request.user,
            tenant,
            {TenantMembership.Role.OWNER},
        )
        if instance.user_id == self.request.user.id and instance.role == TenantMembership.Role.OWNER:
            raise PermissionDenied("No podes eliminar tu propia membresia owner.")
        instance.delete()


class PlatformSettingViewSet(viewsets.ModelViewSet):
    serializer_class = PlatformSettingSerializer
    permission_classes = [IsStaffUser]
    queryset = PlatformSetting.objects.all().order_by("key")

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="system-overview")
    def system_overview(self, _request):
        appointment_count = apps.get_model("booking", "Appointment").objects.count()
        service_count = apps.get_model("marketplace", "Service").objects.count()
        client_count = apps.get_model("crm", "Client").objects.count()
        order_count = apps.get_model("pos", "Order").objects.count()
        waitlist_count = apps.get_model("waitlist", "Waitlist").objects.count()

        return Response(
            {
                "totals": {
                    "tenants": Tenant.objects.count(),
                    "users": apps.get_model("accounts", "User").objects.count(),
                    "services": service_count,
                    "clients": client_count,
                    "appointments": appointment_count,
                    "waitlists": waitlist_count,
                    "orders": order_count,
                    "platform_settings": PlatformSetting.objects.count(),
                },
                "active_flags": [
                    setting.key
                    for setting in PlatformSetting.objects.filter(is_active=True).only("key")
                ],
            }
        )


class TenantRatingViewSet(viewsets.ModelViewSet):
    serializer_class = TenantRatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return TenantRating.objects.select_related("user").filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant, user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user_id != self.request.user.id:
            raise PermissionDenied("Solo podes editar tu propia valoracion.")
        serializer.save()


class CompanyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _tax_condition_locked(self, company: Company) -> bool:
        Invoice = apps.get_model("pos", "Invoice")
        return Invoice.objects.filter(tenant__company=company).exists()

    def get(self, request):
        company = Company.objects.filter(owner=request.user).first()
        if not company:
            return Response({"configured": False, "company": None, "tax_condition_locked": False})
        return Response(
            {
                "configured": True,
                "company": CompanySerializer(company).data,
                "tax_condition_locked": self._tax_condition_locked(company),
            }
        )

    def post(self, request):
        if Company.objects.filter(owner=request.user).exists():
            raise PermissionDenied("Ya tienes una empresa creada. Solo puedes editarla.")
        serializer = CompanySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = serializer.save(owner=request.user)
        return Response(
            {
                "configured": True,
                "company": CompanySerializer(company).data,
                "tax_condition_locked": False,
            }
        )

    def patch(self, request):
        company = Company.objects.filter(owner=request.user).first()
        if not company:
            raise PermissionDenied("No tienes empresa creada.")
        locked = self._tax_condition_locked(company)
        new_tax_condition = request.data.get("tax_condition")
        if locked and new_tax_condition and new_tax_condition != company.tax_condition:
            raise PermissionDenied(
                "No puedes cambiar la condicion fiscal luego de emitir la primera factura."
            )
        serializer = CompanySerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(
            {
                "configured": True,
                "company": CompanySerializer(updated).data,
                "tax_condition_locked": locked,
            }
        )


class CompanyCuitLookupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _resolve_string_setting(self, key: str, env_var: str) -> str:
        setting = (
            PlatformSetting.objects.filter(
                key=key,
                value_type=PlatformSetting.ValueType.STRING,
                is_active=True,
            )
            .only("value")
            .first()
        )
        if setting and isinstance(setting.value, str) and setting.value.strip():
            return setting.value.strip()
        return str(getattr(settings, env_var, "") or "").strip()

    def _resolve_number_setting(self, key: str, env_var: str, default_value: int) -> int:
        setting = (
            PlatformSetting.objects.filter(
                key=key,
                value_type=PlatformSetting.ValueType.NUMBER,
                is_active=True,
            )
            .only("value")
            .first()
        )
        if setting and isinstance(setting.value, (int, float)):
            return int(setting.value)
        raw = getattr(settings, env_var, default_value)
        try:
            return int(raw)
        except Exception:
            return default_value

    def get(self, request):
        raw_cuit = str(request.query_params.get("cuit", ""))
        cuit = "".join(ch for ch in raw_cuit if ch.isdigit())
        if len(cuit) != 11:
            return Response(
                {
                    "found": False,
                    "detail": "CUIT invalido. Debe contener 11 digitos.",
                },
                status=400,
            )

        provider_url = self._resolve_string_setting("afip-cuit-lookup-url", "AFIP_CUIT_LOOKUP_URL")
        if not provider_url:
            return Response(
                {
                    "found": False,
                    "detail": "Validacion AFIP no configurada. Completa los datos manualmente.",
                }
            )

        resolved_provider_url = provider_url
        if provider_url.startswith("/"):
            resolved_provider_url = f"{request.scheme}://{request.get_host()}{provider_url}"
        target_url = (
            resolved_provider_url.format(cuit=cuit)
            if "{cuit}" in resolved_provider_url
            else f"{resolved_provider_url}?{urlencode({'cuit': cuit})}"
        )
        timeout_seconds = self._resolve_number_setting("afip-cuit-lookup-timeout", "AFIP_CUIT_LOOKUP_TIMEOUT", 5)
        token = self._resolve_string_setting("afip-cuit-lookup-token", "AFIP_CUIT_LOOKUP_TOKEN")
        headers = {"Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            req = Request(target_url, headers=headers)
            with urlopen(req, timeout=timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except Exception:
            return Response(
                {
                    "found": False,
                    "detail": "No se pudo validar CUIT con AFIP en este momento. Completa los datos manualmente.",
                }
            )

        if isinstance(payload, dict) and "found" in payload and "company" in payload:
            if not payload.get("found"):
                return Response(
                    {
                        "found": False,
                        "detail": str(payload.get("detail") or "No se encontro CUIT en AFIP/ARCA."),
                    }
                )
            return Response(
                {
                    "found": True,
                    "source": str(payload.get("source") or "provider"),
                    "company": payload.get("company") or {},
                }
            )

        tax_condition_raw = str(
            payload.get("tax_condition")
            or payload.get("condicion_iva")
            or payload.get("iva")
            or ""
        ).strip().lower()
        tax_condition = ""
        if "monotrib" in tax_condition_raw:
            tax_condition = "monotributo"
        elif "responsable" in tax_condition_raw and "inscrip" in tax_condition_raw:
            tax_condition = "responsable_inscripto"
        elif "exento" in tax_condition_raw:
            tax_condition = "exento"
        elif "consumidor" in tax_condition_raw:
            tax_condition = "consumidor_final"

        legal_name = str(payload.get("legal_name") or payload.get("razon_social") or "").strip()
        trade_name = str(payload.get("trade_name") or payload.get("nombre_fantasia") or "").strip()
        billing_address = str(payload.get("billing_address") or payload.get("domicilio_fiscal") or "").strip()
        primary_zone = str(payload.get("primary_zone") or payload.get("ciudad") or payload.get("localidad") or "").strip()

        found = bool(legal_name or trade_name or billing_address)
        if not found:
            return Response(
                {
                    "found": False,
                    "detail": "No se encontro CUIT en AFIP. Completa los datos manualmente.",
                }
            )

        return Response(
            {
                "found": True,
                "source": "afip",
                "company": {
                    "trade_name": trade_name,
                    "legal_name": legal_name,
                    "tax_condition": tax_condition,
                    "billing_address": billing_address,
                    "primary_zone": primary_zone,
                },
            }
        )


class ArcaCuitBridgeView(APIView):
    permission_classes = [permissions.AllowAny]

    def _resolve_string_setting(self, key: str, env_var: str = "") -> str:
        setting = (
            PlatformSetting.objects.filter(
                key=key,
                value_type=PlatformSetting.ValueType.STRING,
                is_active=True,
            )
            .only("value")
            .first()
        )
        if setting and isinstance(setting.value, str) and setting.value.strip():
            return setting.value.strip()
        if env_var:
            return str(getattr(settings, env_var, "") or "").strip()
        return ""

    def _resolve_number_setting(self, key: str, env_var: str = "", default_value: int = 6) -> int:
        setting = (
            PlatformSetting.objects.filter(
                key=key,
                value_type=PlatformSetting.ValueType.NUMBER,
                is_active=True,
            )
            .only("value")
            .first()
        )
        if setting and isinstance(setting.value, (int, float)):
            return int(setting.value)
        if env_var:
            try:
                return int(getattr(settings, env_var, default_value))
            except Exception:
                return default_value
        return default_value

    def _normalize_cuit(self, raw_value: str) -> str:
        return "".join(ch for ch in str(raw_value or "") if ch.isdigit())

    def _resolve_tax_condition(self, raw_value: str) -> str:
        value = str(raw_value or "").strip().lower()
        if "monotrib" in value:
            return "monotributo"
        if "responsable" in value and "inscrip" in value:
            return "responsable_inscripto"
        if "exento" in value:
            return "exento"
        if "consumidor" in value:
            return "consumidor_final"
        return ""

    def _resolve_from_local_company(self, cuit_digits: str):
        company = None
        for candidate in Company.objects.filter(is_active=True).only(
            "trade_name",
            "legal_name",
            "tax_condition",
            "billing_address",
            "primary_zone",
            "cuit",
        ):
            if self._normalize_cuit(candidate.cuit) == cuit_digits:
                company = candidate
                break
        if not company:
            return None
        return {
            "found": True,
            "source": "local-cache",
            "company": {
                "trade_name": company.trade_name or "",
                "legal_name": company.legal_name or "",
                "tax_condition": company.tax_condition or "",
                "billing_address": company.billing_address or "",
                "primary_zone": company.primary_zone or "",
            },
        }

    def get(self, request):
        raw_cuit = str(request.query_params.get("cuit", ""))
        cuit = self._normalize_cuit(raw_cuit)
        if len(cuit) != 11:
            return Response({"found": False, "detail": "CUIT invalido. Debe contener 11 digitos."}, status=400)

        bridge_token = self._resolve_string_setting("arca-bridge-token", "ARCA_BRIDGE_TOKEN")
        if bridge_token:
            auth_header = str(request.headers.get("Authorization", "") or "")
            expected = f"Bearer {bridge_token}"
            if auth_header != expected:
                return Response({"found": False, "detail": "No autorizado para consulta ARCA."}, status=401)

        external_url = self._resolve_string_setting("arca-external-url", "ARCA_EXTERNAL_URL")
        external_token = self._resolve_string_setting("arca-external-token", "ARCA_EXTERNAL_TOKEN")
        timeout_seconds = self._resolve_number_setting("arca-external-timeout", "ARCA_EXTERNAL_TIMEOUT", 6)
        wsaa_url = self._resolve_string_setting("afip-wsaa-url")
        ws_constancia_url = self._resolve_string_setting("afip-constancia-url")
        service_name = self._resolve_string_setting("afip-service-name")
        cuit_represented = self._resolve_string_setting("afip-cuit-represented")

        if external_url:
            target_url = (
                external_url.format(cuit=cuit)
                if "{cuit}" in external_url
                else f"{external_url}?{urlencode({'cuit': cuit})}"
            )
            headers = {"Accept": "application/json"}
            if external_token:
                headers["Authorization"] = f"Bearer {external_token}"
            try:
                req = Request(target_url, headers=headers)
                with urlopen(req, timeout=timeout_seconds) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                if isinstance(payload, dict) and "found" in payload and "company" in payload:
                    return Response(payload)
                return Response(
                    {
                        "found": True,
                        "source": "arca-external",
                        "company": {
                            "trade_name": str(payload.get("trade_name") or payload.get("nombre_fantasia") or "").strip(),
                            "legal_name": str(payload.get("legal_name") or payload.get("razon_social") or "").strip(),
                            "tax_condition": self._resolve_tax_condition(
                                str(payload.get("tax_condition") or payload.get("condicion_iva") or "")
                            ),
                            "billing_address": str(
                                payload.get("billing_address") or payload.get("domicilio_fiscal") or ""
                            ).strip(),
                            "primary_zone": str(payload.get("primary_zone") or payload.get("ciudad") or "").strip(),
                        },
                    }
                )
            except Exception:
                pass

        local_payload = self._resolve_from_local_company(cuit)
        if local_payload:
            return Response(local_payload)

        return Response(
            {
                "found": False,
                "detail": "ARCA no configurado o sin respuesta. Completa los datos manualmente.",
                "hint": {
                    "proxy_required": True,
                    "required_proxy_key": "arca-external-url",
                    "wsaa_url": wsaa_url,
                    "ws_constancia_url": ws_constancia_url,
                    "service_name": service_name,
                    "cuit_represented": cuit_represented,
                },
            }
        )
