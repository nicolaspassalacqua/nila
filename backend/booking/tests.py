from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Tenant, TenantMembership
from crm.models import Client
from marketplace.models import Service


class AppointmentValidationTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="pro", password="pass12345")

        self.tenant_a = Tenant.objects.create(name="Tenant A", slug="tenant-a-book")
        self.tenant_b = Tenant.objects.create(name="Tenant B", slug="tenant-b-book")

        TenantMembership.objects.create(tenant=self.tenant_a, user=self.user, role=TenantMembership.Role.OWNER)

        self.service_a = Service.objects.create(tenant=self.tenant_a, name="Pilates", discipline="Pilates", price=1000)
        self.client_b = Client.objects.create(tenant=self.tenant_b, full_name="Cliente B")

    def test_cannot_create_appointment_with_cross_tenant_client(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/appointments",
            {
                "service": self.service_a.id,
                "client": self.client_b.id,
                "start_dt": timezone.now().isoformat(),
                "end_dt": (timezone.now() + timedelta(hours=1)).isoformat(),
                "status": "confirmed",
            },
            format="json",
            HTTP_X_TENANT_ID=str(self.tenant_a.id),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("client", response.data)
