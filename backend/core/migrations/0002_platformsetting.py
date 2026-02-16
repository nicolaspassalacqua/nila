from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformSetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("key", models.SlugField(max_length=120, unique=True)),
                (
                    "value_type",
                    models.CharField(
                        choices=[("string", "String"), ("number", "Number"), ("boolean", "Boolean"), ("json", "JSON")],
                        default="string",
                        max_length=16,
                    ),
                ),
                ("value", models.JSONField(blank=True, null=True)),
                ("description", models.CharField(blank=True, default="", max_length=240)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="updated_platform_settings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["key"]},
        ),
    ]
