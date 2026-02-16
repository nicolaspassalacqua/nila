from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0003_tenantrating"),
    ]

    operations = [
        migrations.CreateModel(
            name="TenantSubscriptionPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(default="Plan mensual", max_length=120)),
                ("description", models.CharField(blank=True, default="", max_length=240)),
                ("price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("billing_cycle", models.CharField(choices=[("monthly", "Monthly"), ("yearly", "Yearly")], default="monthly", max_length=16)),
                ("is_active", models.BooleanField(default=True)),
                ("tenant", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="subscription_plans", to="core.tenant")),
            ],
            options={
                "ordering": ["price", "name"],
            },
        ),
        migrations.CreateModel(
            name="TenantSubscription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("active", "Active"), ("cancelled", "Cancelled")], default="active", max_length=16)),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("label", models.CharField(blank=True, default="", max_length=140)),
                ("starts_at", models.DateTimeField(auto_now_add=True)),
                ("ends_at", models.DateTimeField(blank=True, null=True)),
                ("plan", models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name="subscriptions", to="core.tenantsubscriptionplan")),
                ("tenant", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="subscriptions", to="core.tenant")),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="tenant_subscriptions", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-updated_at"],
                "unique_together": {("tenant", "user")},
            },
        ),
    ]
