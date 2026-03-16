from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def add_instructor_module(apps, schema_editor):
    Organization = apps.get_model("studio", "Organization")
    PlatformSubscriptionPlan = apps.get_model("studio", "PlatformSubscriptionPlan")
    module_key = "instructores"

    for organization in Organization.objects.all():
        modules = list(organization.enabled_modules or [])
        if module_key not in modules:
            modules.append(module_key)
            organization.enabled_modules = modules
            organization.save(update_fields=["enabled_modules"])

    for plan in PlatformSubscriptionPlan.objects.all():
        modules = list(plan.included_modules or [])
        if module_key not in modules:
            modules.append(module_key)
            plan.included_modules = modules
            plan.save(update_fields=["included_modules"])


def remove_instructor_module(apps, schema_editor):
    Organization = apps.get_model("studio", "Organization")
    PlatformSubscriptionPlan = apps.get_model("studio", "PlatformSubscriptionPlan")
    module_key = "instructores"

    for organization in Organization.objects.all():
        modules = [module for module in (organization.enabled_modules or []) if module != module_key]
        organization.enabled_modules = modules
        organization.save(update_fields=["enabled_modules"])

    for plan in PlatformSubscriptionPlan.objects.all():
        modules = [module for module in (plan.included_modules or []) if module != module_key]
        plan.included_modules = modules
        plan.save(update_fields=["included_modules"])


class Migration(migrations.Migration):

    dependencies = [
        ("studio", "0021_alter_payment_payment_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="InstructorProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "compensation_scheme",
                    models.CharField(
                        choices=[
                            ("hourly", "Pago por hora"),
                            ("monthly", "Sueldo mensual"),
                            ("per_class", "Pago por clase"),
                            ("mixed", "Esquema mixto"),
                        ],
                        default="hourly",
                        max_length=20,
                    ),
                ),
                ("hourly_rate", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("monthly_salary", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("class_rate", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("currency", models.CharField(default="ARS", max_length=8)),
                ("started_at", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="instructor_profiles",
                        to="studio.organization",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="instructor_profiles",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("organization_id", "user_id"),
                "unique_together": {("organization", "user")},
            },
        ),
        migrations.RunPython(add_instructor_module, remove_instructor_module),
    ]
