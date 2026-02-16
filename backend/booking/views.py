from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from booking.models import Appointment
from booking.serializers import AppointmentSerializer
from core.tenant_access import get_tenant_for_request
from waitlist.models import Waitlist, WaitlistOffer


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return Appointment.objects.filter(tenant=tenant).select_related("service", "client")

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        tenant = get_tenant_for_request(request)
        appointment = self.get_queryset().get(pk=pk, tenant=tenant)
        appointment.status = Appointment.Status.CANCELLED
        appointment.save(update_fields=["status", "updated_at"])

        offer = self._create_waitlist_offer_from_cancel(tenant, appointment)
        payload = AppointmentSerializer(appointment).data
        payload["waitlist_offer_id"] = offer.id if offer else None
        return Response(payload)

    def _create_waitlist_offer_from_cancel(self, tenant, appointment):
        waitlist = Waitlist.objects.filter(
            tenant=tenant,
            service=appointment.service,
            desired_date=appointment.start_dt.date(),
            status=Waitlist.Status.ACTIVE,
        ).first()
        if not waitlist:
            return None

        entry = waitlist.entries.order_by("priority", "created_at").first()
        if not entry:
            return None

        open_offer = WaitlistOffer.objects.filter(
            tenant=tenant,
            appointment=appointment,
            entry=entry,
            status=WaitlistOffer.Status.OFFERED,
            expires_at__gt=timezone.now(),
        ).first()
        if open_offer:
            return open_offer

        return WaitlistOffer.objects.create(
            tenant=tenant,
            appointment=appointment,
            entry=entry,
            expires_at=timezone.now() + timedelta(minutes=30),
            status=WaitlistOffer.Status.OFFERED,
        )
