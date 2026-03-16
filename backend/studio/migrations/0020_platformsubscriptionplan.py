from django.db import migrations, models


DEFAULT_PLANS = [
    {
        "code": "starter",
        "name": "Plan Base",
        "marketing_tag": "STARTER",
        "description": "1 empresa y hasta 2 sedes para arrancar la operacion.",
        "price": "29.00",
        "currency": "USD",
        "billing_period": "monthly",
        "trial_days": 30,
        "cta_label": "Comenzar",
        "features": [
            "1 empresa y hasta 2 sedes",
            "Gestion de alumnos y clases",
            "Portal de alumnos",
        ],
        "included_modules": ["configuracion", "alumnos", "clases", "contactos"],
        "mercadolibre_enabled": False,
        "electronic_billing_enabled": False,
        "is_active": True,
        "is_public": True,
        "allow_self_signup": True,
        "sort_order": 10,
    },
    {
        "code": "growth",
        "name": "Plan Profesional",
        "marketing_tag": "GROWTH",
        "description": "Operacion profesional con multi-sede, POS y reportes.",
        "price": "79.00",
        "currency": "USD",
        "billing_period": "monthly",
        "trial_days": 30,
        "cta_label": "Comenzar",
        "features": [
            "Multi-sede y salones ilimitados",
            "POS, pagos y membresias",
            "Marketplace y reportes",
        ],
        "included_modules": ["configuracion", "pos", "alumnos", "clases", "tutoriales", "tableros", "contactos", "redes_sociales"],
        "mercadolibre_enabled": True,
        "electronic_billing_enabled": True,
        "is_active": True,
        "is_public": True,
        "allow_self_signup": True,
        "sort_order": 20,
    },
    {
        "code": "premium",
        "name": "Plan Premium",
        "marketing_tag": "PREMIUM",
        "description": "Operacion avanzada con todas las aplicaciones habilitadas.",
        "price": "129.00",
        "currency": "USD",
        "billing_period": "monthly",
        "trial_days": 30,
        "cta_label": "Solicitar demo",
        "features": [
            "Todas las aplicaciones habilitadas",
            "Automatizaciones y tableros avanzados",
            "Soporte prioritario",
        ],
        "included_modules": ["configuracion", "pos", "alumnos", "clases", "tutoriales", "tableros", "contactos", "redes_sociales"],
        "mercadolibre_enabled": True,
        "electronic_billing_enabled": True,
        "is_active": True,
        "is_public": False,
        "allow_self_signup": False,
        "sort_order": 30,
    },
    {
        "code": "enterprise",
        "name": "Plan Corporativo",
        "marketing_tag": "ENTERPRISE",
        "description": "Implementacion a medida con configuracion personalizada.",
        "price": "0.00",
        "currency": "USD",
        "billing_period": "custom",
        "trial_days": 0,
        "cta_label": "Hablar con ventas",
        "features": [
            "Configuracion personalizada",
            "Integraciones avanzadas",
            "Soporte prioritario",
        ],
        "included_modules": ["configuracion", "pos", "alumnos", "clases", "tutoriales", "tableros", "contactos", "redes_sociales"],
        "mercadolibre_enabled": True,
        "electronic_billing_enabled": True,
        "is_active": True,
        "is_public": True,
        "allow_self_signup": False,
        "sort_order": 40,
    },
]


def seed_platform_subscription_plans(apps, schema_editor):
    PlatformSubscriptionPlan = apps.get_model("studio", "PlatformSubscriptionPlan")
    for payload in DEFAULT_PLANS:
        PlatformSubscriptionPlan.objects.update_or_create(
            code=payload["code"],
            defaults=payload,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("studio", "0019_platformsetting_sso_credentials"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformSubscriptionPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=40, unique=True)),
                ("name", models.CharField(max_length=120)),
                ("marketing_tag", models.CharField(blank=True, max_length=40)),
                ("description", models.TextField(blank=True)),
                ("price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("currency", models.CharField(default="USD", max_length=8)),
                ("billing_period", models.CharField(choices=[("monthly", "Mensual"), ("yearly", "Anual"), ("custom", "Personalizado")], default="monthly", max_length=20)),
                ("trial_days", models.PositiveIntegerField(default=30)),
                ("cta_label", models.CharField(blank=True, max_length=80)),
                ("features", models.JSONField(blank=True, default=list)),
                ("included_modules", models.JSONField(blank=True, default=list)),
                ("mercadolibre_enabled", models.BooleanField(default=False)),
                ("electronic_billing_enabled", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("is_public", models.BooleanField(default=True)),
                ("allow_self_signup", models.BooleanField(default=False)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("sort_order", "id")},
        ),
        migrations.RunPython(seed_platform_subscription_plans, migrations.RunPython.noop),
    ]
