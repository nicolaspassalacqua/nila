from django.contrib import admin
from core.models import (
    Company,
    PlatformSetting,
    Tenant,
    TenantMembership,
    TenantRating,
    TenantSubscription,
    TenantSubscriptionPlan,
)

admin.site.register(Company)
admin.site.register(Tenant)
admin.site.register(TenantMembership)
admin.site.register(PlatformSetting)
admin.site.register(TenantRating)
admin.site.register(TenantSubscriptionPlan)
admin.site.register(TenantSubscription)
