from rest_framework.exceptions import PermissionDenied

from core.models import Tenant, TenantMembership


def get_tenant_for_request(request):
    tenant_id = request.headers.get("X-Tenant-ID") or request.query_params.get("tenant_id")
    if not tenant_id:
        raise PermissionDenied("Falta tenant_id (header X-Tenant-ID).")

    try:
        tenant = Tenant.objects.get(pk=tenant_id, is_active=True)
    except Tenant.DoesNotExist as exc:
        raise PermissionDenied("Tenant invalido.") from exc

    if not request.user.is_authenticated:
        raise PermissionDenied("Usuario no autenticado.")

    is_member = TenantMembership.objects.filter(
        tenant=tenant,
        user=request.user,
        is_active=True,
    ).exists()

    if not is_member:
        raise PermissionDenied("No tenes acceso a este tenant.")

    return tenant


def get_user_membership(user, tenant):
    return TenantMembership.objects.filter(
        tenant=tenant,
        user=user,
        is_active=True,
    ).first()


def require_tenant_role(user, tenant, allowed_roles):
    membership = get_user_membership(user, tenant)
    if not membership or membership.role not in allowed_roles:
        raise PermissionDenied("No tenes permisos para esta accion en el tenant.")
    return membership
