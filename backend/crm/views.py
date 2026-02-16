from rest_framework import permissions, viewsets
from core.tenant_access import get_tenant_for_request
from crm.models import Client
from crm.serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant = get_tenant_for_request(self.request)
        return Client.objects.filter(tenant=tenant).order_by("full_name")

    def perform_create(self, serializer):
        tenant = get_tenant_for_request(self.request)
        serializer.save(tenant=tenant)
