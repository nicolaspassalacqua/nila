import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from django.db.models import Prefetch
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from studio.models import Establishment, Organization, OrganizationMembership, PlatformSetting, Student, StudentHistory
from studio.modules.students.serializers import StudentSerializer

from .serializers import PlatformSettingSerializer, UserSerializer
from .services import ROLE_NAMES, ensure_roles_exist, get_user_roles, is_platform_admin, is_student

User = get_user_model()

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
FACEBOOK_ME_URL = "https://graph.facebook.com/me"
FACEBOOK_DEBUG_TOKEN_URL = "https://graph.facebook.com/debug_token"


class SSOValidationError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def get_platform_setting():
    setting, _ = PlatformSetting.objects.get_or_create(singleton_key="default")
    return setting


def _build_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def _normalize_username_seed(value):
    raw = (value or "").strip().lower()
    raw = re.sub(r"[^a-z0-9._-]+", "", raw)
    return raw or "alumno"


def _generate_unique_username(seed):
    base = _normalize_username_seed(seed)
    candidate = base
    index = 1
    while User.objects.filter(username__iexact=candidate).exists():
        candidate = f"{base}{index}"
        index += 1
    return candidate


def _parse_full_name(full_name):
    cleaned = (full_name or "").strip()
    if not cleaned:
        return "", ""
    parts = cleaned.split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _http_get_json(url, headers=None):
    request = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(request, timeout=10) as response:
        body = response.read().decode("utf-8")
        return json.loads(body)


def _verify_google_access_token(access_token):
    token = (access_token or "").strip()
    if not token:
        raise SSOValidationError("missing_access_token", "google_access_token es requerido")

    payload = _http_get_json(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {token}"},
    )
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise SSOValidationError("email_not_provided", "Google no devolvio email para esta cuenta")

    return {
        "email": email,
        "first_name": (payload.get("given_name") or "").strip(),
        "last_name": (payload.get("family_name") or "").strip(),
        "full_name": (payload.get("name") or "").strip(),
        "provider_user_id": (payload.get("sub") or "").strip(),
    }


def _verify_facebook_access_token(access_token):
    token = (access_token or "").strip()
    if not token:
        raise SSOValidationError("missing_access_token", "facebook_access_token es requerido")

    query = urllib.parse.urlencode(
        {
            "fields": "id,name,email,first_name,last_name",
            "access_token": token,
        }
    )
    me_payload = _http_get_json(f"{FACEBOOK_ME_URL}?{query}")
    email = (me_payload.get("email") or "").strip().lower()
    if not email:
        raise SSOValidationError("email_not_provided", "Facebook no devolvio email. Asegura permiso de email.")

    app_id = (os.getenv("FACEBOOK_APP_ID", "") or "").strip()
    app_secret = (os.getenv("FACEBOOK_APP_SECRET", "") or "").strip()
    if app_id and app_secret:
        app_token = f"{app_id}|{app_secret}"
        debug_query = urllib.parse.urlencode({"input_token": token, "access_token": app_token})
        debug_payload = _http_get_json(f"{FACEBOOK_DEBUG_TOKEN_URL}?{debug_query}")
        data = debug_payload.get("data") or {}
        if not data.get("is_valid"):
            raise SSOValidationError("invalid_token", "Token de Facebook invalido")
        token_app_id = str(data.get("app_id") or "")
        if token_app_id and token_app_id != app_id:
            raise SSOValidationError("app_not_authorized", "Token de Facebook no corresponde a esta aplicacion")

    return {
        "email": email,
        "first_name": (me_payload.get("first_name") or "").strip(),
        "last_name": (me_payload.get("last_name") or "").strip(),
        "full_name": (me_payload.get("name") or "").strip(),
        "provider_user_id": str(me_payload.get("id") or "").strip(),
    }


def _assign_student_role(user):
    ensure_roles_exist()
    user.groups.add(Group.objects.get(name="alumno"))


