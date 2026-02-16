from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Tenant, TenantMembership
from pos.models import Product, Order


class PosCalculationTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="cashier", password="pass12345")
        self.tenant = Tenant.objects.create(name="POS Tenant", slug="pos-tenant")
        TenantMembership.objects.create(tenant=self.tenant, user=self.user, role=TenantMembership.Role.OWNER)

        self.product = Product.objects.create(tenant=self.tenant, name="Sesion", type=Product.Type.SERVICE, price=Decimal("1000"))
        self.order = Order.objects.create(tenant=self.tenant)

    def test_order_item_amount_is_server_calculated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/order-items",
            {
                "order": self.order.id,
                "product": self.product.id,
                "qty": 2,
                "unit_price": "1500.00",
                "amount": "1.00",
            },
            format="json",
            HTTP_X_TENANT_ID=str(self.tenant.id),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data["amount"]), Decimal("3000.00"))
