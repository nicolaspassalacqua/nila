from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0002_platformsetting"),
    ]

    operations = [
        migrations.CreateModel(
            name="TenantRating",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("score", models.PositiveSmallIntegerField(default=5)),
                ("comment", models.CharField(blank=True, default="", max_length=300)),
                ("tenant", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="ratings", to="core.tenant")),
                ("user", models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="tenant_ratings", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-updated_at"],
                "unique_together": {("tenant", "user")},
            },
        ),
    ]
