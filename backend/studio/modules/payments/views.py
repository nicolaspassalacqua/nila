from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from studio.models import Invoice, MembershipPlan, OrganizationMembership, Payment
from studio.modules.users.services import is_owner, is_platform_admin, is_student

from .serializers import InvoiceSerializer, MembershipPlanSerializer, PaymentSerializer
from .services import create_mercadopago_checkout, emit_arca_invoice, register_payment_status


def get_owned_org_ids(user):
    return list(
        OrganizationMembership.objects.filter(user=user, is_active=True).values_list("organization_id", flat=True)
    )


class MembershipPlanViewSet(viewsets.ModelViewSet):
    queryset = MembershipPlan.objects.select_related("organization").all().order_by("id")
    serializer_class = MembershipPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        organization_id = self.request.query_params.get("organization_id")
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)

        if is_platform_admin(user):
            return queryset
        if is_owner(user):
            return queryset.filter(organization_id__in=get_owned_org_ids(user))
        return queryset.filter(is_active=True, organization__is_active=True, organization__subscription_enabled=True)

    def create(self, request, *args, **kwargs):
        user = request.user
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Solo owner/admin puede crear planes"}, status=status.HTTP_403_FORBIDDEN)

        organization_id = request.data.get("organization")
        if not organization_id:
            return Response({"detail": "organization es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            organization_id = int(organization_id)
        except (TypeError, ValueError):
            return Response({"detail": "organization debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)

        if is_owner(user) and organization_id not in get_owned_org_ids(user):
            return Response({"detail": "No puedes crear planes fuera de tu organizacion"}, status=status.HTTP_403_FORBIDDEN)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = request.user
        plan = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and plan.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        plan = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and plan.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related(
        "organization", "student", "studio_class", "membership_plan", "created_by"
    ).all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        organization_id = self.request.query_params.get("organization_id")
        status_filter = self.request.query_params.get("status")
        payment_type = self.request.query_params.get("payment_type")

        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if payment_type:
            queryset = queryset.filter(payment_type=payment_type)

        if is_platform_admin(user):
            return queryset
        if is_owner(user):
            return queryset.filter(organization_id__in=get_owned_org_ids(user))

        email = (user.email or "").strip()
        user_scope = Q(created_by=user)
        if email:
            user_scope |= Q(payer_email__iexact=email)
        return queryset.filter(user_scope)

    def create(self, request, *args, **kwargs):
        user = request.user
        payload = request.data.copy()

        organization_id = payload.get("organization")
        if not organization_id:
            return Response({"detail": "organization es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            organization_id = int(organization_id)
        except (TypeError, ValueError):
            return Response({"detail": "organization debe ser numerico"}, status=status.HTTP_400_BAD_REQUEST)

        if is_owner(user) and organization_id not in get_owned_org_ids(user):
            return Response({"detail": "No puedes registrar pagos fuera de tu organizacion"}, status=status.HTTP_403_FORBIDDEN)

        if not (is_platform_admin(user) or is_owner(user)):
            payload["provider"] = Payment.PROVIDER_MP
            payload["status"] = Payment.STATUS_PENDING

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(created_by=user)

        if payment.provider == Payment.PROVIDER_MP:
            create_mercadopago_checkout(payment)
        elif payment.provider == Payment.PROVIDER_MANUAL and payment.status == Payment.STATUS_APPROVED:
            register_payment_status(payment, "approved", provider_payment_id=f"MANUAL-{payment.id}")
            if payment.organization.electronic_billing_enabled:
                try:
                    emit_arca_invoice(payment)
                except ValueError:
                    pass

        return Response(self.get_serializer(payment).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        user = request.user
        payment = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Solo owner/admin puede editar pagos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and payment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        payment = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Solo owner/admin puede eliminar pagos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and payment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="create-checkout")
    def create_checkout(self, request, pk=None):
        user = request.user
        payment = self.get_object()
        if not (is_platform_admin(user) or is_owner(user) or payment.created_by_id == user.id):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and payment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        if payment.provider != Payment.PROVIDER_MP:
            return Response({"detail": "El pago no usa MercadoPago"}, status=status.HTTP_400_BAD_REQUEST)

        create_mercadopago_checkout(payment)
        return Response(self.get_serializer(payment).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="mercadopago/webhook", permission_classes=[AllowAny])
    def mercadopago_webhook(self, request):
        external_reference = (request.data.get("external_reference") or "").strip()
        provider_status = (request.data.get("status") or "").strip()
        provider_payment_id = (request.data.get("payment_id") or "").strip()

        if not external_reference:
            return Response({"detail": "external_reference es requerido"}, status=status.HTTP_400_BAD_REQUEST)
        if not provider_status:
            return Response({"detail": "status es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(external_reference=external_reference)
        except Payment.DoesNotExist:
            return Response({"detail": "Pago no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        register_payment_status(payment, provider_status, provider_payment_id=provider_payment_id)
        if payment.status == Payment.STATUS_APPROVED and payment.organization.electronic_billing_enabled:
            try:
                emit_arca_invoice(payment)
            except ValueError:
                pass

        return Response({"detail": "ok"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        user = request.user
        payment = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Solo owner/admin puede marcar pagos"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and payment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)

        provider_payment_id = request.data.get("payment_id") or f"MANUAL-{payment.id}"
        register_payment_status(payment, "approved", provider_payment_id=provider_payment_id)
        if payment.organization.electronic_billing_enabled:
            try:
                emit_arca_invoice(payment)
            except ValueError:
                pass
        return Response(self.get_serializer(payment).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="emit-invoice")
    def emit_invoice(self, request, pk=None):
        user = request.user
        payment = self.get_object()
        if not (is_platform_admin(user) or is_owner(user)):
            return Response({"detail": "Solo owner/admin puede emitir comprobantes"}, status=status.HTTP_403_FORBIDDEN)
        if is_owner(user) and payment.organization_id not in get_owned_org_ids(user):
            return Response({"detail": "Sin permisos"}, status=status.HTTP_403_FORBIDDEN)
        try:
            invoice = emit_arca_invoice(payment)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_200_OK)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.select_related("organization", "payment", "payment__created_by").all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        organization_id = self.request.query_params.get("organization_id")
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)

        if is_platform_admin(user):
            return queryset
        if is_owner(user):
            return queryset.filter(organization_id__in=get_owned_org_ids(user))

        email = (user.email or "").strip()
        user_scope = Q(payment__created_by=user)
        if email:
            user_scope |= Q(payment__payer_email__iexact=email)
        if is_student(user):
            return queryset.filter(user_scope)
        return queryset.none()