def _get_marketplace_organizations():
    active_establishments = Establishment.objects.filter(is_active=True).order_by("name")
    return (
        Organization.objects.filter(is_active=True, subscription_enabled=True)
        .prefetch_related(Prefetch("establishments", queryset=active_establishments))
        .order_by("name")
    )


def _parse_establishment_ids(raw_value):
    if raw_value is None:
        return []
    if not isinstance(raw_value, list):
        raise ValueError("establishment_ids debe ser una lista")
    parsed = []
    for value in raw_value:
        try:
            parsed.append(int(value))
        except (TypeError, ValueError):
            raise ValueError("establishment_ids contiene valores invalidos")
    return sorted(set(parsed))


def _upsert_student_profile_for_org(
    *,
    user,
    organization,
    first_name,
    last_name,
    email,
    phone="",
    birth_date=None,
    current_level="",
    auth_provider=Student.AUTH_PROVIDER_LOCAL,
    establishment_ids=None,
    source="marketplace",
):
    defaults = {
        "first_name": (first_name or "").strip() or user.first_name or user.username,
        "last_name": (last_name or "").strip() or user.last_name,
        "email": (email or "").strip() or user.email,
        "phone": (phone or "").strip(),
        "birth_date": birth_date,
        "current_level": (current_level or "").strip(),
        "auth_provider": auth_provider,
        "is_active": True,
    }
    student, created = Student.objects.get_or_create(
        organization=organization,
        user=user,
        defaults=defaults,
    )

    if not created:
        dirty_fields = []
        for field, value in defaults.items():
            if value is None:
                continue
            if getattr(student, field) != value:
                setattr(student, field, value)
                dirty_fields.append(field)
        if dirty_fields:
            dirty_fields.append("updated_at")
            student.save(update_fields=dirty_fields)

    if establishment_ids:
        establishments = Establishment.objects.filter(id__in=establishment_ids, organization_id=organization.id)
        if establishments.count() != len(set(establishment_ids)):
            raise ValueError("Una o mas sedes no pertenecen a la empresa seleccionada")
        student.establishments.set(establishments)

    StudentHistory.objects.create(
        student=student,
        actor=user if user.is_authenticated else None,
        event_type=StudentHistory.EVENT_JOINED if created else StudentHistory.EVENT_UPDATED,
        description="Alumno asociado desde marketplace",
        metadata={"source": source, "auth_provider": auth_provider},
    )
    return student, created


