import json
import os
import urllib.parse
import urllib.request

from django.utils.text import slugify
from django.db.models import Count
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from accounts.serializers import InternalProfessionalSerializer, RegisterSerializer, UserSerializer
from core.models import PlatformSetting, Tenant


def resolve_setting_value(key: str, env_var: str = "") -> str:
    if env_var:
        env_value = os.getenv(env_var, "").strip()
        if env_value:
            return env_value

    setting = (
        PlatformSetting.objects.filter(
            key=key,
            value_type=PlatformSetting.ValueType.STRING,
            is_active=True,
        )
        .only("value")
        .first()
    )
    if not setting or not isinstance(setting.value, str):
        return ""
    return setting.value.strip()


def resolve_google_client_id() -> str:
    return resolve_setting_value("google-client-id", "GOOGLE_CLIENT_ID")


def resolve_facebook_app_id() -> str:
    return resolve_setting_value("facebook-app-id", "FACEBOOK_APP_ID")


def resolve_facebook_app_secret() -> str:
    return resolve_setting_value("facebook-app-secret", "FACEBOOK_APP_SECRET")


def fetch_json(url: str, timeout: int = 8) -> dict:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        data = response.read().decode("utf-8")
    return json.loads(data)


def resolve_user_and_tenant(email: str, full_name: str = "", avatar_url: str = ""):
    user = User.objects.filter(email=email).order_by("id").first()
    if not user:
        base_username = slugify(email.split("@")[0]) or "usuario"
        username = base_username
        seq = 2
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{seq}"
            seq += 1

        user = User.objects.create(
            username=username,
            email=email,
            full_name=full_name[:180],
            avatar_url=avatar_url[:500],
        )
        user.set_unusable_password()
        user.save()
    else:
        should_save = False
        if full_name and user.full_name != full_name[:180]:
            user.full_name = full_name[:180]
            should_save = True
        if avatar_url and user.avatar_url != avatar_url[:500]:
            user.avatar_url = avatar_url[:500]
            should_save = True
        if should_save:
            user.save(update_fields=["full_name", "avatar_url"])

    tenant = Tenant.objects.filter(memberships__user=user, memberships__is_active=True).order_by("id").first()

    return user, tenant


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        id_token = request.data.get("id_token")
        if not id_token:
            return Response({"detail": "id_token es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = self._verify_google_token(id_token)
        except Exception as exc:
            return Response({"detail": f"Token Google invalido: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

        email = (payload.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "El token de Google no contiene email."}, status=status.HTTP_400_BAD_REQUEST)

        email_verified = str(payload.get("email_verified", "")).lower() == "true"
        if not email_verified:
            return Response({"detail": "Google email no verificado."}, status=status.HTTP_400_BAD_REQUEST)

        google_name = (payload.get("name") or "").strip()
        google_picture = (payload.get("picture") or "").strip()
        user, tenant = resolve_user_and_tenant(email=email, full_name=google_name, avatar_url=google_picture)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "tenant_id": tenant.id if tenant else None,
                "user": UserSerializer(user).data,
            }
        )

    def _verify_google_token(self, id_token: str) -> dict:
        encoded = urllib.parse.urlencode({"id_token": id_token})
        url = f"https://oauth2.googleapis.com/tokeninfo?{encoded}"
        payload = fetch_json(url, timeout=8)

        expected_aud = resolve_google_client_id()
        if not expected_aud:
            raise ValueError("Google Sign-In no configurado.")
        if payload.get("aud") != expected_aud:
            raise ValueError("audience no coincide con GOOGLE_CLIENT_ID")

        return payload


class FacebookAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        access_token = request.data.get("access_token")
        if not access_token:
            return Response({"detail": "access_token es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = self._verify_and_fetch_facebook_profile(access_token)
        except Exception as exc:
            return Response({"detail": f"Token Facebook invalido: {exc}"}, status=status.HTTP_400_BAD_REQUEST)

        email = (payload.get("email") or "").strip().lower()
        if not email:
            return Response(
                {"detail": "Facebook no devolvio email. Revisa permisos y cuenta con email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fb_name = (payload.get("name") or "").strip()
        fb_picture = (((payload.get("picture") or {}).get("data") or {}).get("url") or "").strip()
        user, tenant = resolve_user_and_tenant(email=email, full_name=fb_name, avatar_url=fb_picture)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "tenant_id": tenant.id if tenant else None,
                "user": UserSerializer(user).data,
            }
        )

    def _verify_and_fetch_facebook_profile(self, user_access_token: str) -> dict:
        app_id = resolve_facebook_app_id()
        app_secret = resolve_facebook_app_secret()
        if not app_id or not app_secret:
            raise ValueError("Facebook Sign-In no configurado.")

        app_token = f"{app_id}|{app_secret}"
        debug_query = urllib.parse.urlencode({"input_token": user_access_token, "access_token": app_token})
        debug_payload = fetch_json(f"https://graph.facebook.com/debug_token?{debug_query}", timeout=8)
        token_data = debug_payload.get("data") or {}

        if not token_data.get("is_valid"):
            raise ValueError("token no valido")
        if str(token_data.get("app_id") or "") != str(app_id):
            raise ValueError("app_id no coincide")

        profile_query = urllib.parse.urlencode(
            {
                "fields": "id,name,email,picture.width(256).height(256)",
                "access_token": user_access_token,
            }
        )
        return fetch_json(f"https://graph.facebook.com/me?{profile_query}", timeout=8)


class GoogleAuthConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, _request):
        google_client_id = resolve_google_client_id()
        facebook_app_id = resolve_facebook_app_id()
        facebook_app_secret = resolve_facebook_app_secret()
        facebook_enabled = bool(facebook_app_id and facebook_app_secret)

        return Response(
            {
                "enabled": bool(google_client_id),
                "client_id": google_client_id,
                "facebook_enabled": facebook_enabled,
                "facebook_app_id": facebook_app_id if facebook_enabled else "",
            }
        )


class InternalProfessionalViewSet(viewsets.ModelViewSet):
    serializer_class = InternalProfessionalSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return (
            User.objects.filter(
                is_staff=False,
                tenant_memberships__is_active=True,
            )
            .annotate(tenant_count=Count("tenant_memberships__tenant", distinct=True))
            .distinct()
            .order_by("username")
        )

    def perform_destroy(self, instance):
        if instance.is_superuser or instance.is_staff:
            raise PermissionDenied("No se permite eliminar usuarios administrativos.")
        instance.delete()
