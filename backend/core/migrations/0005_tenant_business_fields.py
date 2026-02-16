from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_subscription_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="company_name",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.AddField(
            model_name="tenant",
            name="address",
            field=models.CharField(blank=True, default="", max_length=220),
        ),
        migrations.AddField(
            model_name="tenant",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
    ]
