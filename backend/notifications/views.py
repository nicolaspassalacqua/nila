from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from booking.models import Appointment
from core.models import TenantMembership
from core.tenant_access import get_tenant_for_request
from notifications.models import MessageTemplate, MessageQueue
from notifications.serializers import MessageTemplateSerializer, MessageQueueSerializer


class MessageTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = MessageTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return MessageTemplate.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)


class MessageQueueViewSet(viewsets.ModelViewSet):
    serializer_class = MessageQueueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        qs = MessageQueue.objects.filter(tenant=tenant)

        is_professional = TenantMembership.objects.filter(
            tenant=tenant,
            user=self.request.user,
            is_active=True,
        ).exists()
        if is_professional:
            return qs

        addresses = [f"user:{self.request.user.id}"]
        if self.request.user.email:
            addresses.append(self.request.user.email.strip())
        if self.request.user.phone:
            addresses.append(self.request.user.phone.strip())

        return qs.filter(Q(to_address__in=addresses) | Q(payload__recipient_user_id=self.request.user.id))

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)

    @action(detail=False, methods=["post"], url_path="queue-appointment-reminder")
    def queue_appointment_reminder(self, request):
        tenant = get_tenant_for_request(request)
        appointment_id = request.data.get("appointment_id")
        if not appointment_id:
            return Response({"detail": "appointment_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = Appointment.objects.select_related("client", "service").get(pk=appointment_id, tenant=tenant)
        except Appointment.DoesNotExist:
            return Response({"detail": "appointment no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        to_address = appointment.client.phone or appointment.client.email
        if not to_address:
            return Response({"detail": "El cliente no tiene telefono/email."}, status=status.HTTP_400_BAD_REQUEST)

        queue_item = MessageQueue.objects.create(
            tenant=tenant,
            channel="whatsapp" if appointment.client.phone else "email",
            to_address=to_address,
            payload={
                "type": "appointment_reminder",
                "appointment_id": appointment.id,
                "service": appointment.service.name,
                "start_dt": appointment.start_dt.isoformat(),
                "client": appointment.client.full_name,
            },
            status=MessageQueue.Status.QUEUED,
            scheduled_at=timezone.now(),
        )

        return Response(MessageQueueSerializer(queue_item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="mark-sent")
    def mark_sent(self, request, pk=None):
        tenant = get_tenant_for_request(request)
        item = self.get_queryset().get(pk=pk, tenant=tenant)
        item.status = MessageQueue.Status.SENT
        item.sent_at = timezone.now()
        item.save(update_fields=["status", "sent_at", "updated_at"])
        return Response(MessageQueueSerializer(item).data)
