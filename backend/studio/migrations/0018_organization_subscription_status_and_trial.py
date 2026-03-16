from django.db import migrations, models


def populate_subscription_status(apps, schema_editor):
    Organization = apps.get_model("studio", "Organization")
    Organization.objects.filter(subscription_enabled=True).update(subscription_status="active")
    Organization.objects.filter(subscription_enabled=False).update(subscription_status="inactive")


class Migration(migrations.Migration):

    dependencies = [
        ("studio", "0017_establishment_phone_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="organization",
            name="subscription_status",
            field=models.CharField(
                choices=[
                    ("inactive", "Inactiva"),
                    ("trialing", "Prueba"),
                    ("active", "Activa"),
                    ("past_due", "Pago pendiente"),
                    ("canceled", "Cancelada"),
                ],
                default="inactive",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="organization",
            name="trial_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="organization",
            name="trial_starts_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(populate_subscription_status, migrations.RunPython.noop),
    ]
