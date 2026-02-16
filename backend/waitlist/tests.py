from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from booking.models import Appointment
from core.models import Tenant, TenantMembership
from crm.models import Client
from marketplace.models import Service
from waitlist.models import Waitlist, WaitlistEntry, WaitlistOffer


class WaitlistOfferFlowTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="pro_wait", password="pass12345")

        self.tenant = Tenant.objects.create(name="Wait Tenant", slug="wait-tenant")
        TenantMembership.objects.create(tenant=self.tenant, user=self.user, role=TenantMembership.Role.OWNER)

        self.service = Service.objects.create(tenant=self.tenant, name="Pilates", discipline="Pilates", price=1000)
        self.client_a = Client.objects.create(tenant=self.tenant, full_name="Cliente A")
        self.client_b = Client.objects.create(tenant=self.tenant, full_name="Cliente B")

        self.appointment = Appointment.objects.create(
            tenant=self.tenant,
            service=self.service,
            client=self.client_a,
            start_dt=timezone.now() + timedelta(days=1),
            end_dt=timezone.now() + timedelta(days=1, hours=1),
            status=Appointment.Status.CANCELLED,
        )

        waitlist = Waitlist.objects.create(
            tenant=self.tenant,
            service=self.service,
            desired_date=self.appointment.start_dt.date(),
            status=Waitlist.Status.ACTIVE,
        )
        entry = WaitlistEntry.objects.create(tenant=self.tenant, waitlist=waitlist, client=self.client_b, priority=1)
        self.offer = WaitlistOffer.objects.create(
            tenant=self.tenant,
            appointment=self.appointment,
            entry=entry,
            expires_at=timezone.now() + timedelta(minutes=30),
            status=WaitlistOffer.Status.OFFERED,
        )

    def test_accept_offer_assigns_client(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f"/api/waitlist-offers/{self.offer.id}/accept",
            {},
            format="json",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.offer.refresh_from_db()
        self.appointment.refresh_from_db()
        self.assertEqual(self.offer.status, WaitlistOffer.Status.ACCEPTED)
        self.assertEqual(self.appointment.client_id, self.client_b.id)
        self.assertEqual(self.appointment.status, Appointment.Status.CONFIRMED)
