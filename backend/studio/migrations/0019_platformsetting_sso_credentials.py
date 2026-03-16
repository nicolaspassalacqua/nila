from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("studio", "0018_organization_subscription_status_and_trial"),
    ]

    operations = [
        migrations.AddField(
            model_name="platformsetting",
            name="facebook_app_id",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="platformsetting",
            name="facebook_app_secret",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="platformsetting",
            name="google_client_id",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
