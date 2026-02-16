from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0005_tenant_business_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="Company",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("trade_name", models.CharField(max_length=180)),
                ("legal_name", models.CharField(blank=True, default="", max_length=220)),
                ("tax_condition", models.CharField(choices=[("monotributo", "Monotributista"), ("responsable_inscripto", "Responsable Inscripto"), ("exento", "Exento"), ("consumidor_final", "Consumidor Final")], default="monotributo", max_length=40)),
                ("cuit", models.CharField(blank=True, default="", max_length=20)),
                ("billing_address", models.CharField(blank=True, default="", max_length=240)),
                ("email", models.EmailField(blank=True, default="", max_length=254)),
                ("phone", models.CharField(blank=True, default="", max_length=30)),
                ("description", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True)),
                ("owner", models.OneToOneField(on_delete=models.deletion.CASCADE, related_name="company_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["trade_name"],
            },
        ),
        migrations.AddField(
            model_name="tenant",
            name="company",
            field=models.ForeignKey(blank=True, null=True, on_delete=models.deletion.CASCADE, related_name="establishments", to="core.company"),
        ),
        migrations.RemoveField(
            model_name="tenant",
            name="company_name",
        ),
    ]