@api_view(["GET"])
@permission_classes([AllowAny])
def auth_marketplace_organizations(_request):
    setting = get_platform_setting()
    organizations = _get_marketplace_organizations()
    payload = [
        {
            "id": org.id,
            "name": org.name,
            "logo": org.logo,
            "subscription_plan": org.subscription_plan,
            "city": org.fiscal_city or "",
            "address": org.address or "",
            "establishments": [
                {
                    "id": est.id,
                    "name": est.name,
                    "address": est.address or "",
                    "city": est.city or "",
                    "open_time": est.open_time,
                    "close_time": est.close_time,
                    "weekly_hours": est.weekly_hours,
                }
                for est in org.establishments.all()
            ],
        }
        for org in organizations
    ]
    return Response(
        {
            "allow_google_sso": setting.allow_google_sso,
            "allow_facebook_sso": setting.allow_facebook_sso,
            "organizations": payload,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def auth_register_student(request):
    username = (request.data.get("username") or "").strip()
    email = (request.data.get("email") or "").strip().lower()
    password = (request.data.get("password") or "").strip()
    first_name = (request.data.get("first_name") or "").strip()
    last_name = (request.data.get("last_name") or "").strip()
    phone = (request.data.get("phone") or "").strip()
    current_level = (request.data.get("current_level") or "").strip()
    birth_date = request.data.get("birth_date")
    organization_id = request.data.get("organization_id")

    if not email:
        return Response({"detail": "email es requerido"}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 8:
        return Response({"detail": "La contrasena debe tener al menos 8 caracteres"}, status=status.HTTP_400_BAD_REQUEST)
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

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"detail": "Ya existe un usuario con este email. Inicia sesion o usa SSO."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not username:
        username = _generate_unique_username(email.split("@")[0])
    elif User.objects.filter(username__iexact=username).exists():
        return Response({"detail": "username ya esta en uso"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        establishment_ids = _parse_establishment_ids(request.data.get("establishment_ids", []))
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        _assign_student_role(user)
        student, _ = _upsert_student_profile_for_org(
            user=user,
            organization=organization,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            birth_date=birth_date,
            current_level=current_level,
            auth_provider=Student.AUTH_PROVIDER_LOCAL,
            establishment_ids=establishment_ids,
            source="register_local",
        )

    return Response(
        {
            "tokens": _build_tokens(user),
            "student_profile": StudentSerializer(student).data,
        },
        status=status.HTTP_201_CREATED,
    )


def _auth_sso(provider, request):
    setting = get_platform_setting()
    if provider == Student.AUTH_PROVIDER_GOOGLE and not setting.allow_google_sso:
        return Response(
            {"code": "provider_disabled", "detail": "Google SSO deshabilitado por administrador"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if provider == Student.AUTH_PROVIDER_FACEBOOK and not setting.allow_facebook_sso:
        return Response(
            {"code": "provider_disabled", "detail": "Facebook SSO deshabilitado por administrador"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        if provider == Student.AUTH_PROVIDER_GOOGLE:
            identity = _verify_google_access_token(request.data.get("google_access_token"))
        else:
            identity = _verify_facebook_access_token(request.data.get("facebook_access_token"))
    except SSOValidationError as exc:
        return Response({"code": exc.code, "detail": exc.message}, status=status.HTTP_400_BAD_REQUEST)
    except urllib.error.HTTPError as exc:
        detail = f"{provider} SSO rechazo el token ({exc.code})"
        code = "invalid_token" if exc.code in (400, 401, 403) else "provider_http_error"
        return Response({"code": code, "detail": detail}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response(
            {"code": "token_validation_failed", "detail": f"No se pudo validar token de {provider} SSO"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = identity["email"]
    input_first_name = (request.data.get("first_name") or "").strip()
    input_last_name = (request.data.get("last_name") or "").strip()
    parsed_first_name, parsed_last_name = _parse_full_name(identity.get("full_name"))
    first_name = input_first_name or identity.get("first_name") or parsed_first_name
    last_name = input_last_name or identity.get("last_name") or parsed_last_name
    organization_id = request.data.get("organization_id")
    phone = (request.data.get("phone") or "").strip()
    current_level = (request.data.get("current_level") or "").strip()
    birth_date = request.data.get("birth_date")

    try:
        establishment_ids = _parse_establishment_ids(request.data.get("establishment_ids", []))
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user = User.objects.filter(email__iexact=email).first()
        created_user = False
        if not user:
            username_seed = request.data.get("username") or email.split("@")[0]
            user = User.objects.create(
                username=_generate_unique_username(username_seed),
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            user.set_unusable_password()
            user.save(update_fields=["password"])
            created_user = True

        _assign_student_role(user)

        student_profile = None
        if organization_id:
            try:
                organization_id = int(organization_id)
            except (TypeError, ValueError):
                return Response(
                    {"code": "invalid_organization", "detail": "organization_id debe ser numerico"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                organization = Organization.objects.get(id=organization_id, is_active=True, subscription_enabled=True)
            except Organization.DoesNotExist:
                return Response(
                    {"code": "organization_unavailable", "detail": "La empresa no esta disponible en marketplace"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            student_profile, _ = _upsert_student_profile_for_org(
                user=user,
                organization=organization,
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                birth_date=birth_date,
                current_level=current_level,
                auth_provider=provider,
                establishment_ids=establishment_ids,
                source=f"sso_{provider}",
            )

    payload = {"tokens": _build_tokens(user), "created_user": created_user}
    payload["identity"] = {"email": email, "provider_user_id": identity.get("provider_user_id")}
    if student_profile:
        payload["student_profile"] = StudentSerializer(student_profile).data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def auth_sso_google(request):
    return _auth_sso(Student.AUTH_PROVIDER_GOOGLE, request)


@api_view(["POST"])
@permission_classes([AllowAny])
def auth_sso_facebook(request):
    return _auth_sso(Student.AUTH_PROVIDER_FACEBOOK, request)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_me(request):
    user = request.user
    roles = get_user_roles(user)

    if is_platform_admin(user):
        portal = "platform_admin"
    elif "owner" in roles:
        portal = "owner"
    elif is_student(user):
        portal = "student"
    elif "instructor" in roles:
        portal = "owner"
    else:
        portal = "student"

    owned_org_ids = list(
        OrganizationMembership.objects.filter(user=user, is_active=True).values_list("organization_id", flat=True)
    )
    student_org_ids = list(Student.objects.filter(user=user).values_list("organization_id", flat=True))

    return Response(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "roles": roles,
            "portal": portal,
            "owned_organization_ids": owned_org_ids,
            "student_organization_ids": student_org_ids,
        }
    )


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=["get"], url_path="roles")
    def roles(self, _request):
        ensure_roles_exist()
        return Response({"roles": list(ROLE_NAMES)})

    @action(detail=True, methods=["post"], url_path="assign-role")
    def assign_role(self, request, pk=None):
        ensure_roles_exist()
        role_name = request.data.get("role")
        if role_name not in ROLE_NAMES:
            return Response({"detail": "Rol invalido"}, status=status.HTTP_400_BAD_REQUEST)

        user = self.get_object()
        if (user.is_staff or user.is_superuser) and role_name != "admin":
            return Response(
                {"detail": "Un usuario administrador de plataforma no puede cambiarse a rol no-admin"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role_name == "admin":
            user.is_staff = True
            user.save(update_fields=["is_staff"])

        allowed_groups = Group.objects.filter(name__in=ROLE_NAMES)
        user.groups.remove(*allowed_groups)
        user.groups.add(Group.objects.get(name=role_name))

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="owners")
    def owners(self, _request):
        ensure_roles_exist()
        users = User.objects.filter(groups__name="owner").distinct().order_by("id")
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="assign-owner-organization")
    def assign_owner_organization(self, request, pk=None):
        ensure_roles_exist()
        user = self.get_object()
        organization_id = request.data.get("organization_id")
        if not organization_id:
            return Response({"detail": "organization_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return Response({"detail": "Organizacion no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        user.groups.add(Group.objects.get(name="owner"))
        OrganizationMembership.objects.update_or_create(
            user=user,
            organization=organization,
            defaults={"role": OrganizationMembership.ROLE_OWNER, "is_active": True},
        )

        return Response(self.get_serializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="deactivate-owner-organization")
    def deactivate_owner_organization(self, request, pk=None):
        user = self.get_object()
        organization_id = request.data.get("organization_id")
        if not organization_id:
            return Response({"detail": "organization_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            membership = OrganizationMembership.objects.get(
                user=user,
                organization_id=organization_id,
                role=OrganizationMembership.ROLE_OWNER,
            )
        except OrganizationMembership.DoesNotExist:
            return Response({"detail": "Relacion owner-organizacion no encontrada"}, status=status.HTTP_404_NOT_FOUND)

        membership.is_active = False
        membership.save(update_fields=["is_active"])
        return Response(self.get_serializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = (request.data.get("new_password") or "").strip()

        if len(new_password) < 8:
            return Response(
                {"detail": "La nueva contrasena debe tener al menos 8 caracteres"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Contrasena actualizada"}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"detail": "No puedes eliminar tu propio usuario"}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


class PlatformSettingViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    def list(self, _request):
        serializer = PlatformSettingSerializer(get_platform_setting())
        return Response(serializer.data)

    def create(self, request):
        setting = get_platform_setting()
        serializer = PlatformSettingSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
