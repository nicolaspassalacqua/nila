from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Tenant, TenantMembership


class TenantIsolationTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user_a = user_model.objects.create_user(username="user_a", password="pass12345")
        self.user_b = user_model.objects.create_user(username="user_b", password="pass12345")

        self.tenant_a = Tenant.objects.create(name="Tenant A", slug="tenant-a")
        self.tenant_b = Tenant.objects.create(name="Tenant B", slug="tenant-b")

        TenantMembership.objects.create(tenant=self.tenant_a, user=self.user_a, role=TenantMembership.Role.OWNER)
        TenantMembership.objects.create(tenant=self.tenant_b, user=self.user_b, role=TenantMembership.Role.OWNER)

    def test_tenants_list_only_user_tenants(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/tenants")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.tenant_a.id)

    def test_membership_list_only_visible_tenants(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/memberships")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["tenant"], self.tenant_a.id)
