from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField("auth.User", on_delete=models.CASCADE, related_name="studio_profile")
    preferred_language = models.CharField(max_length=10, default="es")
    timezone = models.CharField(max_length=40, default="America/Argentina/Buenos_Aires")
    is_premium = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile<{self.user.username}>"


class PlatformSetting(models.Model):
    singleton_key = models.CharField(max_length=20, unique=True, default="default")
    allow_google_sso = models.BooleanField(default=False)
    allow_facebook_sso = models.BooleanField(default=False)
    google_client_id = models.CharField(max_length=255, blank=True)
    facebook_app_id = models.CharField(max_length=255, blank=True)
    facebook_app_secret = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "PlatformSetting<default>"


class PlatformSubscriptionPlan(models.Model):
    BILLING_PERIOD_MONTHLY = "monthly"
    BILLING_PERIOD_YEARLY = "yearly"
    BILLING_PERIOD_CUSTOM = "custom"
    BILLING_PERIOD_CHOICES = (
        (BILLING_PERIOD_MONTHLY, "Mensual"),
        (BILLING_PERIOD_YEARLY, "Anual"),
        (BILLING_PERIOD_CUSTOM, "Personalizado"),
    )

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
    marketing_tag = models.CharField(max_length=40, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="USD")
    billing_period = models.CharField(max_length=20, choices=BILLING_PERIOD_CHOICES, default=BILLING_PERIOD_MONTHLY)
    trial_days = models.PositiveIntegerField(default=30)
    cta_label = models.CharField(max_length=80, blank=True)
    features = models.JSONField(default=list, blank=True)
    included_modules = models.JSONField(default=list, blank=True)
    mercadolibre_enabled = models.BooleanField(default=False)
    electronic_billing_enabled = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=True)
    allow_self_signup = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "id")

    def __str__(self):
        return f"{self.code} - {self.name}"
