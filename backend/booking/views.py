from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import User
from booking.models import Appointment, BlockedSlot
from booking.serializers import AppointmentSerializer, BlockedSlotSerializer
from core.models import TenantMembership
from core.tenant_access import get_tenant_for_request
from crm.models import Client
from marketplace.models import Service
from notifications.models import MessageQueue
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

    @action(detail=False, methods=["post"], url_path="reserve-self")
    def reserve_self(self, request):
        tenant = get_tenant_for_request(request)
        service_id = request.data.get("service_id")
        start_iso = request.data.get("start_iso")
        requested_court_name = str(request.data.get("court_name") or "").strip()

        if not service_id or not start_iso:
            return Response({"detail": "service_id y start_iso son requeridos."}, status=400)

        service = Service.objects.filter(id=service_id, tenant=tenant, is_active=True).first()
        if not service:
            return Response({"detail": "Servicio invalido para la sucursal activa."}, status=400)

        try:
            start_dt = timezone.datetime.fromisoformat(str(start_iso))
            if timezone.is_naive(start_dt):
                start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
        except Exception:
            return Response({"detail": "start_iso invalido."}, status=400)

        duration = max(int(service.duration_min or 60), 15)
        end_dt = start_dt + timedelta(minutes=duration)

        config = service.service_config or {}
        min_advance_hours = int(config.get("min_advance_hours") or 1)
        if start_dt < timezone.now() + timedelta(hours=min_advance_hours):
            return Response(
                {"detail": f"Debes reservar con al menos {min_advance_hours} horas de anticipacion."},
                status=400,
            )

        overlap_qs = Appointment.objects.filter(
            tenant=tenant,
            status__in=[Appointment.Status.CONFIRMED],
            start_dt__lt=end_dt,
            end_dt__gt=start_dt,
        )
        if service.service_type == Service.ServiceType.ALQUILER_CANCHA:
            overlap_qs = overlap_qs.filter(service__service_type=Service.ServiceType.ALQUILER_CANCHA)
        else:
            overlap_qs = overlap_qs.filter(service=service)

        block_overlap_qs = BlockedSlot.objects.filter(
            tenant=tenant,
            start_dt__lt=end_dt,
            end_dt__gt=start_dt,
        )

        court_name = requested_court_name
        if service.service_type == Service.ServiceType.ALQUILER_CANCHA:
            included_courts = config.get("included_courts") if isinstance(config.get("included_courts"), list) else []
            included_names = [
                str(court.get("name", "")).strip()
                for court in included_courts
                if isinstance(court, dict) and str(court.get("name", "")).strip()
            ]
            if not included_names and tenant.court_config:
                included_names = [
                    str(court.get("name", "")).strip()
                    for court in tenant.court_config
                    if isinstance(court, dict) and str(court.get("name", "")).strip()
                ]

            busy_courts = {str(item.court_name or "").strip() for item in overlap_qs.only("court_name")}
            blocked_courts = {str(item.court_name or "").strip() for item in block_overlap_qs.only("court_name")}
            has_global_block = any(not name for name in blocked_courts)

            if court_name:
                if included_names and court_name not in included_names:
                    return Response({"detail": "La cancha seleccionada no pertenece a este servicio."}, status=400)
                if court_name in busy_courts:
                    return Response({"detail": "La cancha seleccionada ya esta reservada en ese horario."}, status=400)
                if has_global_block or court_name in blocked_courts:
                    return Response({"detail": "La cancha seleccionada esta bloqueada para ese horario."}, status=409)
            else:
                if has_global_block:
                    return Response({"detail": "Horario bloqueado por el profesional."}, status=409)
                if overlap_qs.exists() and not included_names:
                    return Response({"detail": "No hay canchas disponibles para ese horario."}, status=409)
                court_name = (
                    next((name for name in included_names if name not in busy_courts and name not in blocked_courts), "")
                    or (included_names[0] if included_names else "")
                )
                if included_names and not court_name:
                    return Response({"detail": "No hay canchas disponibles para ese horario."}, status=409)
        else:
            if overlap_qs.exists():
                return Response({"detail": "No hay disponibilidad para ese horario."}, status=409)
            if block_overlap_qs.exists():
                return Response({"detail": "Horario bloqueado por el profesional."}, status=409)

        user = request.user
        client = Client.objects.filter(tenant=tenant, email=user.email).first() if user.email else None
        if not client:
            client = Client.objects.filter(tenant=tenant, full_name=user.full_name or user.username).first()
        if not client:
            client = Client.objects.create(
                tenant=tenant,
                full_name=(user.full_name or user.username or "Cliente"),
                email=(user.email or ""),
            )

        appointment = Appointment.objects.create(
            tenant=tenant,
            service=service,
            client=client,
            court_name=court_name,
            start_dt=start_dt,
            end_dt=end_dt,
            status=Appointment.Status.REQUESTED,
            notes="Reserva creada desde marketplace cliente.",
        )
        self._queue_professional_pending_notification(tenant, appointment)

        return Response(AppointmentSerializer(appointment).data, status=201)

    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        tenant = get_tenant_for_request(request)
        appointment = self.get_queryset().get(pk=pk, tenant=tenant)
        if appointment.status == Appointment.Status.CANCELLED:
            return Response({"detail": "No puedes confirmar una reserva cancelada."}, status=400)

        confirm_overlap_qs = Appointment.objects.filter(
            tenant=tenant,
            status=Appointment.Status.CONFIRMED,
            start_dt__lt=appointment.end_dt,
            end_dt__gt=appointment.start_dt,
        ).exclude(id=appointment.id)
        if appointment.service.service_type == Service.ServiceType.ALQUILER_CANCHA:
            confirm_overlap_qs = confirm_overlap_qs.filter(service__service_type=Service.ServiceType.ALQUILER_CANCHA)
            if appointment.court_name:
                confirm_overlap_qs = confirm_overlap_qs.filter(court_name=appointment.court_name)
        else:
            confirm_overlap_qs = confirm_overlap_qs.filter(service=appointment.service)
        if confirm_overlap_qs.exists():
            return Response({"detail": "Ese horario ya fue confirmado para otra reserva."}, status=409)

        blocked_overlap_qs = BlockedSlot.objects.filter(
            tenant=tenant,
            start_dt__lt=appointment.end_dt,
            end_dt__gt=appointment.start_dt,
        )
        if appointment.service.service_type == Service.ServiceType.ALQUILER_CANCHA:
            blocked_overlap_qs = blocked_overlap_qs.filter(court_name__in=[appointment.court_name, ""])
        if blocked_overlap_qs.exists():
            return Response({"detail": "Ese horario esta bloqueado por el profesional."}, status=409)

        was_confirmed = appointment.status == Appointment.Status.CONFIRMED
        appointment.status = Appointment.Status.CONFIRMED
        appointment.save(update_fields=["status", "updated_at"])
        if not was_confirmed:
            self._queue_client_confirmed_notification(tenant, appointment)
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        tenant = get_tenant_for_request(request)
        appointment = self.get_queryset().get(pk=pk, tenant=tenant)
        previous_status = appointment.status
        appointment.status = Appointment.Status.CANCELLED
        appointment.save(update_fields=["status", "updated_at"])

        is_professional_actor = tenant.memberships.filter(user=request.user, is_active=True).exists()
        if is_professional_actor and previous_status in [Appointment.Status.REQUESTED, Appointment.Status.CONFIRMED]:
            self._queue_client_cancelled_notification(tenant, appointment)

        offer = self._create_waitlist_offer_from_cancel(tenant, appointment)
        payload = AppointmentSerializer(appointment).data
        payload["waitlist_offer_id"] = offer.id if offer else None
        return Response(payload)

    @action(detail=False, methods=["get"], url_path="blocked-slots")
    def blocked_slots(self, request):
        tenant = get_tenant_for_request(request)
        date_value = (request.query_params.get("date") or "").strip()
        qs = BlockedSlot.objects.filter(tenant=tenant)
        if date_value:
            qs = qs.filter(start_dt__date=date_value)
        return Response(BlockedSlotSerializer(qs.order_by("start_dt"), many=True).data)

    @action(detail=False, methods=["post"], url_path="block-slot")
    def block_slot(self, request):
        tenant = get_tenant_for_request(request)
        court_name = str(request.data.get("court_name") or "").strip()
        start_iso = request.data.get("start_iso")
        end_iso = request.data.get("end_iso")
        reason = str(request.data.get("reason") or "").strip()
        if not start_iso or not end_iso:
            return Response({"detail": "start_iso y end_iso son requeridos."}, status=400)
        try:
            start_dt = timezone.datetime.fromisoformat(str(start_iso))
            end_dt = timezone.datetime.fromisoformat(str(end_iso))
            if timezone.is_naive(start_dt):
                start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
            if timezone.is_naive(end_dt):
                end_dt = timezone.make_aware(end_dt, timezone.get_current_timezone())
        except Exception:
            return Response({"detail": "Fechas invalidas."}, status=400)
        if end_dt <= start_dt:
            return Response({"detail": "end_iso debe ser posterior a start_iso."}, status=400)

        blocked = BlockedSlot.objects.create(
            tenant=tenant,
            court_name=court_name,
            start_dt=start_dt,
            end_dt=end_dt,
            reason=reason,
            created_by=request.user,
        )
        return Response(BlockedSlotSerializer(blocked).data, status=201)

    @action(detail=False, methods=["post"], url_path="unblock-slot")
    def unblock_slot(self, request):
        tenant = get_tenant_for_request(request)
        blocked_id = request.data.get("blocked_slot_id")
        if not blocked_id:
            return Response({"detail": "blocked_slot_id es requerido."}, status=400)
        blocked = BlockedSlot.objects.filter(tenant=tenant, id=blocked_id).first()
        if not blocked:
            return Response({"detail": "Bloqueo no encontrado."}, status=404)
        blocked.delete()
        return Response({"ok": True})

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

    def _queue_professional_pending_notification(self, tenant, appointment):
        memberships = (
            tenant.memberships.filter(
                is_active=True,
                role__in=[
                    TenantMembership.Role.OWNER,
                    TenantMembership.Role.ADMIN,
                    TenantMembership.Role.STAFF,
                ],
                user__is_active=True,
            )
            .select_related("user")
            .distinct()
        )
        for membership in memberships:
            user = membership.user
            phone = str(user.phone or "").strip()
            email = str(user.email or "").strip()
            to_address = phone or email or f"user:{user.id}"
            channel = "whatsapp" if phone else ("email" if email else "push")
            MessageQueue.objects.create(
                tenant=tenant,
                channel=channel,
                to_address=to_address,
                payload={
                    "type": "reservation_requested_professional",
                    "appointment_id": appointment.id,
                    "tenant_name": tenant.name,
                    "service": appointment.service.name,
                    "client_name": appointment.client.full_name,
                    "court_name": appointment.court_name or "",
                    "start_dt": appointment.start_dt.isoformat(),
                    "status": appointment.status,
                    "message": "Nueva reserva en espera de confirmacion.",
                    "recipient_user_id": user.id,
                },
                status=MessageQueue.Status.QUEUED,
                scheduled_at=timezone.now(),
            )

    def _queue_client_confirmed_notification(self, tenant, appointment):
        phone = str(appointment.client.phone or "").strip()
        email = str(appointment.client.email or "").strip()
        client_user = self._resolve_user_for_client(tenant, appointment.client)
        to_address = phone or email or (f"user:{client_user.id}" if client_user else "")
        if not to_address:
            return
        channel = "whatsapp" if phone else ("email" if email else "push")
        MessageQueue.objects.create(
            tenant=tenant,
            channel=channel,
            to_address=to_address,
            payload={
                "type": "reservation_confirmed_client",
                "appointment_id": appointment.id,
                "tenant_name": tenant.name,
                "service": appointment.service.name,
                "court_name": appointment.court_name or "",
                "start_dt": appointment.start_dt.isoformat(),
                "status": appointment.status,
                "message": "Tu reserva fue confirmada.",
                "recipient_user_id": client_user.id if client_user else None,
            },
            status=MessageQueue.Status.QUEUED,
            scheduled_at=timezone.now(),
        )

    def _queue_client_cancelled_notification(self, tenant, appointment):
        phone = str(appointment.client.phone or "").strip()
        email = str(appointment.client.email or "").strip()
        client_user = self._resolve_user_for_client(tenant, appointment.client)
        to_address = phone or email or (f"user:{client_user.id}" if client_user else "")
        if not to_address:
            return
        channel = "whatsapp" if phone else ("email" if email else "push")
        MessageQueue.objects.create(
            tenant=tenant,
            channel=channel,
            to_address=to_address,
            payload={
                "type": "reservation_cancelled_client",
                "appointment_id": appointment.id,
                "tenant_name": tenant.name,
                "service": appointment.service.name,
                "court_name": appointment.court_name or "",
                "start_dt": appointment.start_dt.isoformat(),
                "status": Appointment.Status.CANCELLED,
                "message": "Tu reserva fue rechazada/cancelada por el establecimiento.",
                "recipient_user_id": client_user.id if client_user else None,
            },
            status=MessageQueue.Status.QUEUED,
            scheduled_at=timezone.now(),
        )

    def _resolve_user_for_client(self, tenant, client):
        if client.email:
            user = tenant.memberships.filter(user__email=client.email, is_active=True).select_related("user").first()
            if user:
                return user.user
            return User.objects.filter(email=client.email).order_by("id").first()
        return None
