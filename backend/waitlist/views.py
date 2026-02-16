from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from booking.models import Appointment
from core.tenant_access import get_tenant_for_request
from waitlist.models import Waitlist, WaitlistEntry, WaitlistOffer
from waitlist.serializers import WaitlistSerializer, WaitlistEntrySerializer, WaitlistOfferSerializer


class WaitlistViewSet(viewsets.ModelViewSet):
    serializer_class = WaitlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return Waitlist.objects.filter(tenant=tenant).select_related("service")

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)


class WaitlistEntryViewSet(viewsets.ModelViewSet):
    serializer_class = WaitlistEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return WaitlistEntry.objects.filter(tenant=tenant).select_related("waitlist", "client")

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)


class WaitlistOfferViewSet(viewsets.ModelViewSet):
    serializer_class = WaitlistOfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return WaitlistOffer.objects.filter(tenant=tenant).select_related("appointment", "entry")

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)

    @action(detail=False, methods=["post"], url_path="offer-from-cancel")
    def offer_from_cancel(self, request):
        tenant = get_tenant_for_request(request)
        appointment_id = request.data.get("appointment_id")
        if not appointment_id:
            return Response({"detail": "appointment_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = Appointment.objects.select_related("service").get(pk=appointment_id, tenant=tenant)
        except Appointment.DoesNotExist:
            return Response({"detail": "appointment no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        waitlist = Waitlist.objects.filter(
            tenant=tenant,
            service=appointment.service,
            desired_date=appointment.start_dt.date(),
            status=Waitlist.Status.ACTIVE,
        ).first()

        if not waitlist:
            return Response({"detail": "sin waitlist activa para este servicio/fecha"}, status=status.HTTP_200_OK)

        entry = waitlist.entries.order_by("priority", "created_at").first()
        if not entry:
            return Response({"detail": "waitlist sin entradas"}, status=status.HTTP_200_OK)

        offer = WaitlistOffer.objects.create(
            tenant=tenant,
            appointment=appointment,
            entry=entry,
            expires_at=timezone.now() + timedelta(minutes=30),
            status=WaitlistOffer.Status.OFFERED,
        )

        return Response(WaitlistOfferSerializer(offer).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        tenant = get_tenant_for_request(request)
        offer = self.get_queryset().get(pk=pk, tenant=tenant)

        if offer.status != WaitlistOffer.Status.OFFERED:
            return Response({"detail": "La oferta no esta disponible para aceptar."}, status=status.HTTP_400_BAD_REQUEST)

        if offer.expires_at <= timezone.now():
            offer.status = WaitlistOffer.Status.EXPIRED
            offer.save(update_fields=["status", "updated_at"])
            return Response({"detail": "La oferta expiro."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            appointment = offer.appointment
            appointment.client = offer.entry.client
            appointment.status = Appointment.Status.CONFIRMED
            appointment.save(update_fields=["client", "status", "updated_at"])

            offer.status = WaitlistOffer.Status.ACCEPTED
            offer.save(update_fields=["status", "updated_at"])

            waitlist = offer.entry.waitlist
            waitlist.status = Waitlist.Status.CLOSED
            waitlist.save(update_fields=["status", "updated_at"])

            WaitlistOffer.objects.filter(
                tenant=tenant,
                appointment=appointment,
                status=WaitlistOffer.Status.OFFERED,
            ).exclude(pk=offer.pk).update(status=WaitlistOffer.Status.EXPIRED)

        return Response(WaitlistOfferSerializer(offer).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        tenant = get_tenant_for_request(request)
        offer = self.get_queryset().get(pk=pk, tenant=tenant)

        if offer.status != WaitlistOffer.Status.OFFERED:
            return Response({"detail": "La oferta no esta disponible para rechazar."}, status=status.HTTP_400_BAD_REQUEST)

        offer.status = WaitlistOffer.Status.REJECTED
        offer.save(update_fields=["status", "updated_at"])
        return Response(WaitlistOfferSerializer(offer).data)
