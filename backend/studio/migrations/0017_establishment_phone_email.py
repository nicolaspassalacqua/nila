from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("studio", "0016_organization_brand_color_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="establishment",
            name="email",
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name="establishment",
            name="phone",
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
